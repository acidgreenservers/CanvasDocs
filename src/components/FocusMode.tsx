/**
 * Focus Mode Component
 * 
 * ATTRACTOR: "Structure has depth"
 * GROUNDING: Complex structures need filtered views; focus reveals sub-structure
 * Security: Focus mode only reveals what's reachable - no unauthorized access to hidden nodes
 */

import React from 'react';
import { CanvasNode } from '../types/canvas';

interface FocusModeProps {
  nodes: Record<string, CanvasNode>;
  focusedNodeId: string | null;
  reachableNodeIds: Set<string>;
  onFocusNode: (nodeId: string | null) => void;
  onExpandFocus: () => void;
}

export function FocusMode({ 
  nodes, 
  focusedNodeId, 
  reachableNodeIds, 
  onFocusNode, 
  onExpandFocus 
}: FocusModeProps) {
  if (!focusedNodeId) return null;
  
  const focusedNode = nodes[focusedNodeId];
  const totalNodes = Object.keys(nodes).length;
  const visibleNodes = reachableNodeIds.size;
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-slate-800 border border-emerald-500 rounded-lg px-4 py-3 shadow-xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400">Focus:</span>
          <span className="text-sm font-medium text-white">
            {focusedNode?.title || 'Unknown'}
          </span>
        </div>
        
        <div className="h-4 w-px bg-slate-600" />
        
        <div className="text-xs text-slate-400">
          Showing {visibleNodes} of {totalNodes} nodes
        </div>
        
        <button
          onClick={onExpandFocus}
          className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
        >
          Expand 1 level
        </button>
        
        <button
          onClick={() => onFocusNode(null)}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-white"
        >
          Exit Focus
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to compute reachable nodes from a focus point
 * Security: Bounds the search to prevent resource exhaustion
 */
export function useFocusReachableNodes(
  nodes: Record<string, CanvasNode>,
  focusedNodeId: string | null,
  maxDepth: number = 3
): Set<string> {
  const reachable = React.useMemo(() => {
    if (!focusedNodeId || !nodes[focusedNodeId]) {
      return new Set<string>(Object.keys(nodes));
    }
    
    const result = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: focusedNodeId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (result.has(id) || depth > maxDepth) continue;
      result.add(id);
      
      const node = nodes[id];
      if (!node) continue;
      
      // Follow outgoing connections
      node.connections.forEach(conn => {
        if (!result.has(conn.targetId)) {
          queue.push({ id: conn.targetId, depth: depth + 1 });
        }
      });
      
      // Follow incoming connections (nodes that point to this one)
      Object.values(nodes).forEach(n => {
        if (n.connections.some(c => c.targetId === id) && !result.has(n.id)) {
          queue.push({ id: n.id, depth: depth + 1 });
        }
      });
    }
    
    return result;
  }, [nodes, focusedNodeId, maxDepth]);
  
  return reachable;
}