/**
 * Export Panel Component
 * 
 * Feature: Unified export interface supporting multiple formats
 * Security: All exports are sanitized
 * Design: ShadowSign design system
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { CanvasNode } from '../types/canvas';
import { ExportFormat, ExportOptions, DEFAULT_EXPORT_OPTIONS } from '../types/export';
import { generateMarkdown, generateJson } from '../utils/markdown';
import { generateHtmlExport } from '../utils/htmlExportGenerator';

interface ExportPanelProps {
  nodes: Record<string, CanvasNode>;
  selectedNodeIds: string[];
  onClose: () => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string; description: string }[] = [
  { value: 'html', label: 'HTML', icon: '🌐', description: 'Styled, self-contained document' },
  { value: 'markdown', label: 'Markdown', icon: '📝', description: 'Plain text with formatting' },
  { value: 'json', label: 'JSON', icon: '{ }', description: 'Structured data export' },
];

export function ExportPanel({ nodes, selectedNodeIds, onClose }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('html');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [showDepthLabels, setShowDepthLabels] = useState(true);
  const [exportedContent, setExportedContent] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  
  // Filter nodes based on selection
  const exportNodes = useMemo(() => {
    if (selectedNodeIds.length === 0) return nodes;
    
    const filtered: Record<string, CanvasNode> = {};
    selectedNodeIds.forEach(id => {
      if (nodes[id]) filtered[id] = nodes[id];
    });
    return filtered;
  }, [nodes, selectedNodeIds]);
  
  const stats = useMemo(() => {
    const nodeCount = Object.keys(exportNodes).length;
    const connectionCount = Object.values(exportNodes).reduce(
      (sum, node) => sum + node.connections.filter(c => c.targetId in exportNodes).length,
      0
    );
    return { nodeCount, connectionCount };
  }, [exportNodes]);
  
  const handleExport = useCallback(() => {
    let content: string;
    
    switch (format) {
      case 'html':
        const htmlResult = generateHtmlExport(exportNodes, {
          title: 'CanvasDocs Export',
          description: 'Structured document export from CanvasDocs',
          theme: 'dark',
          includeStyles: true,
          includeMetadata,
          showConnectionLines: true,
          showDepthIndicators: showDepthLabels,
        });
        content = htmlResult.content;
        break;
        
      case 'markdown':
        content = generateMarkdown(exportNodes, selectedNodeIds, includeMetadata);
        break;
        
      case 'json':
        content = generateJson(exportNodes, selectedNodeIds);
        break;
        
      default:
        return;
    }
    
    setExportedContent(content);
  }, [format, exportNodes, selectedNodeIds, includeMetadata, showDepthLabels]);
  
  const handleDownload = useCallback(() => {
    if (!exportedContent) return;
    
    const extensions: Record<ExportFormat, string> = {
      html: 'html',
      markdown: 'md',
      json: 'json',
    };
    
    const blob = new Blob([exportedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-export.${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportedContent, format]);
  
  const handleCopy = useCallback(() => {
    if (!exportedContent) return;
    navigator.clipboard.writeText(exportedContent);
  }, [exportedContent]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#161b22] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-[#30363d]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between">
          <div>
            <h2 
              className="text-xl font-normal text-[#e6edf3]"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              Export Canvas
            </h2>
            <p className="text-[10px] text-[#7d8590] font-mono mt-1 uppercase tracking-wider">
              {stats.nodeCount} nodes · {stats.connectionCount} connections
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        
        {/* Format selector */}
        <div className="px-6 py-4 border-b border-[#30363d]">
          <label className="block text-[11px] font-semibold text-[#7d8590] mb-3 uppercase tracking-wide">
            Export Format
          </label>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  format === opt.value
                    ? 'bg-[#3b6ef8] text-white'
                    : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] border border-[#30363d]'
                }`}
                style={format === opt.value ? { boxShadow: '0 4px 12px rgba(59, 110, 248, 0.3)' } : undefined}
              >
                <span className="block text-lg mb-1">{opt.icon}</span>
                <span className="block">{opt.label}</span>
                <span className="block text-[10px] opacity-70 mt-1">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Options */}
        <div className="px-6 py-4 border-b border-[#30363d] space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="w-4 h-4 rounded border-[#30363d] bg-[#1c2128] text-[#3b6ef8] focus:ring-[#3b6ef8] focus:ring-offset-0"
            />
            <span className="text-sm text-[#8b949e] group-hover:text-[#e6edf3] transition-colors">
              Include metadata (IDs, timestamps)
            </span>
          </label>
          
          {format === 'html' && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={showDepthLabels}
                onChange={(e) => setShowDepthLabels(e.target.checked)}
                className="w-4 h-4 rounded border-[#30363d] bg-[#1c2128] text-[#3b6ef8] focus:ring-[#3b6ef8] focus:ring-offset-0"
              />
              <span className="text-sm text-[#8b949e] group-hover:text-[#e6edf3] transition-colors">
                Show depth indicators
              </span>
            </label>
          )}
        </div>
        
        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          {exportedContent ? (
            <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wide">
                  Preview
                </span>
                <span className="text-[10px] font-mono text-[#6e7681]">
                  {(exportedContent.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <pre className="p-4 text-xs text-[#8b949e] font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
                {exportedContent.slice(0, 5000)}
                {exportedContent.length > 5000 && '\n\n... (truncated for preview)'}
              </pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#6e7681]">
              <div className="text-center">
                <div className="text-4xl mb-4">📤</div>
                <p className="text-sm">Click "Generate" to preview export</p>
                <p className="text-xs mt-2 text-[#6e7681]">
                  {format === 'html' ? 'Styled HTML document' : format === 'markdown' ? 'Plain text markdown' : 'JSON data'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wide">
              {format.toUpperCase()} Export
            </span>
            <span className="text-[10px] text-[#22c55e]">●</span>
            <span className="text-[10px] font-mono text-[#6e7681]">Local Only</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              className="bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d]"
            >
              Generate
            </Button>
            {exportedContent && (
              <>
                <Button
                  onClick={handleCopy}
                  className="bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d]"
                >
                  Copy
                </Button>
                <Button
                  onClick={handleDownload}
                  className="bg-[#3b6ef8] hover:bg-[#2d5ce8] text-white"
                  style={{ boxShadow: '0 4px 12px rgba(59, 110, 248, 0.3)' }}
                >
                  ⚡ Download
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}