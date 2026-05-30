/**
 * HTML Export Generator
 * 
 * Feature: Generates self-contained HTML exports
 * Security: All content is escaped before inclusion
 * Design: Styled according to ShadowSign design system
 */

import { CanvasNode } from '../types/canvas';
import { HTMLExportConfig, ExportableNode, ExportResult } from '../types/export';
import { escapeHtml, escapeJs, sanitizeAttribute } from './htmlExportSecurity';
import { generateExportStyles, COLORS } from './htmlExportStyles';
import { DEFAULT_HTML_CONFIG } from '../types/export';

/**
 * Traverses nodes in connection order starting from root nodes
 * Security: Handles circular references gracefully
 */
function traverseNodesInOrder(
  nodes: Record<string, CanvasNode>
): ExportableNode[] {
  const visited = new Set<string>();
  const result: ExportableNode[] = [];
  const depths = new Map<string, number>();
  
  // Find root nodes (nodes not connected TO by other nodes)
  const connectedTargets = new Set<string>();
  Object.values(nodes).forEach(node => {
    node.connections.forEach(conn => {
      connectedTargets.add(conn.targetId);
    });
  });
  
  const rootNodes = Object.keys(nodes).filter(id => !connectedTargets.has(id));
  
  // BFS traversal with depth tracking
  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes[nodeId];
    if (!node) return;
    
    depths.set(nodeId, depth);
    
    result.push({
      id: node.id,
      type: node.type,
      title: node.title,
      content: node.content,
      depth,
      connections: node.connections.map(c => c.targetId),
    });
    
    // Traverse connections in order
    node.connections.forEach(conn => {
      traverse(conn.targetId, depth + 1);
    });
  }
  
  // Start from all root nodes
  rootNodes.forEach(id => traverse(id, 0));
  
  // Include any unvisited nodes (orphaned)
  Object.keys(nodes).forEach(id => {
    if (!visited.has(id)) {
      traverse(id, 0);
    }
  });
  
  return result;
}

/**
 * Formats a timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Generates the HTML document
 */
export function generateHtmlExport(
  nodes: Record<string, CanvasNode>,
  config: Partial<HTMLExportConfig> = {}
): ExportResult {
  const fullConfig: HTMLExportConfig = { ...DEFAULT_HTML_CONFIG, ...config };
  const orderedNodes = traverseNodesInOrder(nodes);
  const styles = generateExportStyles({ theme: fullConfig.theme, includeStyles: true });
  
  const totalConnections = orderedNodes.reduce(
    (sum, node) => sum + node.connections.length,
    0
  );
  
  // Generate node HTML
  const nodesHtml = orderedNodes.map((node, index) => {
    const escapedTitle = escapeHtml(node.title);
    const escapedContent = escapeHtml(node.content);
    const escapedType = sanitizeAttribute(node.type);
    const escapedId = sanitizeAttribute(node.id);
    
    const connectionLineHtml = index < orderedNodes.length - 1
      ? '<div class="connection-line"></div>'
      : '';
    
    const metadataHtml = fullConfig.includeMetadata
      ? `
        <div class="node-metadata">
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">${escapedId.slice(0, 8)}...</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">DEPTH:</span>
              <span class="metadata-value">${node.depth}</span>
            </div>
          </div>
        </div>
      `
      : '';
    
    const connectionsHtml = node.connections.length > 0
      ? `
        <div class="node-footer">
          <div class="node-connections">
            <strong>${node.connections.length}</strong> connection${node.connections.length !== 1 ? 's' : ''}
          </div>
        </div>
      `
      : '';
    
    const depthBadgeHtml = fullConfig.showDepthIndicators
      ? `<span class="node-depth">D${node.depth}</span>`
      : '';
    
    return `
      <article class="node-card" data-type="${escapedType}" data-id="${escapedId}">
        <div class="node-accent"></div>
        <header class="node-header">
          <span class="node-type">${escapedType}</span>
          ${depthBadgeHtml}
        </header>
        <div class="node-content">
          <h2 class="node-title">${escapedTitle}</h2>
          <div class="node-body">${escapedContent}</div>
        </div>
        ${metadataHtml}
        ${connectionsHtml}
      </article>
      ${connectionLineHtml}
    `;
  }).join('\n');
  
  // Generate full HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="CanvasDocs">
  <meta name="description" content="${escapeHtml(fullConfig.description || 'CanvasDocs Export')}">
  <title>${escapeHtml(fullConfig.title)}</title>
  <style>
${styles}
  </style>
</head>
<body>
  <div class="atmosphere"></div>
  
  <main class="export-container">
    <header class="export-header">
      <div class="export-logo">📄</div>
      <h1 class="export-title">${escapeHtml(fullConfig.title)}</h1>
      <p class="export-subtitle">CanvasDocs Export</p>
      <div class="export-meta">
        <span class="export-meta-item">${orderedNodes.length} nodes</span>
        <span class="export-meta-item">${totalConnections} connections</span>
        <span class="export-meta-item">${new Date().toLocaleDateString()}</span>
      </div>
    </header>
    
    <section class="node-chain">
${nodesHtml}
    </section>
    
    <footer class="export-footer">
      <div class="footer-brand">
        <span class="footer-logo">📄</span>
        <span class="footer-name">CanvasDocs</span>
      </div>
      <p class="footer-tagline">
        <span>●</span> Local Only <span>●</span> Zero Egress <span>●</span> Your Data
      </p>
    </footer>
  </main>
</body>
</html>`.trim();
  
  return {
    content: html,
    filename: `canvas-export-${Date.now()}.html`,
    mimeType: 'text/html',
    nodeCount: orderedNodes.length,
    connectionCount: totalConnections,
    generatedAt: Date.now(),
  };
}

/**
 * Generates a minimal HTML preview (for in-app display)
 */
export function generateHtmlPreview(
  nodes: Record<string, CanvasNode>,
  maxNodes: number = 5
): string {
  const orderedNodes = traverseNodesInOrder(nodes).slice(0, maxNodes);
  
  const nodesHtml = orderedNodes.map(node => {
    const escapedTitle = escapeHtml(node.title);
    const escapedContent = escapeHtml(node.content);
    
    return `
      <div class="node-card" data-type="${sanitizeAttribute(node.type)}">
        <div class="node-accent"></div>
        <div class="node-content">
          <h3 class="node-title">${escapedTitle}</h3>
          <p class="node-body">${escapedContent.slice(0, 200)}${escapedContent.length > 200 ? '...' : ''}</p>
        </div>
      </div>
    `;
  }).join('\n');
  
  return `
    <div class="node-chain">
      ${nodesHtml}
    </div>
  `;
}