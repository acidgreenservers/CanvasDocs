/**
 * Core type definitions for CanvasDocs
 * Security invariant: All types include validation guards
 * 
 * SEMANTIC GROUNDING:
 * - ConnectionType: Anchored to "Relationships have semantics"
 * - NodeTemplate: Anchored to "Structure repeats"
 * - CanvasZone: Anchored to "Space has meaning"
 * - ValidationRule: Anchored to "Structure can be broken"
 */

// ─── ATTRACTOR: "Relationships have semantics" ───
export type ConnectionType = 
  | 'follows'      // Sequential flow
  | 'depends-on'   // Dependency relationship
  | 'contradicts'  // Opposition/conflict
  | 'extends'      // Elaboration
  | 'references';  // Cross-reference

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  'follows': 'Follows →',
  'depends-on': 'Depends On ⊳',
  'contradicts': 'Contradicts ⊘',
  'extends': 'Extends +',
  'references': 'References ↗',
};

export const CONNECTION_TYPE_COLORS: Record<ConnectionType, string> = {
  'follows': '#10b981',     // emerald
  'depends-on': '#f59e0b',  // amber
  'contradicts': '#ef4444', // red
  'extends': '#3b82f6',     // blue
  'references': '#8b5cf6',  // violet
};

// ─── ATTRACTOR: "Structure repeats" ───
export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  node: Omit<CanvasNode, 'id' | 'position' | 'createdAt' | 'updatedAt'>;
  connectionPatterns: ConnectionPattern[];
  isBuiltIn: boolean;
  createdAt: number;
}

export interface ConnectionPattern {
  targetNodeType: NodeType;
  connectionType: ConnectionType;
  isRequired: boolean;
}

// ─── ATTRACTOR: "Space has meaning" ───
export type ZoneType = 'draft' | 'review' | 'approved' | 'final' | 'archived';

export interface CanvasZone {
  id: string;
  name: string;
  type: ZoneType;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
  nodeIds: string[];
}

export const ZONE_CONFIGS: Record<ZoneType, { color: string; label: string; description: string }> = {
  draft: { color: '#64748b', label: 'Draft', description: 'Work in progress' },
  review: { color: '#f59e0b', label: 'Review', description: 'Awaiting review' },
  approved: { color: '#10b981', label: 'Approved', description: 'Reviewed and approved' },
  final: { color: '#3b82f6', label: 'Final', description: 'Ready for export' },
  archived: { color: '#6b7280', label: 'Archived', description: 'Historical reference' },
};

// ─── ATTRACTOR: "Structure can be broken" ───
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  type: 'orphaned-node' | 'circular-dependency' | 'missing-required' | 'disconnected-section';
  severity: ValidationSeverity;
  nodeId?: string;
  nodeIds?: string[];
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  lastChecked: number;
}

// ─── Core Types ───
export type NodeType = 'section' | 'heading' | 'paragraph' | 'code' | 'list';

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  position: { x: number; y: number };
  connections: NodeConnection[];
  createdAt: number;
  updatedAt: number;
  zoneId?: string;
}

export interface NodeConnection {
  targetId: string;
  type: ConnectionType;
  createdAt: number;
}

export interface CanvasState {
  nodes: Record<string, CanvasNode>;
  zones: Record<string, CanvasZone>;
  selectedNodeId: string | null;
  version: number;
  lastModified: number;
}

// ─── ATTRACTOR: "Structure evolves" ───
export interface Snapshot {
  id: string;
  name: string;
  description: string;
  state: CanvasState;
  contentHash: string;
  createdAt: number;
  isImmutable: boolean;
}

export interface ExportOptions {
  format: 'markdown' | 'json';
  includeMetadata: boolean;
  selectedNodes: string[];
  respectZones: boolean;
  zoneOrder: ZoneType[];
}