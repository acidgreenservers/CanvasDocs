/**
 * Validation Type Definitions
 * 
 * ATTRACTOR: "Structure can be broken"
 * GROUNDING: Not all structures are valid; the tool should reveal structural problems
 * Security: Validation runs on state change, preventing corrupt exports
 */

import { NodeType, ConnectionType } from './canvas';

// Validation severity levels
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Validation category for grouping
export type ValidationCategory = 
  | 'structure'     // Structural integrity issues
  | 'content'       // Content validation issues
  | 'connections'   // Connection-related issues
  | 'completeness'  // Missing required elements
  | 'security';     // Security-related issues

// Individual validation issue
export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  type: ValidationIssueType;
  message: string;
  nodeId?: string;
  connectionId?: string;
  suggestion?: string;
  autoFixable: boolean;
}

// Types of validation issues
export type ValidationIssueType = 
  // Structure issues
  | 'orphaned_node'
  | 'disconnected_chain'
  | 'circular_dependency'
  | 'multiple_roots'
  | 'deep_nesting'
  
  // Content issues
  | 'empty_title'
  | 'empty_content'
  | 'title_too_long'
  | 'content_too_long'
  | 'invalid_characters'
  
  // Connection issues
  | 'self_connection'
  | 'duplicate_connection'
  | 'missing_connection_target'
  | 'invalid_connection_type'
  
  // Completeness issues
  | 'missing_section'
  | 'missing_heading'
  | 'incomplete_chain'
  | 'unreachable_node'
  
  // Security issues
  | 'suspicious_content'
  | 'potential_xss'
  | 'invalid_id_format';

// Complete validation result
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    nodesWithIssues: number;
    categories: Record<ValidationCategory, number>;
  };
  timestamp: number;
  hash: string; // For caching
}

// Validation rule definition
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ValidationCategory;
  defaultSeverity: ValidationSeverity;
  check: (context: ValidationContext) => ValidationIssue[];
}

// Validation context for rules
export interface ValidationContext {
  nodes: Map<string, import('./canvas').CanvasNode>;
  connections: Map<string, { sourceId: string; targetId: string; type: ConnectionType }>;
  nodeTypes: Map<string, NodeType>;
  rootNodes: Set<string>;
  leafNodes: Set<string>;
}

// Required structure definition for document types
export interface RequiredStructure {
  documentType: string;
  requiredSections: {
    type: NodeType;
    titlePattern?: RegExp;
    minCount: number;
    maxCount?: number;
  }[];
  requiredConnections?: {
    fromType: NodeType;
    toType: NodeType;
    connectionType?: ConnectionType;
    minCount: number;
  }[];
  maxDepth?: number;
  allowOrphans: boolean;
}

// Predefined document structures
export const DOCUMENT_STRUCTURES: RequiredStructure[] = [
  {
    documentType: 'RFC',
    requiredSections: [
      { type: 'section', titlePattern: /^title$/i, minCount: 1, maxCount: 1 },
      { type: 'section', titlePattern: /^abstract$/i, minCount: 1, maxCount: 1 },
      { type: 'section', titlePattern: /^motivation$/i, minCount: 1 },
      { type: 'section', titlePattern: /^detailed\s*design$/i, minCount: 1 },
    ],
    allowOrphans: false,
    maxDepth: 5,
  },
  {
    documentType: 'README',
    requiredSections: [
      { type: 'heading', titlePattern: /^#|^title$/i, minCount: 1 },
      { type: 'section', minCount: 1 },
    ],
    allowOrphans: true,
    maxDepth: 3,
  },
  {
    documentType: 'ADR',
    requiredSections: [
      { type: 'section', titlePattern: /^context$/i, minCount: 1, maxCount: 1 },
      { type: 'section', titlePattern: /^decision$/i, minCount: 1, maxCount: 1 },
      { type: 'section', titlePattern: /^consequences$/i, minCount: 1, maxCount: 1 },
    ],
    allowOrphans: false,
    maxDepth: 3,
  },
];