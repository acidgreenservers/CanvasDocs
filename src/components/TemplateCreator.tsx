/**
 * Template Creator Component
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Users can save learned patterns as reusable templates
 * Security: All content validated before template creation
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CanvasNode } from '../types/canvas';
import { NodeTemplate, TemplateCategory } from '../types/templates';
import { createTemplateFromNodes } from '../utils/templateInstantiation';

interface TemplateCreatorProps {
  nodes: Record<string, CanvasNode>;
  selectedNodeIds: string[];
  onSave: (template: NodeTemplate) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'section', label: 'Section' },
  { value: 'block', label: 'Block' },
  { value: 'custom', label: 'Custom' },
];

export function TemplateCreator({ 
  nodes, 
  selectedNodeIds, 
  onSave, 
  onClose 
}: TemplateCreatorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get selected nodes
  const selectedNodes = selectedNodeIds
    .map(id => nodes[id])
    .filter((n): n is CanvasNode => n !== undefined);
  
  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    
    if (selectedNodes.length === 0) {
      setError('No nodes selected');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      const template = await createTemplateFromNodes(
        selectedNodes,
        name.trim(),
        description.trim(),
        category
      );
      
      onSave(template);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsCreating(false);
    }
  }, [selectedNodes, name, description, category, onSave, onClose]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Create Template</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save {selectedNodes.length} selected nodes as a reusable template
          </p>
        </div>
        
        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Template Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., RFC Section"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this template create?"
              className="bg-slate-700 border-slate-600 text-white"
              rows={2}
            />
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Category
            </label>
            <div className="flex gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCategory(opt.value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    category === opt.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Preview */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Preview</h4>
            <div className="space-y-1">
              {selectedNodes.slice(0, 3).map(node => (
                <div key={node.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-300">{node.title}</span>
                </div>
              ))}
              {selectedNodes.length > 3 && (
                <div className="text-xs text-slate-500">
                  +{selectedNodes.length - 3} more nodes
                </div>
              )}
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="p-2 bg-red-900 rounded text-xs text-red-200">
              {error}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            variant="primary"
          >
            {isCreating ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}