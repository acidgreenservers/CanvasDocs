/**
 * Persistence Types - IndexedDB Schema Definitions
 * 
 * Security: All types are validated at boundaries
 * Versioning: Schema version embedded for migration support
 */

// ═══════════════════════════════════════════════════════════════
// SCHEMA VERSION
// ═══════════════════════════════════════════════════════════════

export const SCHEMA_VERSION = 1;

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TYPES
// ═══════════════════════════════════════════════════════════════

export type DocumentType = 'canvas' | 'markdown' | 'readme' | 'prompt' | 'roadmap';

export interface DocumentMeta {
  title: string;
  type: DocumentType;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface CanvasContent {
  nodes: Record<string, import('./canvas').CanvasNode>;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
}

export interface MarkdownContent {
  raw: string;
  sections: string[];
}

export type DocumentContent = CanvasContent | MarkdownContent;

export interface UIState {
  selectedNodeId: string | null;
  expandedPanels: string[];
  sidebarWidth: number;
  lastActiveTab: string;
}

export interface StoredDocument {
  docId?: number; // Auto-incremented primary key
  meta: DocumentMeta;
  content: DocumentContent;
  uiState: UIState;
}

export interface DocumentListItem {
  docId: number;
  title: string;
  type: DocumentType;
  createdAt: number;
  updatedAt: number;
  nodeCount?: number;
}

// ═══════════════════════════════════════════════════════════════
// FILTER TYPES
// ═══════════════════════════════════════════════════════════════

export interface DocumentFilter {
  type?: DocumentType;
  searchTerm?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT OPTIONS
// ═══════════════════════════════════════════════════════════════

export interface ExportOptions {
  format: 'markdown' | 'json' | 'html';
  includeMetadata: boolean;
  chainRootId?: string;
  nodeIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════

export type PersistenceErrorType = 
  | 'QUOTA_EXCEEDED'
  | 'NOT_FOUND'
  | 'CORRUPTED_DATA'
  | 'VERSION_MISMATCH'
  | 'TRANSACTION_FAILED'
  | 'UNSUPPORTED_BROWSER'
  | 'UNKNOWN';

export interface PersistenceError {
  type: PersistenceErrorType;
  message: string;
  originalError?: Error;
  docId?: number;
}

// ═══════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION
// ═══════════════════════════════════════════════════════════════

export interface VersionConflict {
  storedVersion: number;
  currentVersion: number;
  storedUpdatedAt: number;
  currentUpdatedAt: number;
}

export type ConflictResolution = 'refresh' | 'keep_editing' | 'merge';

// ═══════════════════════════════════════════════════════════════
// CAPABILITY DETECTION
// ═══════════════════════════════════════════════════════════════

export interface StorageCapabilities {
  hasIndexedDB: boolean;
  estimatedQuota?: number;
  usedQuota?: number;
}