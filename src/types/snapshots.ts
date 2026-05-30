/**
 * Snapshot Type Definitions
 * 
 * ATTRACTOR: "Structure evolves"
 * GROUNDING: Documents change; snapshots reveal evolution of thought
 * Security: Snapshots are immutable; signed hashes detect tampering
 */

import { CanvasNode } from './canvas';

// Snapshot status
export type SnapshotStatus = 'active' | 'archived' | 'corrupted';

// Snapshot metadata (separate from content for integrity)
export interface SnapshotMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  createdBy?: string;
  tags: string[];
  
  // Integrity
  contentHash: string;
  signature: string;
  
  // Statistics
  nodeCount: number;
  connectionCount: number;
  
  // Status
  status: SnapshotStatus;
}

// Complete snapshot (metadata + content)
export interface CanvasSnapshot {
  metadata: SnapshotMetadata;
  content: SnapshotContent;
}

// Snapshot content (the actual canvas state)
export interface SnapshotContent {
  version: '1.0';
  nodes: Record<string, CanvasNode>;
  canvasBounds?: { width: number; height: number };
}

// Diff result between two snapshots
export interface SnapshotDiff {
  fromSnapshotId: string;
  toSnapshotId: string;
  timestamp: number;
  
  // Node changes
  addedNodes: CanvasNode[];
  removedNodes: CanvasNode[];
  modifiedNodes: NodeModification[];
  
  // Connection changes
  addedConnections: ConnectionChange[];
  removedConnections: ConnectionChange[];
  
  // Statistics
  stats: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    connectionsAdded: number;
    connectionsRemoved: number;
    totalChanges: number;
  };
  
  // Integrity
  verified: boolean;
  verificationErrors: string[];
}

// Node modification details
export interface NodeModification {
  nodeId: string;
  node: CanvasNode;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

// Connection change record
export interface ConnectionChange {
  sourceId: string;
  targetId: string;
  type: string;
}

// Snapshot comparison view mode
export type DiffViewMode = 'summary' | 'detailed' | 'visual';

// Snapshot branch (for future branching support)
export interface SnapshotBranch {
  id: string;
  name: string;
  baseSnapshotId: string;
  headSnapshotId: string;
  createdAt: number;
}

// Snapshot timeline entry
export interface TimelineEntry {
  snapshot: SnapshotMetadata;
  previousSnapshotId?: string;
  diffStats?: SnapshotDiff['stats'];
}

// Export format for snapshots
export interface SnapshotExport {
  format: 'json' | 'markdown';
  includeDiffs: boolean;
  snapshotIds: string[];
}