/**
 * Template Security Utilities
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Templates must be validated BEFORE use to prevent injection
 * Security: Content validated on load, hash verified on use
 */

import { 
  NodeTemplate, 
  TemplateNode, 
  TemplateValidationResult,
  TemplateMetadata,
  TemplateCategory,
  PLACEHOLDER_PATTERN,
  TEMPLATE_SCHEMA_VERSION 
} from '../types/templates';
import { NodeType, ConnectionType, CONNECTION_TYPES } from '../types/canvas';
import { generateSecureId, validateContent } from './security';

// Dangerous patterns to detect in template content
const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:/i,
  /vbscript:/i,
  /expression\s*\(/i,
];

// Maximum template constraints
const MAX_TEMPLATE_NODES = 50;
const MAX_TEMPLATE_CONTENT_LENGTH = 10000;
const MAX_TEMPLATE_NAME_LENGTH = 100;

/**
 * Compute content hash for template integrity
 * Uses SHA-256 for collision resistance
 */
export async function computeTemplateHash(template: Omit<NodeTemplate, 'contentHash'>): Promise<string> {
  const content = JSON.stringify({
    nodes: template.nodes,
    metadata: {
      name: template.metadata.name,
      category: template.metadata.category,
    },
  });
  
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate template metadata
 * Security: Enforces constraints on all metadata fields
 */
function validateMetadata(metadata: unknown): { isValid: boolean; errors: string[]; sanitized?: TemplateMetadata } {
  const errors: string[] = [];
  
  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata must be an object');
    return { isValid: false, errors };
  }
  
  const meta = metadata as Record<string, unknown>;
  
  // Validate name
  if (typeof meta.name !== 'string' || meta.name.length === 0) {
    errors.push('Template name is required');
  } else if (meta.name.length > MAX_TEMPLATE_NAME_LENGTH) {
    errors.push(`Template name exceeds ${MAX_TEMPLATE_NAME_LENGTH} characters`);
  }
  
  // Validate category
  const validCategories: TemplateCategory[] = ['document', 'section', 'block', 'custom'];
  if (!validCategories.includes(meta.category as TemplateCategory)) {
    errors.push(`Invalid category: ${meta.category}`);
  }
  
  // Validate tags
  if (meta.tags && !Array.isArray(meta.tags)) {
    errors.push('Tags must be an array');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  return {
    isValid: true,
    errors: [],
    sanitized: {
      id: meta.id as string || generateSecureId(),
      name: String(meta.name).slice(0, MAX_TEMPLATE_NAME_LENGTH),
      description: String(meta.description || '').slice(0, 500),
      category: meta.category as TemplateCategory,
      tags: Array.isArray(meta.tags) ? meta.tags.filter(t => typeof t === 'string').slice(0, 10) as string[] : [],
      author: meta.author as 'system' | 'user' || 'user',
      createdAt: Number(meta.createdAt) || Date.now(),
      updatedAt: Date.now(),
      usageCount: Math.max(0, Number(meta.usageCount) || 0),
      version: TEMPLATE_SCHEMA_VERSION,
    },
  };
}

/**
 * Validate a single template node
 * Security: Sanitizes all content, validates types
 */
function validateTemplateNode(node: unknown, nodeIndex: number): { isValid: boolean; errors: string[]; sanitized?: TemplateNode } {
  const errors: string[] = [];
  
  if (!node || typeof node !== 'object') {
    errors.push(`Node ${nodeIndex}: must be an object`);
    return { isValid: false, errors };
  }
  
  const n = node as Record<string, unknown>;
  
  // Validate type
  const validTypes: NodeType[] = ['section', 'heading', 'paragraph', 'code', 'list'];
  if (!validTypes.includes(n.type as NodeType)) {
    errors.push(`Node ${nodeIndex}: invalid type "${n.type}"`);
  }
  
  // Validate title
  const titleValidation = validateContent(String(n.title || ''));
  if (!titleValidation.isValid) {
    errors.push(`Node ${nodeIndex}: invalid title - ${titleValidation.errors.join(', ')}`);
  }
  
  // Validate content
  const contentValidation = validateContent(String(n.content || ''));
  if (!contentValidation.isValid) {
    errors.push(`Node ${nodeIndex}: invalid content - ${contentValidation.errors.join(', ')}`);
  }
  
  // Check for dangerous patterns
  const fullContent = `${n.title} ${n.content}`;
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(fullContent)) {
      errors.push(`Node ${nodeIndex}: contains potentially dangerous content`);
      break;
    }
  }
  
  // Validate content length
  if (String(n.content || '').length > MAX_TEMPLATE_CONTENT_LENGTH) {
    errors.push(`Node ${nodeIndex}: content exceeds ${MAX_TEMPLATE_CONTENT_LENGTH} characters`);
  }
  
  // Validate position offset
  if (typeof n.positionOffset !== 'object' || n.positionOffset === null) {
    errors.push(`Node ${nodeIndex}: positionOffset is required`);
  } else {
    const pos = n.positionOffset as Record<string, unknown>;
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      errors.push(`Node ${nodeIndex}: positionOffset must have x and y numbers`);
    }
  }
  
  // Validate connections
  if (n.connections && !Array.isArray(n.connections)) {
    errors.push(`Node ${nodeIndex}: connections must be an array`);
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Sanitize and return
  const sanitizedNode: TemplateNode = {
    type: n.type as NodeType,
    title: titleValidation.sanitizedContent!,
    content: contentValidation.sanitizedContent!,
    positionOffset: {
      x: Math.max(-2000, Math.min(2000, Number((n.positionOffset as any).x))),
      y: Math.max(-2000, Math.min(2000, Number((n.positionOffset as any).y))),
    },
    connections: Array.isArray(n.connections) 
      ? n.connections.map(c => ({
          targetIndex: Math.max(0, Number((c as any).targetIndex) || 0),
          type: validConnectionType((c as any).type) ? (c as any).type : 'follows',
        }))
      : [],
    placeholders: n.placeholders as any,
  };
  
  return { isValid: true, errors: [], sanitized: sanitizedNode };
}

