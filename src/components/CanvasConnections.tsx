/**
 * Canvas Connections - Optimized SVG Rendering
 * 
 * Performance: Memoized connection paths, minimal re-renders
 * Uses React.memo to prevent unnecessary re-renders
 */

import React, { memo, useMemo } from 'react';
import { CanvasNode } from '../types/canvas';
import { FocusState } from '../types/focus';

interface ConnectionPathProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isHighlighted: boolean;
  isFaded: boolean;
}

// Individual connection path - memoized
const ConnectionPath = memo(function ConnectionPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  isHighlighted,
  isFaded,
}: ConnectionPathProps) {
  const midX = (sourceX + targetX) / 2;
  const path = `M ${sourceX} ${sourceY} Q ${midX} ${sourceY} ${targetX} ${targetY}`;
  
  return (
    <g opacity={isFaded ? 0.3 : 1}>
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? '#22c55e' : '#475569'}
        strokeWidth={isHighlighted ? 3 : 2}
        className="transition-all duration-200"
      />
      {isHighlighted && (
        <circle cx={targetX} cy={targetY} r="4" fill="#22c55e" />
      )}
    </g>
  );
});

interface CanvasConnectionsProps {
  nodes: Record<string, CanvasNode>;
  focusState: FocusState;
}

// Connection map component - only re-renders when nodes or focus changes
export const CanvasConnections = memo(function CanvasConnections({
  nodes,
  focusState,
}: CanvasConnectionsProps) {
  // Pre-compute all connection data
  const connections = useMemo(() => {
    const result: Array<{
      key: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      isHighlighted: boolean;
      isFaded: boolean;
    }> = [];
    
    const { 
      config: focusConfig, 
      hiddenNodeIds, 
      fadedNodeIds, 
      highlightedConnectionIds 
    } = focusState;
    
    Object.values(nodes).forEach(node => {
      node.connections.forEach(conn => {
        const target = nodes[conn.targetId];
        if (!target) return;
        
        // Skip hidden connections in focus mode
        if (focusConfig.enabled) {
          if (hiddenNodeIds.has(node.id) || hiddenNodeIds.has(conn.targetId)) {
            return;
          }
        }
        
        const isHighlighted = focusConfig.highlightPath && 
          highlightedConnectionIds.has(`${node.id}:${conn.targetId}`);
        
        const isFaded = focusConfig.enabled && 
          (fadedNodeIds.has(node.id) || fadedNodeIds.has(conn.targetId));
        
        result.push({
          key: `${node.id}-${conn.targetId}`,
          sourceX: node.position.x + 256,
          sourceY: node.position.y + 40,
          targetX: target.position.x,
          targetY: target.position.y + 40,
          isHighlighted,
          isFaded,
        });
      });
    });
    
    return result;
  }, [nodes, focusState]);
  
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      {connections.map(conn => (
        <ConnectionPath
          key={conn.key}
          sourceX={conn.sourceX}
          sourceY={conn.sourceY}
          targetX={conn.targetX}
          targetY={conn.targetY}
          isHighlighted={conn.isHighlighted}
          isFaded={conn.isFaded}
        />
      ))}
    </svg>
  );
});