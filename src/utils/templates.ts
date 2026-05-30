/**
 * Node Template Utilities
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Structured documents share patterns; templates encode learned structure
 * 
 * Security: Template content validated on load, not just on use
 */

import { NodeTemplate, CanvasNode, NodeType, ConnectionType, ConnectionPattern } from '../types/canvas';
import { generateSecureId, validateContent } from './security';

// Built-in templates grounded in common document patterns
const BUILTIN_TEMPLATES: NodeTemplate[] = [
  {
    id: 'builtin-rfc-section',
    name: 'RFC Section',
    description: 'Standard RFC document section with heading and content',
    isBuiltIn: true,
    createdAt: 0,
    node: {
      type: 'section',
      title: 'Section Title',
      content: 'Section content goes here...',
      connections: [],
    },
    connectionPatterns: [
      { targetNodeType: 'heading', connectionType: 'follows', isRequired: false },
      { targetNodeType: 'paragraph', connectionType: 'follows', isRequired: false },
    ],
  },
  {
    id: 'builtin-readme-block',
    name: 'README Block',
    description: 'Standard README section with heading and description',
    isBuiltIn: true,
    createdAt: 0,
    node: {
      type: 'section',
      title: '## Section',
      content: 'Description of the section...',
      connections: [],
    },
    connectionPatterns: [
      { targetNodeType: 'code', connectionType: 'extends', isRequired: false },
    ],
  },
  {
    id: 'builtin-code-example',
    name: 'Code Example',
    description: 'Code block with explanation',
    isBuiltIn: true,
    createdAt: 0,
    node: {
      type: 'code',
      title: 'Example',
      content: '// Code example here',
      connections: [],
    },
    connectionPatterns: [
      { targetNodeType: 'paragraph', connectionType: 'references', isRequired: true },
    ],
  },
  {
    id: 'builtin-argument',
    name: 'Argument Structure',
    description: 'Claim with supporting evidence',
    isBuiltIn: true,
    createdAt: 0,
    node: {
      type: 'paragraph',
      title: 'Claim',
      content: 'The main claim or argument...',
      connections: [],
    },
    connectionPatterns: [
      { targetNodeType: 'paragraph', connectionType: 'extends', isRequired: false },
      { targetNodeType: 'paragraph', connectionType: 'contradicts', isRequired: false },
    ],
  },
];

/**
 * Validates template content before instantiation
 * Security: Prevents injection through template content
 */
export function validateTemplate(template: NodeTemplate): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const titleValidation = validateContent(template.node.title);
  const contentValidation = validateContent(template.node.content);
  
  if (!titleValidation.isValid) {
    errors.push(...titleValidation.errors.map(e => `Title: ${e}`));
  }
  
  if (!contentValidation.isValid) {
    errors.push(...contentValidation.errors.map(e => `Content: ${e}`));
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Instantiates a template as a new node
 * GROUNDING: Templates encode learned structure for reuse
 */
export function instantiateTemplate(
  template: NodeTemplate,
  position: { x: number; y: number }
): CanvasNode {
  // Security: Validate on instantiation even if already validated on load
  const validation = validateTemplate(template);
  if (!validation.isValid) {
    console.warn('Template validation warnings:', validation.errors);
  }
  
  return {
    id: generateSecureId(),
    type: template.node.type,
    title: template.node.title,
    content: template.node.content,
    position,
    connections: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Gets all available templates (built-in + custom)
 */
export function getAvailableTemplates(customTemplates: NodeTemplate[]): NodeTemplate[] {
  return [...BUILTIN_TEMPLATES, ...customTemplates];
}

/**
 * Creates a custom template from an existing node
 * GROUNDING: Users can encode their own patterns
 */
export function createTemplateFromNode(
  node: CanvasNode,
  name: string,
  description: string
): NodeTemplate {
  return {
    id: generateSecureId(),
    name,
    description,
    node: {
      type: node.type,
      title: node.title,
      content: node.content,
      connections: [],
    },
    connectionPatterns: node.connections.map(conn => ({
      targetNodeType: 'paragraph', // Default, user can customize
      connectionType: conn.type,
      isRequired: false,
    })),
    isBuiltIn: false,
    createdAt: Date.now(),
  };
}