/**
 * Template Type Definitions
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Structured documents share patterns; templates encode learned structure
 * Security: Template content validated on load, not just on use
 */

import { NodeType, ConnectionType } from './canvas';

// Template category for organization
export type TemplateCategory = 
  | 'document'    // Full document structures
  | 'section'     // Section-level patterns
  | 'block'       // Content blocks
  | 'custom';     // User-created templates

// Template metadata
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  author: 'system' | 'user';
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  version: string;
}

// Template node definition
export interface TemplateNode {
  // Node type
  type: NodeType;
  
  // Default content (validated on template load)
  title: string;
  content: string;
  
  // Relative position offset from template origin
  positionOffset: { x: number; y: number };
  
  // Connections to other template nodes (by index, resolved on instantiation)
  connections: {
    targetIndex: number;  // Index in template's nodes array
    type: ConnectionType;
  }[];
  
  // Placeholder hints for user customization
  placeholders?: {
    title?: string;      // e.g., "{{section_name}}"
    content?: string;    // e.g., "{{description}}"
  };
}

// Complete template definition
export interface NodeTemplate {
  metadata: TemplateMetadata;
  nodes: TemplateNode[];
  
  // Security: Hash of content for integrity verification
  contentHash: string;
}

// Template instantiation options
export interface TemplateInstantiationOptions {
  position: { x: number; y: number };
  placeholderValues?: Record<string, string>;
  connectionTypeOverride?: ConnectionType;
}

// Template validation result
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedTemplate?: NodeTemplate;
}

// Placeholder pattern for detection
export const PLACEHOLDER_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

// Required template schema version
export const TEMPLATE_SCHEMA_VERSION = '1.0.0';