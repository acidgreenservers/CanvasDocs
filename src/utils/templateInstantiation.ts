/**
 * Template Instantiation Utilities
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Templates must be safely instantiated with user-provided values
 * Security: All placeholder values are sanitized, integrity verified
 */

import { 
  NodeTemplate, 
  TemplateInstantiationOptions,
  TemplateNode 
} from '../types/templates';
import { CanvasNode } from '../types/canvas';
import { generateSecureId, validateContent } from './security';
import { verifyTemplateIntegrity, replacePlaceholders, extractPlaceholders } from './templateSecurity';

/**
 * Instantiate a template into canvas nodes
 * 
 * Security pipeline:
 * 1. Verify template integrity (hash check)
 * 2. Validate all placeholder values
 * 3. Sanitize replaced content
 * 4. Generate secure IDs for all nodes
 */
export async function instantiateTemplate(
  template: NodeTemplate,
  options: TemplateInstantiationOptions
): Promise<CanvasNode[]> {
  // Security: Verify template hasn't been tampered with
  const isValid = await verifyTemplateIntegrity(template);
  if (!isValid) {
    throw new Error('Template integrity verification failed. Template may have been tampered with.');
  }
  
  // Get placeholders and validate values
  const placeholders = extractPlaceholders(template);
  const values = options.placeholderValues || {};
  
  // Security: Validate all provided placeholder values
  for (const [key, value] of Object.entries(values)) {
    const validation = validateContent(value);
    if (!validation.isValid) {
      throw new Error(`Invalid placeholder value for "${key}": ${validation.errors.join(', ')}`);
    }
  }
  
  // Warn about missing placeholders (but don't fail)
  const missingPlaceholders = [...placeholders].filter(p => !(p in values));
  if (missingPlaceholders.length > 0) {
    console.warn(`Missing placeholder values: ${missingPlaceholders.join(', ')}`);
  }
  
  // Create ID mapping for connection resolution
  const nodeIdMap = new Map<number, string>();
  template.nodes.forEach((_, index) => {
    nodeIdMap.set(index, generateSecureId());
  });
  
  // Instantiate nodes
  const instantiatedNodes: CanvasNode[] = template.nodes.map((templateNode, index) => {
    const nodeId = nodeIdMap.get(index)!;
    
    // Replace placeholders in title and content
    const title = replacePlaceholders(templateNode.title, values);
    const content = replacePlaceholders(templateNode.content, values);
    
    // Final validation of replaced content
    const titleValidation = validateContent(title);
    const contentValidation = validateContent(content);
    
    return {
      id: nodeId,
      type: templateNode.type,
      title: titleValidation.sanitizedContent || templateNode.title,
      content: contentValidation.sanitizedContent || templateNode.content,
      position: {
        x: options.position.x + templateNode.positionOffset.x,
        y: options.position.y + templateNode.positionOffset.y,
      },
      connections: [], // Will be resolved in second pass
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
  
  // Resolve connections
  template.nodes.forEach((templateNode, sourceIndex) => {
    const sourceNode = instantiatedNodes[sourceIndex];
    
    templateNode.connections.forEach(conn => {
      const targetId = nodeIdMap.get(conn.targetIndex);
      if (targetId) {
        sourceNode.connections.push({
          targetId,
          type: conn.type,
          createdAt: Date.now(),
        });
      }
    });
  });
  
  return instantiatedNodes;
}

/**
 * Create a template from existing canvas nodes
 * Security: Validates all content before template creation
 */
export async function createTemplateFromNodes(
  nodes: CanvasNode[],
  name: string,
  description: string,
  category: 'document' | 'section' | 'block' | 'custom' = 'custom'
): Promise<NodeTemplate> {
  if (nodes.length === 0) {
    throw new Error('Cannot create template from empty node list');
  }
  
  if (nodes.length > 50) {
    throw new Error('Template cannot have more than 50 nodes');
  }
  
  // Find bounding box for relative positioning
  const minX = Math.min(...nodes.map(n => n.position.x));
  const minY = Math.min(...nodes.map(n => n.position.y));
  
  // Create ID to index mapping
  const idToIndex = new Map<string, number>();
  nodes.forEach((node, index) => {
    idToIndex.set(node.id, index);
  });
  
  // Convert to template nodes
  const templateNodes: TemplateNode[] = nodes.map(node => {
    // Validate content
    const titleValidation = validateContent(node.title);
    const contentValidation = validateContent(node.content);
    
    return {
      type: node.type,
      title: titleValidation.sanitizedContent || node.title,
      content: contentValidation.sanitizedContent || node.content,
      positionOffset: {
        x: node.position.x - minX,
        y: node.position.y - minY,
      },
      connections: node.connections
        .map(conn => {
          const targetIndex = idToIndex.get(conn.targetId);
          return targetIndex !== undefined
            ? { targetIndex, type: conn.type }
            : null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null),
    };
  });
  
  // Build template
  const template: Omit<NodeTemplate, 'contentHash'> = {
    metadata: {
      id: generateSecureId(),
      name,
      description,
      category,
      tags: [],
      author: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      version: '1.0.0',
    },
    nodes: templateNodes,
  };
  
  // Compute hash
  const { computeTemplateHash } = await import('./templateSecurity');
  const contentHash = await computeTemplateHash(template);
  
  return {
    ...template,
    contentHash,
  };
}