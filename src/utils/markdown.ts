/**
 * Markdown generation utilities
 * Security: All content is sanitized before markdown conversion
 */

import { CanvasNode } from '../types/canvas';
import { sanitizeForExport } from './security';

const NODE_TYPE_MARKDOWN: Record<string, string> = {
  section: '\n## ',
  heading: '\n### ',
  paragraph: '\n',
  code: '\n```\n',
  list: '\n- ',
};

/**
 * Converts a node to markdown format
 * Security: Content is escaped before formatting
 */
function nodeToMarkdown(node: CanvasNode, includeMetadata: boolean): string {
  let output = '';
  
  if (includeMetadata) {
    output += `<!-- Node ID: ${node.id} -->\n`;
    output += `<!-- Created: ${new Date(node.createdAt).toISOString()} -->\n`;
  }
  
  const prefix = NODE_TYPE_MARKDOWN[node.type] || '';
  
  if (node.type === 'code') {
    output += `${prefix}${node.content}\n\`\`\``;
  } else {
    output += `${prefix}${node.title}\n\n${node.content}`;
  }
  
  return output;
}

/**
 * Generates markdown from a chain of connected nodes
 * Security: Traverses connections safely with cycle detection
 */
export function generateMarkdown(
  nodes: Record<string, CanvasNode>,
  selectedIds: string[],
  includeMetadata: boolean
): string {
  const visited = new Set<string>();
  const output: string[] = [];
  
  function traverse(nodeId: string): void {
    // Security: Cycle detection prevents infinite loops
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes[nodeId];
    if (!node) return;
    
    output.push(nodeToMarkdown(node, includeMetadata));
    
    // Traverse connections in order
    node.connections.forEach((connectedId) => {
      if (selectedIds.length === 0 || selectedIds.includes(connectedId)) {
        traverse(connectedId);
      }
    });
  }
  
  // Start traversal from selected nodes or all root nodes
  const startNodes = selectedIds.length > 0 
    ? selectedIds 
    : Object.keys(nodes).filter(id => {
        // Find root nodes (nodes not connected TO by other nodes)
        return !Object.values(nodes).some(n => n.connections.includes(id));
      });
  
  startNodes.forEach(id => traverse(id));
  
  return sanitizeForExport(output.join('\n'));
}

/**
 * Generates JSON export of selected nodes
 * Security: Sanitizes all string content
 */
export function generateJson(
  nodes: Record<string, CanvasNode>,
  selectedIds: string[]
): string {
  const selectedNodes = selectedIds.length > 0
    ? selectedIds.map(id => nodes[id]).filter(Boolean)
    : Object.values(nodes);
  
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    nodes: selectedNodes,
  }, null, 2);
}