/**
 * Focus Mode Type Definitions
 * 
 * ATTRACTOR: "Structure has depth"
 * GROUNDING: Complex structures need filtered views; focus reveals sub-structure
 * Security: Focus mode isolates view without modifying actual state
 */

import { CanvasNode } from './canvas';

// Focus direction (which connections to include)
export type FocusDirection = 
  | 'downstream'    // Only nodes reachable FROM focus node
  | 'upstream'      // Only nodes that can reach the focus node
  | 'both';         // Both upstream and downstream

// Focus depth limit
export interface FocusDepth {
  maxUpstream: number;    // Max levels to traverse upstream (0 = infinite)
  maxDownstream: number;  // Max levels to traverse downstream (0 = infinite)
}

// Focus mode configuration
export interface FocusConfig {
  enabled: boolean;
  focusNodeId: string | null;
  direction: FocusDirection;
  depth: FocusDepth;
  
  // Visual settings
  fadeDisconnected: boolean;  // Fade vs hide disconnected nodes
  highlightPath: boolean;    // Highlight connection path to focus node
  showDepthLabels: boolean;  // Show depth labels on nodes
}

// Computed focus state
export interface FocusState {
  config: FocusConfig;
  
  // Computed visibility
  visibleNodeIds: Set<string>;
  fadedNodeIds: Set<string>;
  hiddenNodeIds: Set<string>;
  
  // Depth mapping (nodeId -> depth from focus)
  nodeDepths: Map<string, number>;
  
  // Path highlighting
  highlightedConnectionIds: Set<string>;
  
  // Statistics
  stats: {
    totalNodes: number;
    visibleNodes: number;
    hiddenNodes: number;
    maxDepth: number;
  };
}

// Focus history entry (for navigation)
export interface FocusHistoryEntry {
  nodeId: string;
  timestamp: number;
  config: FocusConfig;
}

// Default focus configuration
export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  enabled: false,
  focusNodeId: null,
  direction: 'both',
  depth: {
    maxUpstream: 0,
    maxDownstream: 0,
  },
  fadeDisconnected: true,
  highlightPath: true,
  showDepthLabels: false,
};

// Focus preset configurations
export const FOCUS_PRESETS: Record<string, Partial<FocusConfig>> = {
  'subtree': {
    direction: 'downstream',
    depth: { maxUpstream: 0, maxDownstream: 0 },
    highlightPath: true,
  },
  'ancestors': {
    direction: 'upstream',
    depth: { maxUpstream: 0, maxDownstream: 0 },
    highlightPath: true,
  },
  'immediate': {
    direction: 'both',
    depth: { maxUpstream: 1, maxDownstream: 1 },
    fadeDisconnected: true,
  },
  'full-context': {
    direction: 'both',
    depth: { maxUpstream: 0, maxDownstream: 0 },
    fadeDisconnected: false,
  },
};