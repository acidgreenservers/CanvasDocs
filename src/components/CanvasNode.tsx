/**
 * Canvas Node Component - Optimized
 * 
 * Performance: Memoized callbacks, stable references
 * Security: Content validation before render
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { CanvasNode as CanvasNodeType } from '../types/canvas';
import { validateContent } from '../utils/security';

interface CanvasNodeProps {
  node: CanvasNodeType;
  isSelected: boolean;
  isConnecting: boolean;
  isFaded?: boolean;
  showDepth?: boolean;
  depth?: number | null;
  onSelect: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onConnectionStart: (id: string, type?: ConnectionType) => void;
  onConnectionEnd: (id: string) => void;
}

// Node styles - static, defined outside component
const NODE_STYLES: Record<string, { border: string; accent: string; labelColor: string }> = {
  section: { border: 'border-[#22c55e]', accent: 'bg-[#22c55e]', labelColor: '#22c55e' },
  heading: { border: 'border-[#3b6ef8]', accent: 'bg-[#3b6ef8]', labelColor: '#3b6ef8' },
  paragraph: { border: 'border-[#8b5cf6]', accent: 'bg-[#8b5cf6]', labelColor: '#8b5cf6' },
  code: { border: 'border-[#f59e0b]', accent: 'bg-[#f59e0b]', labelColor: '#f59e0b' },
  list: { border: 'border-[#ec4899]', accent: 'bg-[#ec4899]', labelColor: '#ec4899' },
};

const NODE_TYPE_LABELS: Record<string, string> = {
  section: 'SECTION',
  heading: 'HEADING',
  paragraph: 'PARAGRAPH',
  code: 'CODE',
  list: 'LIST',
};

import { CONNECTION_TYPE_LABELS, CONNECTION_TYPE_COLORS, ConnectionType } from '../types/canvas';

const CONNECTION_TYPE_OPTIONS: { type: ConnectionType; label: string; icon: string; color: string }[] = [
  { type: 'follows' as ConnectionType, label: 'Follows', icon: '↓', color: CONNECTION_TYPE_COLORS.follows },
  { type: 'extends' as ConnectionType, label: 'Extends', icon: '⊕', color: CONNECTION_TYPE_COLORS.extends },
  { type: 'depends-on' as ConnectionType, label: 'Depends On', icon: '⊳', color: CONNECTION_TYPE_COLORS['depends-on'] },
  { type: 'contradicts' as ConnectionType, label: 'Contradicts', icon: '⊘', color: CONNECTION_TYPE_COLORS.contradicts },
  { type: 'references' as ConnectionType, label: 'References', icon: '↗', color: CONNECTION_TYPE_COLORS.references },
];

export const CanvasNodeComponent = memo(function CanvasNodeComponent({
  node,
  isSelected,
  isConnecting,
  isFaded = false,
  showDepth = false,
  depth = null,
  onSelect,
  onDragStart,
  onConnectionStart,
  onConnectionEnd,
}: CanvasNodeProps) {
  const [showConnMenu, setShowConnMenu] = useState(false);
  // Memoize styles lookup
  const styles = NODE_STYLES[node.type] || NODE_STYLES.paragraph;
  const typeLabel = NODE_TYPE_LABELS[node.type] || 'NODE';
  
  // Memoize validated content
  const { title, content } = useMemo(() => {
    const titleVal = validateContent(node.title);
    const contentVal = validateContent(node.content);
    return {
      title: titleVal.sanitizedContent || 'Untitled',
      content: contentVal.sanitizedContent || 'No content',
    };
  }, [node.title, node.content]);
  
  // Stable event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !e.shiftKey) {
      onDragStart(node.id, e);
    }
  }, [node.id, onDragStart]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnecting) {
      onConnectionEnd(node.id);
    } else {
      onSelect(node.id);
    }
  }, [node.id, isConnecting, onSelect, onConnectionEnd]);
  
  const handleConnectionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConnMenu(prev => !prev);
  }, []);
  
  const handleConnTypeSelect = useCallback((type: ConnectionType) => {
    setShowConnMenu(false);
    onConnectionStart(node.id, type);
  }, [node.id, onConnectionStart]);
  
  const handleConnMenuClose = useCallback(() => {
    setShowConnMenu(false);
  }, []);
  
  // Memoize connection count text
  const connectionText = useMemo(() => {
    const count = node.connections.length;
    return `→ ${count} connection${count !== 1 ? 's' : ''}`;
  }, [node.connections.length]);
  
  // Memoize style object
  const cardStyle = useMemo(() => ({
    left: node.position.x,
    top: node.position.y,
    background: '#161b22',
    boxShadow: isSelected 
      ? '0 4px 24px rgba(59, 110, 248, 0.3)' 
      : '0 4px 24px rgba(0,0,0,0.4)',
    opacity: isFaded ? 0.4 : 1,
  }), [node.position.x, node.position.y, isSelected, isFaded]);
  
  return (
    <div
      className={`absolute w-64 rounded-lg border-2 cursor-move transition-opacity duration-200 select-none ${
        styles.border
      } ${isSelected ? 'ring-2 ring-offset-2 ring-offset-[#0d1117] ring-[#3b6ef8]' : ''} ${
        isConnecting ? 'hover:ring-2 hover:ring-[#22c55e]' : ''
      }`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className={`h-1.5 rounded-t-md ${styles.accent}`} />
      
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <span 
          className="text-[11px] font-semibold tracking-wide"
          style={{ fontFamily: "'SFMono-Regular', monospace", color: styles.labelColor }}
        >
          {typeLabel}
        </span>
        
        <div className="flex items-center gap-2">
          {showDepth && depth !== null && (
            <span className="text-[10px] text-[#6e7681] font-mono">D{depth}</span>
          )}
          
          <div className="relative">
            <button
              onClick={handleConnectionClick}
              className="w-5 h-5 rounded-full bg-[#21262d] hover:bg-[#3b6ef8] 
                         flex items-center justify-center transition-colors border border-[#30363d]
                         hover:border-[#3b6ef8]"
              title="Start connection"
            >
              <span className="text-[10px] text-[#8b949e]">+</span>
            </button>
            
            {showConnMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={handleConnMenuClose}
                />
                <div className="absolute right-0 top-7 z-50 w-40 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl overflow-hidden">
                  {CONNECTION_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.type}
                      onClick={() => handleConnTypeSelect(opt.type)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#e6edf3] hover:bg-[#21262d] transition-colors"
                    >
                      <span style={{ color: opt.color }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="text-sm font-semibold text-[#e6edf3] mb-2 truncate">{title}</h3>
        <p className="text-xs text-[#8b949e] line-clamp-3 leading-relaxed">{content}</p>
      </div>
      
      {node.connections.length > 0 && (
        <div className="px-3 pb-2">
          <span className="text-[10px] text-[#6e7681] font-mono">{connectionText}</span>
        </div>
      )}
    </div>
  );
});