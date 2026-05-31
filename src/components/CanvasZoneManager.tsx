/**
 * Canvas Zone Manager Component
 * 
 * ATTRACTOR: "Space has meaning"
 * GROUNDING: Users manage workflow regions visually
 * Security: Zone operations enforce boundaries
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CanvasZone, ZONE_TYPE_CONFIGS, ZonePermission } from '../types/zones';
import { CanvasNode } from '../types/canvas';
import { createZone, getZoneStats } from '../utils/zoneSecurity';

interface CanvasZoneManagerProps {
  zones: Record<string, CanvasZone>;
  nodes: Record<string, CanvasNode>;
  onCreateZone: (zone: CanvasZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onMoveNodeToZone: (nodeId: string, zoneId: string | null) => void;
}

export function CanvasZoneManager({
  zones,
  nodes,
  onCreateZone,
  onDeleteZone,
}: CanvasZoneManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<CanvasZone['type']>('draft');
  const [error, setError] = useState<string | null>(null);
  
  const handleCreateZone = useCallback(() => {
    if (!newZoneName.trim()) {
      setError('Zone name is required');
      return;
    }
    
    // Calculate position for new zone
    const existingZones = Object.values(zones);
    const lastZone = existingZones.sort((a, b) => b.order - a.order)[0];
    const newX = lastZone ? lastZone.bounds.x + lastZone.bounds.width + 20 : 0;
    
    const config = ZONE_TYPE_CONFIGS[newZoneType];
    
    try {
      const zone = createZone(
        newZoneName.trim(),
        newZoneType,
        { x: newX, y: 0, width: 350, height: 500 },
        {
          color: config.defaultColor,
          permission: config.defaultPermission,
          order: existingZones.length,
        }
      );
      
      onCreateZone(zone);
      setNewZoneName('');
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create zone');
    }
  }, [newZoneName, newZoneType, zones, onCreateZone]);
  
  const sortedZones = Object.values(zones).sort((a, b) => a.order - b.order);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-400">Workflow Zones</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          + Add Zone
        </button>
      </div>
      
      {/* Create new zone form */}
      {isCreating && (
        <div className="p-3 bg-slate-800 rounded-lg space-y-3">
          <Input
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            placeholder="Zone name..."
            className="bg-slate-700 border-slate-600 text-white text-sm"
          />
          
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(ZONE_TYPE_CONFIGS) as CanvasZone['type'][]).map(type => {
              const config = ZONE_TYPE_CONFIGS[type];
              return (
                <button
                  key={type}
                  onClick={() => setNewZoneType(type)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newZoneType === type
                      ? 'text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                  style={newZoneType === type ? { backgroundColor: config.defaultColor } : {}}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
          
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleCreateZone}
              variant="primary"
              size="sm"
              className="flex-1"
            >
              Create
            </Button>
            <Button
              onClick={() => { setIsCreating(false); setError(null); }}
              variant="ghost"
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {/* Zone list */}
      <div className="space-y-2">
        {sortedZones.map(zone => {
          const stats = getZoneStats(zone, nodes);
          const config = ZONE_TYPE_CONFIGS[zone.type];
          
          return (
            <div
              key={zone.id}
              className="p-3 rounded-lg border-l-4"
              style={{ 
                backgroundColor: `${zone.color}15`,
                borderColor: zone.color,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">
                  {zone.name}
                </span>
                <span 
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${zone.color}33`,
                    color: zone.color,
                  }}
                >
                  {config.label}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{stats.nodeCount} nodes</span>
                <span>•</span>
                <span>{stats.connectionCount} connections</span>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-600">
                  Permission:
                </span>
                <span className={`text-xs font-medium ${
                  zone.permission === 'locked' ? 'text-red-400' :
                  zone.permission === 'review' ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {zone.permission}
                </span>
              </div>
              
              <button
                onClick={() => onDeleteZone(zone.id)}
                className="mt-2 text-xs text-slate-500 hover:text-red-400"
              >
                Delete zone
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Empty state */}
      {sortedZones.length === 0 && !isCreating && (
        <div className="text-center py-4">
          <p className="text-xs text-slate-500">No zones created</p>
          <p className="text-xs text-slate-600 mt-1">
            Zones help organize your document workflow
          </p>
        </div>
      )}
      
      {/* Workflow visualization */}
      {sortedZones.length > 1 && (
        <div className="pt-3 border-t border-slate-800">
          <h4 className="text-xs font-medium text-slate-500 mb-2">Workflow</h4>
          <div className="flex items-center gap-1">
            {sortedZones.map((zone, index) => (
              <React.Fragment key={zone.id}>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: zone.color }}
                  title={zone.name}
                />
                {index < sortedZones.length - 1 && (
                  <div className="w-4 h-0.5 bg-slate-700" />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Drag nodes forward through workflow stages
          </p>
        </div>
      )}
    </div>
  );
}