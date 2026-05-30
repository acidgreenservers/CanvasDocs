/**
 * Connection Line Component
 * Renders SVG connections between nodes
 */

import React from 'react';

interface ConnectionLineProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelected?: boolean;
}

export function ConnectionLine({ startX, startY, endX, endY, isSelected }: ConnectionLineProps) {
  // Calculate control points for smooth bezier curve
  const midX = (startX + endX) / 2;
  const controlOffset = Math.abs(endX - startX) / 3;
  
  const path = `
    M ${startX} ${startY}
    C ${startX + controlOffset} ${startY},
      ${endX - controlOffset} ${endY},
      ${endX} ${endY}
  `;
  
  return (
    <g>
      {/* Shadow for depth */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? '#10b981' : '#64748b'}
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-colors duration-200"
      />
      {/* Arrow head */}
      <circle
        cx={endX}
        cy={endY}
        r="4"
        fill={isSelected ? '#10b981' : '#64748b'}
      />
    </g>
  );
}