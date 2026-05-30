/**
 * Focus Mode Engine
 * 
 * ATTRACTOR: "Structure has depth"
 * GROUNDING: Focus reveals sub-structure through filtered views
 * Security: Focus is a VIEW transformation - never modifies actual state
 */

import { CanvasNode } from '../types/canvas';
import { 
  FocusConfig, 
  FocusState, 
  FocusDirection,
  FocusDepth,
  DEFAULT_FOCUS_CONFIG 
} from '../types/focus';

// ═══════════════════════════════════════════════════════════════
// FOCUS COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute focus state from configuration
 * Security: Pure function - no side effects, returns new state
 */
export function computeFocusState(
  nodes: Record<string, CanvasNode>,
  config: FocusConfig
): FocusState {
  // If focus is disabled, all nodes are visible
  if (!config.enabled || !config.focusNodeId || !nodes[config.focusNodeId]) {
    const allNodeIds = new Set(Object.keys(nodes));
    return {
      config,
      visibleNodeIds: allNodeIds,
      fadedNodeIds: new Set(),
      hiddenNodeIds: new Set(),
      nodeDepths: new Map(),
      highlightedConnectionIds: new Set(),
      stats: {
        totalNodes: allNodeIds.size,
        visibleNodes: allNodeIds.size,
        hiddenNodes: 0,
        maxDepth: 0,
      },
    };
  }
  
  const focusNodeId = config.focusNodeId;
  const nodeDepths = new Map<string, number>();
  const highlightedConnectionIds = new Set<string>();
  
  // Set focus node depth to 0
  nodeDepths.set(focusNodeId, 0);
  
  // Build reverse connection map (for upstream traversal)
  const reverseConnections = buildReverseConnectionMap(nodes);
  
  // Traverse upstream (nodes that can reach focus node)
  if (config.direction === 'upstream' || config.direction === 'both') {
    traverseUpstream(
      focusNodeId,
      nodes,
      reverseConnections,
      nodeDepths,
      highlightedConnectionIds,
      config.depth.maxUpstream
    );
  }
  
  // Traverse downstream (nodes reachable from focus node)
  if (config.direction === 'downstream' || config.direction === 'both') {
    traverseDownstream(
      focusNodeId,
      nodes,
      nodeDepths,
      highlightedConnectionIds,
      config.depth.maxDownstream
    );
  }
  
  // Compute visibility sets
  const visibleNodeIds = new Set(nodeDepths.keys());
  const allNodeIds = new Set(Object.keys(nodes));
  
  const fadedNodeIds = new Set<string>();
  const hiddenNodeIds = new Set<string>();
  
  allNodeIds.forEach(nodeId => {
    if (!visibleNodeIds.has(nodeId)) {
      if (config.fadeDisconnected) {
        fadedNodeIds.add(nodeId);
      } else {
        hiddenNodeIds.add(nodeId);
      }
    }
  });
  
  // Calculate max depth
  let maxDepth = 0;
  nodeDepths.forEach(depth => {
    if (Math.abs(depth) > maxDepth) {
      maxDepth = Math.abs(depth);
    }
  });
  
  return {
    config,
    visibleNodeIds,
    fadedNodeIds,
    hiddenNodeIds,
    nodeDepths,
    highlightedConnectionIds,
    stats: {
      totalNodes: allNodeIds.size,
      visibleNodes: visibleNodeIds.size,
      hiddenNodes: hiddenNodeIds.size,
      maxDepth,
    },
  };
}

/**
 * Build reverse connection map for upstream traversal
 */
function buildReverseConnectionMap(
  nodes: Record<string, CanvasNode>
): Map<string, string[]> {
  const reverseMap = new Map<string, string[]>();
  
  Object.entries(nodes).forEach(([nodeId, node]) => {
    node.connections.forEach(conn => {
      const existing = reverseMap.get(conn.targetId) || [];
      existing.push(nodeId);
      reverseMap.set(conn.targetId, existing);
    });
  });
  
  return reverseMap;
}

/**
 * Traverse upstream from focus node
 * Security: Uses iterative BFS to prevent stack overflow
 */
function traverseUpstream(
  focusNodeId: string,
  nodes: Record<string, CanvasNode>,
  reverseConnections: Map<string, string[]>,
  nodeDepths: Map<string, number>,
  highlightedConnectionIds: Set<string>,
  maxDepth: number
): void {
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: focusNodeId, depth: 0 }
  ];
  const visited = new Set<string>([focusNodeId]);
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    
    // Check depth limit (0 = unlimited)
    if (maxDepth > 0 && depth > maxDepth) {
      continue;
    }
    
    // Get nodes that connect TO this node
    const upstreamNodes = reverseConnections.get(nodeId) || [];
    
    for (const upstreamId of upstreamNodes) {
      if (visited.has(upstreamId)) continue;
      if (!nodes[upstreamId]) continue;
      
      visited.add(upstreamId);
      
      // Upstream nodes have negative depth
      const upstreamDepth = -(depth + 1);
      nodeDepths.set(upstreamId, upstreamDepth);
      
      // Highlight connection
      highlightedConnectionIds.add(`${upstreamId}:${nodeId}`);
      
      queue.push({ nodeId: upstreamId, depth: depth + 1 });
    }
  }
}

