/**
 * Snapshot Security Utilities
 * 
 * ATTRACTOR: "Structure evolves"
 * GROUNDING: Snapshots must be tamper-proof to maintain trust
 * Security: Cryptographic hashes and signatures protect integrity
 */

import { CanvasNode } from '../types/canvas';
import { 
  CanvasSnapshot, 
  SnapshotContent, 
  SnapshotMetadata,
  SnapshotStatus 
} from '../types/snapshots';
import { generateSecureId } from './security';

// ═══════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC INTEGRITY
// ═══════════════════════════════════════════════════════════════

/**
 * Generate SHA-256 hash of content
 * Security: Uses SubtleCrypto API for cryptographic strength
 */
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for environments without SubtleCrypto
    return simpleHash(content);
  }
}

/**
 * Simple hash fallback
 * Security: Less secure but works everywhere
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Combine with secondary hash
  let hash2 = 5381;
  for (let i = 0; i < content.length; i++) {
    hash2 = ((hash2 << 5) + hash2) + content.charCodeAt(i);
  }
  
  return Math.abs(hash).toString(16) + Math.abs(hash2).toString(16);
}

/**
 * Generate content hash for snapshot
 * Security: Creates deterministic hash of all content
 */
export async function generateContentHash(content: SnapshotContent): Promise<string> {
  // Canonicalize content for consistent hashing
  const canonical = canonicalizeContent(content);
  return generateHash(canonical);
}

/**
 * Canonicalize content for deterministic hashing
 * Security: Ensures same content always produces same hash
 */
function canonicalizeContent(content: SnapshotContent): string {
  // Sort nodes by ID for consistent ordering
  const sortedNodes = Object.entries(content.nodes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, node]) => ({
      id,
      type: node.type,
      title: node.title,
      content: node.content,
      position: { x: node.position.x, y: node.position.y },
      connections: [...node.connections].sort((a, b) => 
        a.targetId.localeCompare(b.targetId) || a.type.localeCompare(b.type)
      ),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }));
  
  return JSON.stringify({
    version: content.version,
    nodes: sortedNodes,
    canvasBounds: content.canvasBounds,
  });
}

/**
 * Generate signature for snapshot
 * Security: Combines hash with timestamp and metadata
 */
export async function generateSnapshotSignature(
  metadata: Omit<SnapshotMetadata, 'signature' | 'contentHash'>,
  contentHash: string
): Promise<string> {
  const signaturePayload = [
    metadata.id,
    metadata.createdAt.toString(),
    contentHash,
    metadata.name,
  ].join(':');
  
  return generateHash(signaturePayload);
}

/**
 * Verify snapshot integrity
 * Security: Detects any tampering with snapshot content
 */
