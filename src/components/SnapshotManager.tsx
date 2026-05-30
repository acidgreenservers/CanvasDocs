/**
 * Snapshot Manager Component
 * 
 * ATTRACTOR: "Structure evolves"
 * GROUNDING: Users create named snapshots to track document evolution
 * Security: All snapshots are immutable and integrity-verified
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CanvasSnapshot, SnapshotDiff, SnapshotStatus } from '../types/snapshots';
import { CanvasNode } from '../types/canvas';
import { createSnapshot, validateSnapshotName, verifySnapshotIntegrity } from '../utils/snapshotSecurity';

interface SnapshotManagerProps {
  snapshots: Record<string, CanvasSnapshot>;
  nodes: Record<string, CanvasNode>;
  onCreateSnapshot: (snapshot: CanvasSnapshot) => void;
  onRestoreSnapshot: (snapshot: CanvasSnapshot) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onCompareSnapshots: (fromId: string, toId: string) => void;
}

const STATUS_COLORS: Record<SnapshotStatus, string> = {
  active: 'bg-emerald-500',
  archived: 'bg-slate-500',
  corrupted: 'bg-red-500',
};

export function SnapshotManager({
  snapshots,
  nodes,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onCompareSnapshots,
}: SnapshotManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  const handleCreate = useCallback(async () => {
    const nameValidation = validateSnapshotName(name);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid name');
      return;
    }
    
    try {
      const snapshot = await createSnapshot(nodes, name, {
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      
      onCreateSnapshot(snapshot);
      setName('');
      setDescription('');
      setTags('');
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot');
    }
  }, [nodes, name, description, tags, onCreateSnapshot]);
  
  const handleRestore = useCallback(async (snapshot: CanvasSnapshot) => {
    // Verify integrity before restore
    const verification = await verifySnapshotIntegrity(snapshot);
    if (!verification.valid) {
      setError(`Cannot restore: ${verification.errors.join(', ')}`);
      return;
    }
    
    if (confirm('Restore this snapshot? Current changes will be lost.')) {
      onRestoreSnapshot(snapshot);
    }
  }, [onRestoreSnapshot]);
  
  const handleCompareSelect = useCallback((snapshotId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(snapshotId)) {
        return prev.filter(id => id !== snapshotId);
      }
      if (prev.length >= 2) {
        return [prev[1], snapshotId];
      }
      return [...prev, snapshotId];
    });
  }, []);
  
  const handleCompare = useCallback(() => {
    if (selectedForCompare.length === 2) {
      onCompareSnapshots(selectedForCompare[0], selectedForCompare[1]);
      setSelectedForCompare([]);
      setCompareMode(false);
    }
  }, [selectedForCompare, onCompareSnapshots]);
  
  const sortedSnapshots = Object.values(snapshots)
    .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  
  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white">Snapshots</h2>
        <p className="text-xs text-slate-500 mt-1">
          {Object.keys(snapshots).length} version{Object.keys(snapshots).length !== 1 ? 's' : ''} saved
        </p>
      </div>
      
      {/* Create form */}
      {isCreating ? (
        <div className="p-4 border-b border-slate-700 space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Snapshot name..."
            className="bg-slate-800 border-slate-700 text-white"
          />
          
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="bg-slate-800 border-slate-700 text-white min-h-16"
          />
          
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)..."
            className="bg-slate-800 border-slate-700 text-white"
          />
          
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Create
            </Button>
            <Button
              onClick={() => { setIsCreating(false); setError(null); }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-700 space-y-2">
          <Button
            onClick={() => setIsCreating(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Save Snapshot
          </Button>
          
          <Button
            onClick={() => setCompareMode(!compareMode)}
            className={`w-full ${compareMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
          >
            {compareMode ? 'Cancel Compare' : 'Compare Versions'}
          </Button>
        </div>
      )}
      
      {/* Compare actions */}
      {compareMode && selectedForCompare.length === 2 && (
        <div className="p-4 bg-blue-900 border-b border-blue-800">
          <Button
            onClick={handleCompare}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            Compare Selected
          </Button>
        </div>
      )}
      
      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto">
        {sortedSnapshots.map(snapshot => {
          const isSelected = selectedForCompare.includes(snapshot.metadata.id);
          
          return (
            <div
              key={snapshot.metadata.id}
              className={`p-4 border-b border-slate-800 ${
                compareMode ? 'cursor-pointer hover:bg-slate-800' : ''
              } ${isSelected ? 'bg-blue-900' : ''}`}
              onClick={() => compareMode && handleCompareSelect(snapshot.metadata.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${STATUS_COLORS[snapshot.metadata.status]}`}
                    title={snapshot.metadata.status}
                  />
                  <h3 className="text-sm font-medium text-white">
                    {snapshot.metadata.name}
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(snapshot.metadata.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {snapshot.metadata.description && (
                <p className="text-xs text-slate-400 mb-2">
                  {snapshot.metadata.description}
                </p>
              )}
              
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{snapshot.metadata.nodeCount} nodes</span>
                <span>•</span>
                <span>{snapshot.metadata.connectionCount} connections</span>
              </div>
              
              {snapshot.metadata.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {snapshot.metadata.tags.map(tag => (
                    <span 
                      key={tag}
                      className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Hash preview */}
              <div className="mt-2 text-xs text-slate-600 font-mono">
                {snapshot.metadata.contentHash.slice(0, 8)}...
              </div>
              
              {/* Actions */}
              {!compareMode && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRestore(snapshot); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Restore
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSnapshot(snapshot.metadata.id); }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
        
        {sortedSnapshots.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500">No snapshots yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Save a snapshot to track document changes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}