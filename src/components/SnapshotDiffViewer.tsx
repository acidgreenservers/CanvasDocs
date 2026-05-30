/**
 * Snapshot Diff Viewer Component
 * 
 * ATTRACTOR: "Structure evolves"
 * GROUNDING: Visual comparison reveals what changed between versions
 * Security: Shows verification status to ensure trust
 */

import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { SnapshotDiff, DiffViewMode } from '../types/snapshots';
import { CanvasSnapshot } from '../types/snapshots';

interface SnapshotDiffViewerProps {
  diff: SnapshotDiff;
  fromSnapshot: CanvasSnapshot;
  toSnapshot: CanvasSnapshot;
  onClose: () => void;
}

export function SnapshotDiffViewer({
  diff,
  fromSnapshot,
  toSnapshot,
  onClose,
}: SnapshotDiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('summary');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  
  const changeTypeColors = {
    added: 'text-emerald-400 bg-emerald-900',
    removed: 'text-red-400 bg-red-900',
    modified: 'text-amber-400 bg-amber-900',
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Version Comparison</h2>
            <p className="text-xs text-slate-500 mt-1">
              {fromSnapshot.metadata.name} → {toSnapshot.metadata.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Verification status */}
        {!diff.verified && (
          <div className="px-6 py-3 bg-red-900 border-b border-red-800">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-sm text-red-200">Verification Failed</span>
            </div>
            {diff.verificationErrors.map((error, i) => (
              <p key={i} className="text-xs text-red-300 mt-1">{error}</p>
            ))}
          </div>
        )}
        
        {/* Stats summary */}
        <div className="px-6 py-3 border-b border-slate-700 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${changeTypeColors.added}`}>
              +{diff.stats.nodesAdded} nodes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${changeTypeColors.removed}`}>
              -{diff.stats.nodesRemoved} nodes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${changeTypeColors.modified}`}>
              ~{diff.stats.nodesModified} modified
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {diff.stats.totalChanges} total changes
          </div>
        </div>
        
        {/* View mode tabs */}
        <div className="px-6 py-2 border-b border-slate-700 flex gap-2">
          {(['summary', 'detailed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'summary' && (
            <div className="space-y-6">
              {/* Added nodes */}
              {diff.addedNodes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-emerald-400 mb-3">
                    Added Nodes ({diff.addedNodes.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.addedNodes.map(node => (
                      <div key={node.id} className="p-3 bg-emerald-900 rounded-lg">
                        <div className="text-sm font-medium text-white">{node.title}</div>
                        <div className="text-xs text-emerald-300 mt-1">{node.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Removed nodes */}
              {diff.removedNodes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-3">
                    Removed Nodes ({diff.removedNodes.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.removedNodes.map(node => (
                      <div key={node.id} className="p-3 bg-red-900 rounded-lg opacity-60">
                        <div className="text-sm font-medium text-white line-through">{node.title}</div>
                        <div className="text-xs text-red-300 mt-1">{node.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Modified nodes */}
              {diff.modifiedNodes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-400 mb-3">
                    Modified Nodes ({diff.modifiedNodes.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.modifiedNodes.map(({ nodeId, node, changes }) => (
                      <div key={nodeId} className="p-3 bg-amber-900 rounded-lg">
                        <div className="text-sm font-medium text-white">{node.title}</div>
                        <div className="text-xs text-amber-300 mt-2">
                          {changes.length} field{changes.length !== 1 ? 's' : ''} changed
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Connection changes */}
              {(diff.addedConnections.length > 0 || diff.removedConnections.length > 0) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    Connection Changes
                  </h3>
                  <div className="space-y-1">
                    {diff.addedConnections.map((conn, i) => (
                      <div key={`add-${i}`} className="text-xs text-emerald-400">
                        + {conn.sourceId.slice(0, 8)} → {conn.targetId.slice(0, 8)}
                      </div>
                    ))}
                    {diff.removedConnections.map((conn, i) => (
                      <div key={`rem-${i}`} className="text-xs text-red-400">
                        - {conn.sourceId.slice(0, 8)} → {conn.targetId.slice(0, 8)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {viewMode === 'detailed' && (
            <div className="space-y-4">
              {diff.modifiedNodes.map(({ nodeId, node, changes }) => (
                <div key={nodeId} className="border border-slate-700 rounded-lg">
                  <button
                    onClick={() => toggleNode(nodeId)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700"
                  >
                    <span className="text-sm font-medium text-white">{node.title}</span>
                    <span className="text-xs text-slate-500">
                      {expandedNodes.has(nodeId) ? '−' : '+'}
                    </span>
                  </button>
                  
                  {expandedNodes.has(nodeId) && (
                    <div className="px-4 pb-3 space-y-2">
                      {changes.map((change, i) => (
                        <div key={i} className="text-xs">
                          <div className="text-slate-400 mb-1">{change.field}</div>
                          <div className="flex gap-4">
                            <div className="flex-1 p-2 bg-red-900 rounded text-red-200">
                              <span className="text-red-400">− </span>
                              {JSON.stringify(change.oldValue)}
                            </div>
                            <div className="flex-1 p-2 bg-emerald-900 rounded text-emerald-200">
                              <span className="text-emerald-400">+ </span>
                              {JSON.stringify(change.newValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Compared at {new Date(diff.timestamp).toLocaleString()}
          </div>
          <Button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}