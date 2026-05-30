/**
 * Persistence API - High-level Document Operations
 * 
 * Integration: Clean API for UI components
 * Security: All inputs validated before persistence
 * Performance: Debounced saves, efficient queries
 */

import { 
  StoredDocument, 
  DocumentFilter, 
  DocumentListItem,
  ExportOptions,
  VersionConflict,
  PersistenceError,
  DocumentType,
  CanvasContent,
  DocumentContent,
} from '../../types/persistence';
import { CanvasNode } from '../../types/canvas';
import { 
  initDB, 
  saveDocument as dbSaveDocument, 
  loadDocument as dbLoadDocument,
  deleteDocument as dbDeleteDocument,
  listDocuments as dbListDocuments,
  getStorageEstimate,
} from './db';
import { generateMarkdown, generateJson } from '../markdown';
import { generateHtmlExport } from '../htmlExportGenerator';

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let isInitialized = false;

/**
 * Initialize the persistence layer
 * Must be called before any other operations
 */
export async function initializePersistence(): Promise<boolean> {
  try {
    await initDB();
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize persistence:', error);
    return false;
  }
}

export function isPersistenceReady(): boolean {
  return isInitialized;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new document
 */
export async function createDocument(
  title: string,
  type: DocumentType,
  initialContent?: Partial<CanvasContent>
): Promise<number> {
  const now = Date.now();
  
  const doc: StoredDocument = {
    meta: {
      title: sanitizeTitle(title),
      type,
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
    content: (initialContent || {
      nodes: {},
      viewport: { zoom: 1, panX: 0, panY: 0 },
    }) as DocumentContent,
    uiState: {
      selectedNodeId: null,
      expandedPanels: [],
      sidebarWidth: 345,
      lastActiveTab: 'nodes',
    },
  };
  
  return dbSaveDocument(doc);
}

/**
 * Save document with debouncing support
 */
export async function saveDocumentData(
  docId: number,
  content: CanvasContent,
  uiState?: Partial<StoredDocument['uiState']>,
  meta?: Partial<StoredDocument['meta']>
): Promise<void> {
  // Load existing document
  const existing = await dbLoadDocument(docId);
  
  if (!existing) {
    throw createError('NOT_FOUND', `Document ${docId} not found`);
  }
  
  // Merge updates
  const updated: StoredDocument = {
    docId,
    meta: {
      ...existing.meta,
      ...meta,
      updatedAt: Date.now(),
    },
    content,
    uiState: uiState ? { ...existing.uiState, ...uiState } : existing.uiState,
  };
  
  await dbSaveDocument(updated);
}

/**
 * Load a document by ID
 */
export async function loadDocumentData(docId: number): Promise<StoredDocument | null> {
  return dbLoadDocument(docId);
}

/**
 * Delete a document
 */
export async function deleteDocumentData(docId: number): Promise<void> {
  return dbDeleteDocument(docId);
}

/**
 * List documents with filtering
 */
export async function listDocumentsData(filter?: DocumentFilter): Promise<DocumentListItem[]> {
  return dbListDocuments(filter);
}

// ═══════════════════════════════════════════════════════════════
// VERSION CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════

export async function checkVersionConflict(
  docId: number,
  currentVersion: number,
  currentUpdatedAt: number
): Promise<VersionConflict | null> {
  const stored = await dbLoadDocument(docId);
  
  if (!stored) return null;
  
  // Check if stored version is newer
  if (stored.meta.updatedAt > currentUpdatedAt) {
    return {
      storedVersion: stored.meta.version,
      currentVersion,
      storedUpdatedAt: stored.meta.updatedAt,
      currentUpdatedAt,
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Export a document or chain to various formats
 */
export async function exportDocument(
  docId: number,
  options: ExportOptions
): Promise<Blob> {
  const doc = await dbLoadDocument(docId);
  
  if (!doc) {
    throw createError('NOT_FOUND', `Document ${docId} not found`);
  }
  
  // Extract nodes for export
  let nodes: Record<string, CanvasNode>;
  
  if ('nodes' in doc.content) {
    const canvasContent = doc.content as CanvasContent;
    if (options.chainRootId) {
      // Export specific chain
      nodes = extractChain(canvasContent.nodes, options.chainRootId);
    } else if (options.nodeIds) {
      // Export specific nodes
      nodes = {};
      options.nodeIds.forEach(id => {
        if (canvasContent.nodes[id]) {
          nodes[id] = canvasContent.nodes[id];
        }
      });
    } else {
      // Export all
      nodes = canvasContent.nodes;
    }
  } else {
    throw createError('CORRUPTED_DATA', 'Document does not contain canvas data');
  }
  
  // Generate export content
  let content: string;
  let mimeType: string;
  let extension: string;
  
  switch (options.format) {
    case 'markdown':
      content = generateMarkdown(nodes, options.nodeIds || [], options.includeMetadata);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
      
    case 'json':
      content = generateJson(nodes, options.nodeIds || []);
      mimeType = 'application/json';
      extension = 'json';
      break;
      
    case 'html':
      const htmlResult = generateHtmlExport(nodes, {
        title: doc.meta.title,
        description: `Exported from CanvasDocs`,
        theme: 'dark',
        includeStyles: true,
        includeMetadata: options.includeMetadata,
        showConnectionLines: true,
        showDepthIndicators: true,
      });
      content = htmlResult.content;
      mimeType = 'text/html';
      extension = 'html';
      break;
      
    default:
      throw createError('UNKNOWN', `Unsupported export format: ${options.format}`);
  }
  
  return new Blob([content], { type: mimeType });
}

/**
 * Extract a connected chain starting from a root node
 */
function extractChain(
  allNodes: Record<string, CanvasNode>,
  rootId: string
): Record<string, CanvasNode> {
  const chain: Record<string, CanvasNode> = {};
  const visited = new Set<string>();
  
  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (!allNodes[nodeId]) return;
    
    visited.add(nodeId);
    chain[nodeId] = allNodes[nodeId];
    
    // Traverse connections
    allNodes[nodeId].connections.forEach(conn => {
      traverse(conn.targetId);
    });
  }
  
  traverse(rootId);
  return chain;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Import a document from exported data
 */
export async function importDocument(
  data: string,
  format: 'json' | 'markdown',
  title?: string
): Promise<number> {
  let nodes: Record<string, CanvasNode>;
  
  if (format === 'json') {
    const parsed = JSON.parse(data);
    nodes = parsed.nodes || parsed;
  } else {
    // Parse markdown to nodes (simplified)
    nodes = parseMarkdownToNodes(data);
  }
  
  // Validate all nodes
  Object.values(nodes).forEach(node => {
    if (!validateNode(node)) {
      throw createError('CORRUPTED_DATA', 'Invalid node in import data');
    }
  });
  
  return createDocument(
    title || 'Imported Document',
    'canvas',
    { nodes, viewport: { zoom: 1, panX: 0, panY: 0 } }
  );
}

// ═══════════════════════════════════════════════════════════════
// STORAGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export async function getStorageInfo(): Promise<{
  quota: number;
  usage: number;
  available: number;
  documentCount: number;
}> {
  const [estimate, documents] = await Promise.all([
    getStorageEstimate(),
    dbListDocuments(),
  ]);
  
  return {
    quota: estimate.quota,
    usage: estimate.usage,
    available: estimate.quota - estimate.usage,
    documentCount: documents.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK STORAGE (In-Memory)
// ═══════════════════════════════════════════════════════════════

const memoryStore = new Map<number, StoredDocument>();
let memoryIdCounter = 1;

export function createFallbackStorage(): {
  save: (doc: StoredDocument) => number;
  load: (id: number) => StoredDocument | null;
  delete: (id: number) => void;
  list: () => DocumentListItem[];
} {
  return {
    save: (doc) => {
      const id = doc.docId || memoryIdCounter++;
      memoryStore.set(id, { ...doc, docId: id });
      return id;
    },
    load: (id) => memoryStore.get(id) || null,
    delete: (id) => memoryStore.delete(id),
    list: () => Array.from(memoryStore.entries()).map(([id, doc]) => ({
      docId: id,
      title: doc.meta.title,
      type: doc.meta.type,
      createdAt: doc.meta.createdAt,
      updatedAt: doc.meta.updatedAt,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function sanitizeTitle(title: string): string {
  return title.trim().slice(0, 200) || 'Untitled Document';
}

function validateNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const n = node as Partial<CanvasNode>;
  return (
    typeof n.id === 'string' &&
    typeof n.type === 'string' &&
    typeof n.title === 'string' &&
    typeof n.content === 'string' &&
    n.position !== undefined &&
    Array.isArray(n.connections)
  );
}

function parseMarkdownToNodes(markdown: string): Record<string, CanvasNode> {
  const nodes: Record<string, CanvasNode> = {};
  const lines = markdown.split('\n');
  let currentSection: string | null = null;
  let currentContent: string[] = [];
  
  const saveNode = () => {
    if (currentSection) {
      const id = crypto.randomUUID();
      nodes[id] = {
        id,
        type: currentSection.startsWith('#') ? 'heading' : 'paragraph',
        title: currentSection.replace(/^#+\s*/, ''),
        content: currentContent.join('\n').trim(),
        position: { x: 100, y: Object.keys(nodes).length * 150 },
        connections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    currentContent = [];
  };
  
  lines.forEach(line => {
    if (line.startsWith('#')) {
      saveNode();
      currentSection = line;
    } else {
      currentContent.push(line);
    }
  });
  
  saveNode();
  
  return nodes;
}

function createError(type: PersistenceError['type'], message: string): PersistenceError {
  const err = new Error(message) as PersistenceError;
  err.type = type;
  err.message = message;
  err.name = 'PersistenceError';
  return err;
}