/**
 * Validation Panel Component
 * 
 * ATTRACTOR: "Structure can be broken"
 * GROUNDING: Users need visibility into structural problems
 * Security: Shows issues that could cause corrupt exports
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { 
  ValidationResult, 
  ValidationIssue, 
  ValidationSeverity, 
  ValidationCategory 
} from '../types/validation';
import { CanvasNode } from '../types/canvas';
import { autoFixIssues, canSafelyExport } from '../utils/validation';

interface ValidationPanelProps {
  validationResult: ValidationResult | null;
  nodes: Record<string, CanvasNode>;
  onAutoFix: (nodes: Record<string, CanvasNode>) => void;
  onSelectNode: (nodeId: string) => void;
}

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  error: 'text-red-400 bg-red-900',
  warning: 'text-amber-400 bg-amber-900',
  info: 'text-blue-400 bg-blue-900',
};

const SEVERITY_ICONS: Record<ValidationSeverity, string> = {
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  structure: 'Structure',
  content: 'Content',
  connections: 'Connections',
  completeness: 'Completeness',
  security: 'Security',
};

export function ValidationPanel({ 
  validationResult, 
  nodes, 
  onAutoFix,
  onSelectNode 
}: ValidationPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<ValidationCategory>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<ValidationSeverity | 'all'>('all');
  
  // Group issues by category
  const issuesByCategory = useMemo(() => {
    if (!validationResult) return {};
    
    const grouped: Record<ValidationCategory, ValidationIssue[]> = {
      structure: [],
      content: [],
      connections: [],
      completeness: [],
      security: [],
    };
    
    validationResult.issues
      .filter(i => selectedSeverity === 'all' || i.severity === selectedSeverity)
      .forEach(issue => {
        grouped[issue.category].push(issue);
      });
    
    return grouped;
  }, [validationResult, selectedSeverity]);
  
  // Auto-fixable issues count
  const autoFixableCount = useMemo(() => {
    if (!validationResult) return 0;
    return validationResult.issues.filter(i => i.autoFixable).length;
  }, [validationResult]);
  
  // Export safety check
  const exportSafety = useMemo(() => {
    if (!validationResult) return { canExport: true, blockers: [] };
    return canSafelyExport(validationResult);
  }, [validationResult]);
  
  const handleAutoFix = useCallback(() => {
    if (!validationResult) return;
    
    const { fixed, nodes: newNodes } = autoFixIssues(nodes, validationResult.issues);
    
    if (fixed.length > 0) {
      onAutoFix(newNodes);
    }
  }, [nodes, validationResult, onAutoFix]);
  
  const toggleCategory = useCallback((category: ValidationCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);
  
  if (!validationResult) {
    return (
      <div className="p-4 text-center text-slate-500">
        <p className="text-sm">No validation results</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white">Validation</h2>
        <p className="text-xs text-slate-500 mt-1">
          {validationResult.summary.errorCount} errors • {validationResult.summary.warningCount} warnings
        </p>
      </div>
      
      {/* Summary */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {validationResult.isValid ? (
            <span className="text-emerald-400">✓ Valid</span>
          ) : (
            <span className="text-red-400">✕ Issues found</span>
          )}
        </div>
        
        {/* Severity filter */}
        <div className="flex gap-1 mt-2">
          {(['all', 'error', 'warning', 'info'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedSeverity === sev
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {sev === 'all' ? 'All' : sev}
            </button>
          ))}
        </div>
      </div>
      
      {/* Export safety warning */}
      {!exportSafety.canExport && (
        <div className="px-4 py-3 bg-red-900 border-b border-red-800">
          <div className="flex items-center gap-2">
            <span className="text-red-400">🚫</span>
            <span className="text-sm text-red-200">Cannot export</span>
          </div>
          <p className="text-xs text-red-300 mt-1">
            Resolve blocking issues before exporting
          </p>
        </div>
      )}
      
      {/* Issues list */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(issuesByCategory).map(([category, issues]) => {
          if (issues.length === 0) return null;
          
          const isExpanded = expandedCategories.has(category as ValidationCategory);
          
          return (
            <div key={category} className="border-b border-slate-800">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category as ValidationCategory)}
                className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {CATEGORY_LABELS[category as ValidationCategory]}
                  </span>
                  <span className="text-xs text-slate-600">
                    {issues.length}
                  </span>
                </div>
                <span className="text-slate-500">
                  {isExpanded ? '−' : '+'}
                </span>
              </button>
              
              {/* Issues */}
              {isExpanded && (
                <div className="px-4 pb-2 space-y-2">
                  {issues.map(issue => (
                    <div
                      key={issue.id}
                      className={`p-2 rounded text-xs cursor-pointer hover:opacity-80 ${
                        SEVERITY_COLORS[issue.severity]
                      }`}
                      onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{SEVERITY_ICONS[issue.severity]}</span>
                        <span className="font-medium">{issue.message}</span>
                      </div>
                      {issue.suggestion && (
                        <p className="mt-1 opacity-80">
                          💡 {issue.suggestion}
                        </p>
                      )}
                      {issue.autoFixable && (
                        <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-white bg-opacity-10">
                          Auto-fixable
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {validationResult.issues.length === 0 && (
          <div className="p-4 text-center">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-sm text-slate-400">No issues found</p>
            <p className="text-xs text-slate-500 mt-1">
              Your document structure is valid
            </p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        {autoFixableCount > 0 && (
          <Button
            onClick={handleAutoFix}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Auto-fix {autoFixableCount} issue{autoFixableCount !== 1 ? 's' : ''}
          </Button>
        )}
        
        <div className="text-xs text-slate-500 text-center">
          Last validated: {new Date(validationResult.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}