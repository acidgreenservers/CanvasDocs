/**
 * Version Snapshot Utilities
 * 
 * ATTRACTOR: "Structure evolves"
 * GROUNDING: Documents change; being able to see what changed reveals evolution
 * 
 * Security: Snapshots are immutable; signed hashes detect tampering
 */

import { CanvasState, Snapshot } from '../types/canvas';
import { generateSecureId } from './security';

/**
 * Creates a content hash for tamper detection
 * Security: Uses SubtleCrypto API for integrity
 */
async function createContentHash(state: CanvasState): Promise<string> {
  const content = JSON.stringify(state);
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // Use SHA-256 for integrity verification
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates an immutable snapshot of the current canvas state
 * GROUNDING: Snapshots capture a point in document evolution
 */
export async function createSnapshot(
  state: CanvasState,
  name: string,
  description: string
): Promise<Snapshot> {
  const contentHash = await createContentHash(state);
  
  return {
    id: generateSecureId(),
    name,
    description,
    state: JSON.parse(JSON.stringify(state)), // Deep clone for immutability
    contentHash,
    createdAt: Date.now(),
    isImmutable: true,
  };
}

/**
 * Verifies snapshot integrity
 * Security: Detects if snapshot was tampered with
 */
export async function verifySnapshotIntegrity(snapshot: Snapshot): Promise<boolean> {
  const currentHash = await createContentHash(snapshot.state);
  return currentHash === snapshot.contentHash;
}

/**
 * Computes diff between two snapshots
 * GROUNDING: Seeing what changed reveals the evolution of thought
 */
export function computeSnapshotDiff(
  before: CanvasState,
  after: CanvasState
): {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  connectionChanges: { nodeId: string; added: number; removed: number }[];
} {
  const beforeNodes = Object.keys(before.nodes);
  const afterNodes = Object.keys(after.nodes);
  
  const addedNodes = afterNodes.filter(id => !beforeNodes.includes(id));
  const removedNodes = beforeNodes.filter(id => !afterNodes.includes(id));
  
  const modifiedNodes: string[] = [];
  const connectionChanges: { nodeId: string; added: number; removed: number }[] = [];
  
  // Check for content modifications
  beforeNodes.forEach(id => {
    if (afterNodes.includes(id)) {
      const beforeNode = before.nodes[id];
      const afterNode = after.nodes[id];
      
      if (beforeNode.content !== afterNode.content || beforeNode.title !== afterNode.title) {
        modifiedNodes.push(id);
      }
      
      // Check connection changes
      const beforeConns = new Set(beforeNode.connections.map(c => c.targetId));
      const afterConns = new Set(afterNode.connections.map(c => c.targetId));
      
      const addedConns = [...afterConns].filter(cid => !beforeConns.has(cid)).length;
      const removedConns = [...beforeConns].filter(cid => !afterConns.has(cid)).length;
      
      if (addedConns > 0 || removedConns > 0) {
        connectionChanges.push({
          nodeId: id,
          added: addedConns,
          removed: removedConns,
        });
      }
    }
  });
  
  return { addedNodes, removedNodes, modifiedNodes, connectionChanges };
}