/**
 * Traverse downstream from focus node
 * Security: Uses iterative BFS to prevent stack overflow
 */
function traverseDownstream(
  focusNodeId: string,
  nodes: Record<string, CanvasNode>,
  nodeDepths: Map<string, number>,
  highlightedConnectionIds: Set<string>,
  maxDepth: number
): void {
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: focusNodeId, depth: 0 }
  ];
  const visited = new Set<string>([focusNodeId]);
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    
    // Check depth limit (0 = unlimited)
    if (maxDepth > 0 && depth >= maxDepth) {
      continue;
    }
    
    const node = nodes[nodeId];
    if (!node) continue;
    
    for (const conn of node.connections) {
      if (visited.has(conn.targetId)) continue;
      if (!nodes[conn.targetId]) continue;
      
      visited.add(conn.targetId);
      
      // Downstream nodes have positive depth
      const targetDepth = depth + 1;
      nodeDepths.set(conn.targetId, targetDepth);
      
      // Highlight connection
      highlightedConnectionIds.add(`${nodeId}:${conn.targetId}`);
      
      queue.push({ nodeId: conn.targetId, depth: targetDepth });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// FOCUS UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a node is visible in focus mode
 */
export function isNodeVisible(
  nodeId: string,
  focusState: FocusState
): boolean {
  return focusState.visibleNodeIds.has(nodeId);
}

/**
 * Check if a node is faded in focus mode
 */
export function isNodeFaded(
  nodeId: string,
  focusState: FocusState
): boolean {
  return focusState.fadedNodeIds.has(nodeId);
}

/**
 * Check if a connection is highlighted
 */
export function isConnectionHighlighted(
  sourceId: string,
  targetId: string,
  focusState: FocusState
): boolean {
  return focusState.highlightedConnectionIds.has(`${sourceId}:${targetId}`);
}

/**
 * Get node depth from focus node
 */
export function getNodeDepth(
  nodeId: string,
  focusState: FocusState
): number | null {
  return focusState.nodeDepths.get(nodeId) ?? null;
}

/**
 * Find the best focus node for a set of selected nodes
 * Security: Returns the node with most connections as heuristic
 */
export function suggestFocusNode(
  nodes: Record<string, CanvasNode>
): string | null {
  if (Object.keys(nodes).length === 0) return null;
  
  let bestNodeId: string | null = null;
  let maxConnections = -1;
  
  Object.entries(nodes).forEach(([nodeId, node]) => {
    const connectionCount = node.connections.length;
    if (connectionCount > maxConnections) {
      maxConnections = connectionCount;
      bestNodeId = nodeId;
    }
  });
  
  return bestNodeId;
}

/**
 * Create focus config from preset
 */
export function applyFocusPreset(
  presetName: keyof typeof import('../types/focus').FOCUS_PRESETS,
  currentConfig: FocusConfig
): FocusConfig {
  const preset = import('../types/focus').FOCUS_PRESETS[presetName];
  return {
    ...currentConfig,
    ...preset,
    depth: {
      ...currentConfig.depth,
      ...(preset.depth || {}),
    },
  };
}

/**
 * Validate focus configuration
 * Security: Ensures focus node exists and config is valid
 */
export function validateFocusConfig(
  config: FocusConfig,
  nodes: Record<string, CanvasNode>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.enabled) {
    if (!config.focusNodeId) {
      errors.push('Focus node ID is required when focus is enabled');
    } else if (!nodes[config.focusNodeId]) {
      errors.push(`Focus node "${config.focusNodeId}" does not exist`);
    }
    
    if (config.depth.maxUpstream < 0) {
      errors.push('Max upstream depth cannot be negative');
    }
    
    if (config.depth.maxDownstream < 0) {
      errors.push('Max downstream depth cannot be negative');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get focus breadcrumb path
 * Returns ordered list of nodes from root to focus node
 */
export function getFocusBreadcrumb(
  focusNodeId: string,
  nodes: Record<string, CanvasNode>
): CanvasNode[] {
  const path: CanvasNode[] = [];
  const visited = new Set<string>();
  
  function findPath(nodeId: string, currentPath: CanvasNode[]): boolean {
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    
    const node = nodes[nodeId];
    if (!node) return false;
    
    currentPath.push(node);
    
    if (nodeId === focusNodeId) {
      path.push(...currentPath);
      return true;
    }
    
    for (const conn of node.connections) {
      if (findPath(conn.targetId, [...currentPath])) {
        return true;
      }
    }
    
    return false;
  }
  
  // Find root nodes (no incoming connections)
  const rootNodes = Object.keys(nodes).filter(nodeId => {
    return !Object.values(nodes).some(n => 
      n.connections.some(c => c.targetId === nodeId)
    );
  });
  
  // Try each root
  for (const rootId of rootNodes) {
    if (findPath(rootId, [])) break;
  }
  
  return path;
}