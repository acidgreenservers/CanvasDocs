/**
 * HTML Export Generator
 * 
 * Feature: Generates self-contained HTML exports
 * Security: All content is escaped before inclusion
 * Design: ShadowSign design system with semantic connection rendering
 * 
 * ATTRACTOR: "Relationships have semantics"
 * GROUNDING: The kind of relationship changes how structure should be interpreted
 * 
 * RIVER + TRIBUTARIES MODEL:
 * - follows chain → main document spine (the river)
 * - extends → collapsible <details> inline (tributary)
 * - depends-on → superscript footnote marker
 * - contradicts → styled blockquote admonition
 * - references → hyperlinked cross-reference
 */

import { CanvasNode, CONNECTION_TYPE_LABELS, CONNECTION_TYPE_COLORS } from '../types/canvas';
import { HTMLExportConfig, ExportableNode, ExportResult } from '../types/export';
import { escapeHtml, escapeJs, sanitizeAttribute } from './htmlExportSecurity';
import { generateExportStyles, COLORS } from './htmlExportStyles';
import { DEFAULT_HTML_CONFIG } from '../types/export';

/**
 * Connection type → CSS class mapping for side-content rendering
 */
const CONNECTION_CSS: Record<string, string> = {
  'extends': 'connection-extends',
  'depends-on': 'connection-depends',
  'contradicts': 'connection-contradicts',
  'references': 'connection-references',
};

const CONNECTION_ICONS: Record<string, string> = {
  'follows': '↓',
  'extends': '⊕',
  'depends-on': '⊳',
  'contradicts': '⊘',
  'references': '↗',
};

/**
 * Traverses nodes preserving connection semantics
 * Main spine = follows chain; side connections = tributaries
 */
function traverseNodesInOrder(
  nodes: Record<string, CanvasNode>
): ExportableNode[] {
  const visited = new Set<string>();
  const result: ExportableNode[] = [];
  const depths = new Map<string, number>();
  
  // Find root nodes (nodes not connected TO by other nodes via follows)
  const connectedTargets = new Set<string>();
  Object.values(nodes).forEach(node => {
    node.connections.forEach(conn => {
      connectedTargets.add(conn.targetId);
    });
  });
  
  const rootNodes = Object.keys(nodes).filter(id => !connectedTargets.has(id));
  
  // BFS traversal following follows chain for main spine
  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes[nodeId];
    if (!node) return;
    
    depths.set(nodeId, depth);
    
    // Preserve ALL connection types, not just target IDs
    result.push({
      id: node.id,
      type: node.type,
      title: node.title,
      content: node.content,
      depth,
      connections: node.connections.map(c => ({
        targetId: c.targetId,
        type: c.type,
      })),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    });
    
    // Traverse follows connections first (main spine)
    const followsConns = node.connections.filter(c => c.type === 'follows');
    followsConns.forEach(conn => {
      traverse(conn.targetId, depth + 1);
    });
    
    // Then traverse non-follows connections (tributaries) at same depth
    const otherConns = node.connections.filter(c => c.type !== 'follows');
    otherConns.forEach(conn => {
      traverse(conn.targetId, depth + 1);
    });
  }
  
  // Start from root nodes
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
 * Generates semantic side-content HTML for a node's non-follows connections
 */