export async function verifySnapshotIntegrity(
  snapshot: CanvasSnapshot
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Verify content hash
  const computedHash = await generateContentHash(snapshot.content);
  if (computedHash !== snapshot.metadata.contentHash) {
    errors.push('Content hash mismatch - snapshot may have been tampered with');
  }
  
  // Verify signature
  const computedSignature = await generateSnapshotSignature(
    snapshot.metadata,
    snapshot.metadata.contentHash
  );
  if (computedSignature !== snapshot.metadata.signature) {
    errors.push('Signature mismatch - metadata may have been altered');
  }
  
  // Verify node count
  const actualNodeCount = Object.keys(snapshot.content.nodes).length;
  if (actualNodeCount !== snapshot.metadata.nodeCount) {
    errors.push(`Node count mismatch: expected ${snapshot.metadata.nodeCount}, found ${actualNodeCount}`);
  }
  
  // Verify connection count
  const actualConnectionCount = Object.values(snapshot.content.nodes)
    .reduce((acc, node) => acc + node.connections.length, 0);
  if (actualConnectionCount !== snapshot.metadata.connectionCount) {
    errors.push(`Connection count mismatch: expected ${snapshot.metadata.connectionCount}, found ${actualConnectionCount}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════
// SNAPSHOT CREATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new snapshot
 * Security: Generates immutable, signed snapshot
 */
export async function createSnapshot(
  nodes: Record<string, CanvasNode>,
  name: string,
  options?: {
    description?: string;
    tags?: string[];
    createdBy?: string;
  }
): Promise<CanvasSnapshot> {
  const id = generateSecureId();
  const now = Date.now();
  
  // Create content
  const content: SnapshotContent = {
    version: '1.0',
    nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone for immutability
  };
  
  // Generate content hash
  const contentHash = await generateContentHash(content);
  
  // Create metadata
  const metadata: SnapshotMetadata = {
    id,
    name: name.trim() || `Snapshot ${new Date(now).toLocaleDateString()}`,
    description: options?.description,
    createdAt: now,
    createdBy: options?.createdBy,
    tags: options?.tags || [],
    contentHash,
    signature: '', // Will be set below
    nodeCount: Object.keys(nodes).length,
    connectionCount: Object.values(nodes).reduce((acc, n) => acc + n.connections.length, 0),
    status: 'active',
  };
  
  // Generate signature
  metadata.signature = await generateSnapshotSignature(metadata, contentHash);
  
  return { metadata, content };
}

/**
 * Deep freeze snapshot to prevent mutation
 * Security: Ensures snapshot immutability at runtime
 */
export function freezeSnapshot(snapshot: CanvasSnapshot): CanvasSnapshot {
  // Deep freeze content
  Object.values(snapshot.content.nodes).forEach(node => {
    Object.freeze(node.position);
    Object.freeze(node.connections);
    Object.freeze(node);
  });
  Object.freeze(snapshot.content.nodes);
  Object.freeze(snapshot.content);
  
  // Deep freeze metadata
  Object.freeze(snapshot.metadata.tags);
  Object.freeze(snapshot.metadata);
  
  return Object.freeze(snapshot);
}

// ═══════════════════════════════════════════════════════════════
// SNAPSHOT DIFFING
// ═══════════════════════════════════════════════════════════════

/**
 * Compare two snapshots and generate diff
 * Security: Verifies both snapshots before diffing
 */
export async function compareSnapshots(
  fromSnapshot: CanvasSnapshot,
  toSnapshot: CanvasSnapshot
): Promise<import('../types/snapshots').SnapshotDiff> {
  // Verify both snapshots
  const fromVerification = await verifySnapshotIntegrity(fromSnapshot);
  const toVerification = await verifySnapshotIntegrity(toSnapshot);
  
  const verificationErrors: string[] = [
    ...fromVerification.errors.map(e => `From snapshot: ${e}`),
    ...toVerification.errors.map(e => `To snapshot: ${e}`),
  ];
  
  const fromNodes = fromSnapshot.content.nodes;
  const toNodes = toSnapshot.content.nodes;
  
  // Find added nodes
  const addedNodes: CanvasNode[] = [];
  Object.entries(toNodes).forEach(([id, node]) => {
    if (!(id in fromNodes)) {
      addedNodes.push(node);
    }
  });
  
  // Find removed nodes
  const removedNodes: CanvasNode[] = [];
  Object.entries(fromNodes).forEach(([id, node]) => {
    if (!(id in toNodes)) {
      removedNodes.push(node);
    }
  });
  
  // Find modified nodes
  const modifiedNodes: import('../types/snapshots').NodeModification[] = [];
  Object.entries(toNodes).forEach(([id, toNode]) => {
    const fromNode = fromNodes[id];
    if (!fromNode) return;
    
    const changes: import('../types/snapshots').NodeModification['changes'] = [];
    
    // Check each field
    const fieldsToCheck: (keyof CanvasNode)[] = ['title', 'content', 'type'];
    
    fieldsToCheck.forEach(field => {
      if (fromNode[field] !== toNode[field]) {
        changes.push({
          field,
          oldValue: fromNode[field],
          newValue: toNode[field],
        });
      }
    });
    
    // Check position
    if (fromNode.position.x !== toNode.position.x || 
        fromNode.position.y !== toNode.position.y) {
      changes.push({
        field: 'position',
        oldValue: fromNode.position,
        newValue: toNode.position,
      });
    }
    
    if (changes.length > 0) {
      modifiedNodes.push({
        nodeId: id,
        node: toNode,
        changes,
      });
    }
  });
  
  // Find connection changes
  const addedConnections: import('../types/snapshots').ConnectionChange[] = [];
  const removedConnections: import('../types/snapshots').ConnectionChange[] = [];
  
  // Build connection sets
  const fromConnections = new Set<string>();
  const toConnections = new Set<string>();
  
  Object.values(fromNodes).forEach(node => {
    node.connections.forEach(conn => {
      fromConnections.add(`${node.id}:${conn.targetId}:${conn.type}`);
    });
  });
  
  Object.values(toNodes).forEach(node => {
    node.connections.forEach(conn => {
      toConnections.add(`${node.id}:${conn.targetId}:${conn.type}`);
    });
  });
  
  // Find added connections
  toConnections.forEach(key => {
    if (!fromConnections.has(key)) {
      const [sourceId, targetId, type] = key.split(':');
      addedConnections.push({ sourceId, targetId, type });
    }
  });
  
  // Find removed connections
  fromConnections.forEach(key => {
    if (!toConnections.has(key)) {
      const [sourceId, targetId, type] = key.split(':');
      removedConnections.push({ sourceId, targetId, type });
    }
  });
  
  return {
    fromSnapshotId: fromSnapshot.metadata.id,
    toSnapshotId: toSnapshot.metadata.id,
    timestamp: Date.now(),
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedConnections,
    removedConnections,
    stats: {
      nodesAdded: addedNodes.length,
      nodesRemoved: removedNodes.length,
      nodesModified: modifiedNodes.length,
      connectionsAdded: addedConnections.length,
      connectionsRemoved: removedConnections.length,
      totalChanges: addedNodes.length + removedNodes.length + modifiedNodes.length + 
                    addedConnections.length + removedConnections.length,
    },
    verified: verificationErrors.length === 0,
    verificationErrors,
  };
}

/**
 * Validate snapshot name
 */
export function validateSnapshotName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Name must be 100 characters or less' };
  }
  
  // Check for invalid characters
  if (/[<>:"/\\|?*]/.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }
  
  return { isValid: true };
}

/**
 * Export snapshot to JSON
 */
export function exportSnapshot(snapshot: CanvasSnapshot): string {
  return JSON.stringify({
    format: 'CanvasDocs Snapshot',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    snapshot,
  }, null, 2);
}

/**
 * Import snapshot from JSON
 * Security: Verifies integrity after import
 */
export async function importSnapshot(
  json: string
): Promise<{ snapshot: CanvasSnapshot; errors: string[] }> {
  try {
    const parsed = JSON.parse(json);
    
    if (!parsed.snapshot) {
      return { 
        snapshot: null as unknown as CanvasSnapshot, 
        errors: ['Invalid snapshot format'] 
      };
    }
    
    const snapshot = parsed.snapshot as CanvasSnapshot;
    
    // Verify integrity
    const verification = await verifySnapshotIntegrity(snapshot);
    
    return { 
      snapshot: verification.valid ? snapshot : null as unknown as CanvasSnapshot, 
      errors: verification.errors 
    };
  } catch (err) {
    return { 
      snapshot: null as unknown as CanvasSnapshot, 
      errors: [`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`] 
    };
  }
}