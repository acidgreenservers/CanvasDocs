/**
 * Zone Transition Dialog
 * 
 * ATTRACTOR: "Space has meaning"
 * GROUNDING: Explicit user action required for zone transitions
 * Security: Enforces transition rules and permissions
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { CanvasZone, ZONE_TYPE_CONFIGS } from '../types/zones';
import { CanvasNode } from '../types/canvas';

interface ZoneTransitionDialogProps {
  node: CanvasNode;
  fromZone: CanvasZone | null;
  toZone: CanvasZone | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ZoneTransitionDialog({
  node,
  fromZone,
  toZone,
  onConfirm,
  onCancel,
}: ZoneTransitionDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  
  const fromConfig = fromZone ? ZONE_TYPE_CONFIGS[fromZone.type] : null;
  const toConfig = toZone ? ZONE_TYPE_CONFIGS[toZone.type] : null;
  
  const isLockedTransition = toZone?.permission === 'locked';
  const isBackward = fromZone && toZone && toZone.order < fromZone.order;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Zone Transition</h2>
          <p className="text-xs text-slate-500 mt-1">
            Moving node across zone boundary
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Node info */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">Node</div>
            <div className="text-sm font-medium text-white">{node.title}</div>
          </div>
          
          {/* Transition visualization */}
          <div className="flex items-center justify-center gap-4">
            {/* From zone */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center mb-2"
                style={{ 
                  backgroundColor: fromZone ? `${fromZone.color}33` : '#334155',
                  border: `2px solid ${fromZone?.color || '#475569'}`,
                }}
              >
                <span className="text-2xl">
                  {fromConfig?.label?.charAt(0) || '?'}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {fromZone?.name || 'Canvas'}
              </div>
            </div>
            
            {/* Arrow */}
            <div className="text-slate-500">
              →
            </div>
            
            {/* To zone */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center mb-2"
                style={{ 
                  backgroundColor: toZone ? `${toZone.color}33` : '#334155',
                  border: `2px solid ${toZone?.color || '#475569'}`,
                }}
              >
                <span className="text-2xl">
                  {toConfig?.label?.charAt(0) || '?'}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {toZone?.name || 'Canvas'}
              </div>
            </div>
          </div>
          
          {/* Warnings */}
          {isLockedTransition && (
            <div className="p-3 bg-red-900 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-400">🔒</span>
                <span className="text-sm text-red-200">
                  Destination zone is locked
                </span>
              </div>
              <p className="text-xs text-red-300 mt-1">
                Nodes in locked zones cannot be edited. This action cannot be undone.
              </p>
            </div>
          )}
          
          {isBackward && (
            <div className="p-3 bg-amber-900 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">⚠️</span>
                <span className="text-sm text-amber-200">
                  Moving backwards in workflow
                </span>
              </div>
              <p className="text-xs text-amber-300 mt-1">
                This will move the node from "{fromZone?.name}" back to "{toZone?.name}".
              </p>
            </div>
          )}
          
          {/* Confirmation checkbox for locked zones */}
          {isLockedTransition && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700"
              />
              <span className="text-sm text-slate-300">
                I understand this action cannot be undone
              </span>
            </label>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <Button
            onClick={onCancel}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLockedTransition && !confirmed}
            className={`text-white ${
              isLockedTransition && !confirmed
                ? 'bg-slate-600 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            Move Node
          </Button>
        </div>
      </div>
    </div>
  );
}