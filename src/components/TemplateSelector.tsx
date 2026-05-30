/**
 * Template Selector Component
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Users select from validated patterns to create structure
 * Security: Templates are validated before display, integrity verified before use
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NodeTemplate, TemplateCategory, PLACEHOLDER_PATTERN } from '../types/templates';
import { extractPlaceholders } from '../utils/templateSecurity';
import { instantiateTemplate } from '../utils/templateInstantiation';
import { initializeBuiltInTemplates, BUILT_IN_TEMPLATES } from '../data/builtInTemplates';
import { CanvasNode } from '../types/canvas';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface TemplateSelectorProps {
  customTemplates: NodeTemplate[];
  onSelect: (nodes: CanvasNode[]) => void;
  onAddCustomTemplate?: (template: NodeTemplate) => void;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  document: 'Documents',
  section: 'Sections',
  block: 'Blocks',
  custom: 'My Templates',
};

const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  document: '📄',
  section: '📑',
  block: '🧱',
  custom: '⭐',
};

export function TemplateSelector({ 
  customTemplates, 
  onSelect, 
  onAddCustomTemplate 
}: TemplateSelectorProps) {
  const [builtInTemplates, setBuiltInTemplates] = useState<NodeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NodeTemplate | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize built-in templates on mount
  useEffect(() => {
    initializeBuiltInTemplates().then(setBuiltInTemplates);
  }, []);
  
  // Get placeholders when template is selected
  const placeholders = selectedTemplate 
    ? extractPlaceholders(selectedTemplate)
    : new Set<string>();
  
  const handleTemplateClick = useCallback((template: NodeTemplate) => {
    setSelectedTemplate(template);
    setPlaceholderValues({});
    setError(null);
  }, []);
  
  const handlePlaceholderChange = useCallback((key: string, value: string) => {
    setPlaceholderValues(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleInstantiate = useCallback(async () => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const nodes = await instantiateTemplate(selectedTemplate, {
        position: { x: 100, y: 100 },
        placeholderValues,
      });
      
      onSelect(nodes);
      setSelectedTemplate(null);
      setPlaceholderValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create from template');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate, placeholderValues, onSelect]);
  
  const allTemplates = [...builtInTemplates, ...customTemplates];
  
  // Group templates by category
  const templatesByCategory = allTemplates.reduce((acc, template) => {
    const category = template.metadata.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<TemplateCategory, NodeTemplate[]>);
  
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium text-slate-400">Templates</h3>
      
      {/* Template list by category */}
      {!selectedTemplate && (
        <div className="space-y-3">
          {(['document', 'section', 'block', 'custom'] as TemplateCategory[]).map(category => {
            const templates = templatesByCategory[category] || [];
            if (templates.length === 0 && category === 'custom') return null;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span>{CATEGORY_ICONS[category]}</span>
                  <span className="text-xs text-slate-500">{CATEGORY_LABELS[category]}</span>
                </div>
                <div className="space-y-1">
                  {templates.map(template => (
                    <button
                      key={template.metadata.id}
                      onClick={() => handleTemplateClick(template)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-white">
                        {template.metadata.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {template.metadata.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Template detail view */}
      {selectedTemplate && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">
              {selectedTemplate.metadata.name}
            </h4>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ← Back
            </button>
          </div>
          
          <p className="text-xs text-slate-500">
            {selectedTemplate.metadata.description}
          </p>
          
          <div className="text-xs text-slate-600">
            {selectedTemplate.nodes.length} nodes • {selectedTemplate.metadata.category}
          </div>
          
          {/* Placeholder inputs */}
          {placeholders.size > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-slate-400">Customize</h5>
              {[...placeholders].map(key => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <Input
                    value={placeholderValues[key] || ''}
                    onChange={(e) => handlePlaceholderChange(key, e.target.value)}
                    placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                    className="bg-slate-800 border-slate-700 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="p-2 bg-red-900 rounded text-xs text-red-200">
              {error}
            </div>
          )}
          
          {/* Create button */}
          <Button
            onClick={handleInstantiate}
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isLoading ? 'Creating...' : 'Create from Template'}
          </Button>
        </div>
      )}
    </div>
  );
}