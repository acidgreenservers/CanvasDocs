/**
 * Enhanced Connection Line with Type Visualization
 * 
 * ATTRACTOR: "Relationships have semantics"
 * GROUNDING: Different connection types need different visual representations
 */

import React from 'react';
import { ConnectionType, CONNECTION_TYPE_COLORS } from '../types/canvas';

interface EnhancedConnectionLineProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  connectionType: ConnectionType;
  isSelected?: boolean;
  showLabel?: boolean;
}

const CONNECTION_PATTERNS: Record<ConnectionType, { dashArray: string; markerEnd: string }> = {
  'follows': { dashArray: 'none', markerEnd: 'url(#arrow-follows)' },
  'depends-on': { dashArray: '8,4', markerEnd: 'url(#arrow-depends)' },
  'contradicts': { dashArray: '4,4', markerEnd: 'url(#cross)' },
  'extends': { dashArray: 'none', markerEnd: 'url(#arrow-extends)' },
  'references': { dashArray: '2,4', markerEnd: 'url(#arrow-references)' },
};

export function EnhancedConnectionLine({
  startX,
  startY,
  endX,
  endY,
  connectionType,
  isSelected,
  showLabel = false,
}: EnhancedConnectionLineProps) {
  const color = CONNECTION_TYPE_COLORS[connectionType];
  const pattern = CONNECTION_PATTERNS[connectionType];
  
  // Calculate control points for smooth bezier curve
  const midX = (startX + endX) / 2;
  const controlOffset = Math.abs(endX - startX) / 3;
  
  const path = `
    M ${startX} ${startY}
    C ${startX + controlOffset} ${startY},
      ${endX - controlOffset} ${endY},
      ${endX} ${endY}
  `;
  
  // Calculate label position
  const labelX = midX;
  const labelY = (startY + endY) / 2 - 10;
  
  return (
    <g>
      {/* Glow effect for selected */}
      {isSelected && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.3"
        />
      )}
      
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? '#ffffff' : color}
        strokeWidth={isSelected ? '3' : '2'}
        strokeLinecap="round"
        strokeDasharray={pattern.dashArray}
        className="transition-all duration-200"
      />
      
      {/* End marker */}
      <circle
        cx={endX}
        cy={endY}
        r={isSelected ? '6' : '4'}
        fill={color}
        stroke={isSelected ? '#ffffff' : 'none'}
        strokeWidth={isSelected ? '2' : '0'}
      />
      
      {/* Type indicator at midpoint */}
      {showLabel && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x="-20"
            y="-8"
            width="40"
            height="16"
            rx="4"
            fill="#1e293b"
            stroke={color}
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize="8"
            fontWeight="500"
          >
            {connectionType}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * SVG Definitions for connection markers
 * Must be included in the SVG container
 */
export function ConnectionMarkerDefs() {
  return (
    <defs>
      {/* Arrow markers for each type */}
      {Object.entries(CONNECTION_TYPE_COLORS).map(([type, color]) => (
        <marker
          key={`arrow-${type}`}
          id={`arrow-${type}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      ))}
      
      {/* Cross marker for contradicts */}
      <marker
        id="cross"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="8"
        markerHeight="8"
      >
        <path d="M 2 2 L 8 8 M 8 2 L 2 8" stroke="#ef4444" strokeWidth="2" />
      </marker>
    </defs>
  );
}