function generateSideConnectionsHtml(node: ExportableNode): string {
  const sideConns = node.connections.filter(c => c.type !== 'follows');
  if (sideConns.length === 0) return '';
  
  return sideConns.map(conn => {
    const cssClass = CONNECTION_CSS[conn.type] || 'connection-unknown';
    const icon = CONNECTION_ICONS[conn.type] || '→';
    const label = CONNECTION_TYPE_LABELS[conn.type as keyof typeof CONNECTION_TYPE_LABELS] || conn.type;
    const color = CONNECTION_TYPE_COLORS[conn.type as keyof typeof CONNECTION_TYPE_COLORS] || '#8b949e';
    const escapedTargetId = sanitizeAttribute(conn.targetId);
    
    switch (conn.type) {
      case 'extends':
        return `
        <details class="side-content ${cssClass}">
          <summary class="side-content-summary" style="color: ${color};">
            <span class="side-content-icon">${icon}</span>
            <span class="side-content-label">${label}</span>
            <span class="side-content-target" data-id="${escapedTargetId}">→ Linked Node</span>
          </summary>
          <div class="side-content-body">
            <p class="side-content-placeholder">Extended content from ${escapedTargetId.slice(0, 8)}...</p>
          </div>
        </details>`;
      
      case 'contradicts':
        return `
        <blockquote class="side-content ${cssClass}">
          <div class="side-content-summary">
            <span class="side-content-icon">${icon}</span>
            <span class="side-content-label">${label}</span>
            <span class="side-content-target" data-id="${escapedTargetId}">→ ${escapedTargetId.slice(0, 8)}...</span>
          </div>
          <p class="side-content-body">Alternative view supported by ${escapedTargetId.slice(0, 8)}...</p>
        </blockquote>`;
      
      case 'depends-on':
        return `
        <sup class="side-content ${cssClass}">
          <a href="#node-${escapedTargetId}" class="side-content-link" title="${label}: ${escapedTargetId.slice(0, 8)}..." style="color: ${color};">
            ${icon}
          </a>
        </sup>`;
      
      case 'references':
        return `
        <div class="side-content ${cssClass}">
          <a href="#node-${escapedTargetId}" class="side-content-link" style="color: ${color};">
            <span class="side-content-icon">${icon}</span>
            <span class="side-content-label">${label}</span>
            <span class="side-content-target">→ ${escapedTargetId.slice(0, 8)}...</span>
          </a>
        </div>`;
      
      default:
        return `
        <div class="side-content ${cssClass}">
          <span class="side-content-summary" style="color: ${color};">
            <span class="side-content-icon">${icon}</span>
            <span class="side-content-label">${label}</span>
            <span class="side-content-target">→ ${escapedTargetId.slice(0, 8)}...</span>
          </span>
        </div>`;
    }
  }).join('\n');
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
  
  // Generate node HTML with river + tributaries rendering
  const nodesHtml = orderedNodes.map((node, index) => {
    const escapedTitle = escapeHtml(node.title);
    const escapedContent = escapeHtml(node.content);
    const escapedType = sanitizeAttribute(node.type);
    const escapedId = sanitizeAttribute(node.id);
    
    // Determine if this node continues the follows chain from previous
    const prevNode = index > 0 ? orderedNodes[index - 1] : null;
    const hasFollowsPrev = prevNode?.connections.some(c => c.type === 'follows' && c.targetId === node.id);
    
    // Connection line only between follows-chain links
    const connectionLineHtml = hasFollowsPrev
      ? '<div class="connection-line"><span class="connection-line-arrow">↓</span></div>'
      : '<div class="connection-line connection-line-tributary"><span class="connection-line-arrow">↳</span></div>';
    
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
    
    // Count connection types for display
    const followsCount = node.connections.filter(c => c.type === 'follows').length;
    const sideCount = node.connections.filter(c => c.type !== 'follows').length;
    
    const connectionsHtml = node.connections.length > 0
      ? `
        <div class="node-footer">
          <div class="node-connections">
            ${followsCount > 0 ? `<span class="conn-follows">↓ ${followsCount} follow${followsCount !== 1 ? 's' : ''}</span>` : ''}
            ${sideCount > 0 ? `<span class="conn-side">⊕ ${sideCount} side${sideCount !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
      `
      : '';
    
    const depthBadgeHtml = fullConfig.showDepthIndicators
      ? `<span class="node-depth">D${node.depth}</span>`
      : '';
    
    // Render side connections (non-follows) as inline semantic content
    const sideContentHtml = generateSideConnectionsHtml(node);
    
    return `
      <article id="node-${escapedId}" class="node-card" data-type="${escapedType}" data-id="${escapedId}">
        <div class="node-accent"></div>
        <header class="node-header">
          <span class="node-type">${escapedType}</span>
          ${depthBadgeHtml}
        </header>
        <div class="node-content">
          <h2 class="node-title">${escapedTitle}</h2>
          <div class="node-body">${escapedContent}</div>
          ${sideContentHtml}
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
      <p class="footer-tagline">Generated by <span>CanvasDocs</span></p>
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