function validConnectionType(type: unknown): type is ConnectionType {
  return CONNECTION_TYPES.includes(type as ConnectionType);
}

/**
 * Validate complete template
 * Security: Full validation pipeline before template can be used
 */
export async function validateTemplate(template: unknown): Promise<TemplateValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!template || typeof template !== 'object') {
    return { isValid: false, errors: ['Template must be an object'], warnings: [] };
  }
  
  const t = template as Record<string, unknown>;
  
  // Validate metadata
  const metadataResult = validateMetadata(t.metadata);
  if (!metadataResult.isValid) {
    errors.push(...metadataResult.errors);
  }
  
  // Validate nodes array
  if (!Array.isArray(t.nodes)) {
    errors.push('Template must have a nodes array');
    return { isValid: false, errors, warnings };
  }
  
  if (t.nodes.length === 0) {
    errors.push('Template must have at least one node');
  }
  
  if (t.nodes.length > MAX_TEMPLATE_NODES) {
    errors.push(`Template cannot have more than ${MAX_TEMPLATE_NODES} nodes`);
  }
  
  // Validate each node
  const sanitizedNodes: TemplateNode[] = [];
  for (let i = 0; i < t.nodes.length; i++) {
    const nodeResult = validateTemplateNode(t.nodes[i], i);
    if (!nodeResult.isValid) {
      errors.push(...nodeResult.errors);
    } else if (nodeResult.sanitized) {
      sanitizedNodes.push(nodeResult.sanitized);
    }
  }
  
  // Validate connection references
  sanitizedNodes.forEach((node, nodeIndex) => {
    node.connections.forEach(conn => {
      if (conn.targetIndex >= sanitizedNodes.length) {
        errors.push(`Node ${nodeIndex}: connection references non-existent node index ${conn.targetIndex}`);
      }
    });
  });
  
  // Check for circular references in template structure
  if (hasCircularReferences(sanitizedNodes)) {
    warnings.push('Template contains potential circular references');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }
  
  // Build sanitized template
  const sanitizedTemplate: Omit<NodeTemplate, 'contentHash'> = {
    metadata: metadataResult.sanitized!,
    nodes: sanitizedNodes,
  };
  
  // Compute content hash
  const contentHash = await computeTemplateHash(sanitizedTemplate);
  
  return {
    isValid: true,
    errors: [],
    warnings,
    sanitizedTemplate: {
      ...sanitizedTemplate,
      contentHash,
    },
  };
}

/**
 * Verify template integrity
 * Security: Ensures template hasn't been tampered with
 */
export async function verifyTemplateIntegrity(template: NodeTemplate): Promise<boolean> {
  const computedHash = await computeTemplateHash({
    metadata: template.metadata,
    nodes: template.nodes,
  });
  
  return computedHash === template.contentHash;
}

/**
 * Detect circular references in template structure
 */
function hasCircularReferences(nodes: TemplateNode[]): boolean {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function hasCycle(nodeIndex: number): boolean {
    if (recursionStack.has(nodeIndex)) return true;
    if (visited.has(nodeIndex)) return false;
    
    visited.add(nodeIndex);
    recursionStack.add(nodeIndex);
    
    const node = nodes[nodeIndex];
    if (!node) return false;
    
    for (const conn of node.connections) {
      if (hasCycle(conn.targetIndex)) return true;
    }
    
    recursionStack.delete(nodeIndex);
    return false;
  }
  
  for (let i = 0; i < nodes.length; i++) {
    if (hasCycle(i)) return true;
  }
  
  return false;
}

/**
 * Extract placeholders from template content
 */
export function extractPlaceholders(template: NodeTemplate): Set<string> {
  const placeholders = new Set<string>();
  
  template.nodes.forEach(node => {
    const titleMatches = node.title.matchAll(PLACEHOLDER_PATTERN);
    const contentMatches = node.content.matchAll(PLACEHOLDER_PATTERN);
    
    for (const match of titleMatches) {
      placeholders.add(match[1]);
    }
    for (const match of contentMatches) {
      placeholders.add(match[1]);
    }
  });
  
  return placeholders;
}

/**
 * Replace placeholders in content
 * Security: Escapes replacement values to prevent injection
 */
export function replacePlaceholders(
  content: string, 
  values: Record<string, string>
): string {
  return content.replace(PLACEHOLDER_PATTERN, (match, key) => {
    const value = values[key];
    if (value === undefined) return match;
    
    // Escape the replacement value
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    return escaped;
  });
}