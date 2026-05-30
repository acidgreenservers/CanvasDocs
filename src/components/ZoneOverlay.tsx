/**
 * Zone Overlay Component
 * 
 * ATTRACTOR: "Space has meaning"
 * GROUNDING: Visual representation of workflow regions on canvas
 * Security: Shows zone boundaries and permissions
 */

import React from 'react';
import { CanvasZone, ZONE_TYPE_CONFIGS } from '../types/zones';

interface ZoneOverlayProps {
  zone: CanvasZone;
  isSelected: boolean;
  nodeCount: number;
  onSelect: (zoneId: string) => void;
}

export function ZoneOverlay({ 
  zone, 
  isSelected, 
  nodeCount, 
  onSelect 
}: ZoneOverlayProps) {
  const config = ZONE_TYPE_CONFIGS[zone.type];
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: zone.bounds.x,
        top: zone.bounds.y,
        width: zone.bounds.width,
        height: zone.bounds.height,
      }}
    >
      {/* Zone background */}
      <div
        className="absolute inset-0 rounded-lg border-2 transition-opacity"
        style={{
          backgroundColor: `${zone.color}08`,
          borderColor: isSelected ? zone.color : `${zone.color}40`,
          opacity: isSelected ? 1 : 0.6,
        }}
      />
      
      {/* Zone header */}
      <div
        className="absolute top-0 left-0 right-0 px-3 py-2 flex items-center justify-between pointer-events-auto cursor-pointer"
        onClick={() => onSelect(zone.id)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: zone.color }}
          />
          <span 
            className="text-xs font-medium"
            style={{ color: zone.color }}
          >
            {zone.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {nodeCount} nodes
          </span>
          {zone.permission === 'locked' && (
            <span className="text-xs text-red-400">🔒</span>
          )}
        </div>
      </div>
      
      {/* Zone type indicator */}
      <div
        className="absolute bottom-2 left-3 px-2 py-0.5 rounded text-xs font-medium"
        style={{ 
          backgroundColor: `${zone.color}33`,
          color: zone.color,
        }}
      >
        {config.label}
      </div>
    </div>
  );
}