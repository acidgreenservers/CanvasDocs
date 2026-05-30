/**
 * Node Editor Panel - Consolidated UI
 * 
 * Visual: Consistent button styling with semantic colors
 * Layout: Extended width for better editing experience
 */

import React, { memo, useCallback } from 'react';
import { CanvasNode, NodeType } from '../types/canvas';
import { useNodeEditor } from '../hooks/useNodeEditor';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const NODE_TYPES: { value: NodeType; label: string; description: string }[] = [
  { value: 'section', label: 'Section', description: 'Major document division' },
  { value: 'heading', label: 'Heading', description: 'Section title' },
  { value: 'paragraph', label: 'Paragraph', description: 'Body text content' },
  { value: 'code', label: 'Code', description: 'Code block' },
  { value: 'list', label: 'List', description: 'Bullet points' },
];

const TYPE_COLORS: Record<NodeType, { bg: string; border: string; text: string; glow: string }> = {
  section: {
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.4)',
    text: '#22c55e',
    glow: '0 0 20px rgba(34, 197, 94, 0.3)',
  },
  heading: {
    bg: 'rgba(59, 110, 248, 0.12)',
    border: 'rgba(59, 110, 248, 0.4)',
    text: '#3b6ef8',
    glow: '0 0 20px rgba(59, 110, 248, 0.3)',
  },
  paragraph: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.4)',
    text: '#8b5cf6',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  },
  code: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
    text: '#f59e0b',
    glow: '0 0 20px rgba(245, 158, 11, 0.3)',
  },
  list: {
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.4)',
    text: '#ec4899',
    glow: '0 0 20px rgba(236, 72, 153, 0.3)',
  },
};

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  follows: '→ follows',
  contains: '⊕ contains',
  references: '↗ references',
};

// Shared button style constants
const BUTTON_STYLES = {
  primary: {
    base: 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
    bg: '#3b6ef8',
    hoverBg: '#2d5ce8',
    shadow: '0 4px 12px rgba(59, 110, 248, 0.3)',
  },
  success: {
    base: 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
    bg: '#22c55e',
    hoverBg: '#16a34a',
    shadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
  },
  danger: {
    base: 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
    bg: '#dc2626',
    hoverBg: '#b91c1c',
    shadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface TypeSelectorProps {
  currentType: NodeType;
  onChange: (type: NodeType) => void;
}

const TypeSelector = memo(function TypeSelector({ currentType, onChange }: TypeSelectorProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#7d8590] mb-2 uppercase tracking-wide">
        Node Type
      </label>
      <div className="grid grid-cols-5 gap-1.5">
        {NODE_TYPES.map(type => {
          const colors = TYPE_COLORS[type.value];
          const isActive = currentType === type.value;
          
          return (
            <button
              key={type.value}
              onClick={() => onChange(type.value)}
              className={`relative px-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'text-white hover:-translate-y-0.5'
                  : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#e6edf3] border border-transparent'
              }`}
              style={isActive ? {
                background: colors.bg,
                borderColor: colors.border,
                border: '1px solid',
                boxShadow: colors.glow,
                color: colors.text,
              } : undefined}
              title={type.description}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

interface ConnectionListProps {
  connections: CanvasNode['connections'];
  nodes: Record<string, CanvasNode>;
}

const ConnectionList = memo(function ConnectionList({ connections, nodes }: ConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div className="text-xs text-[#6e7681] italic px-3 py-2">
        No connections yet. Click the + button on another node to connect.
      </div>
    );
  }
  
  return (
    <div className="space-y-1.5">
      {connections.map((conn, index) => {
        const targetNode = nodes[conn.targetId];
        const targetTitle = targetNode?.title || 'Unknown Node';
        const targetColor = TYPE_COLORS[targetNode?.type || 'paragraph'];
        const connLabel = CONNECTION_TYPE_LABELS[conn.type] || '→';
        
        return (
          <div
            key={`${conn.targetId}-${index}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1c2128] border border-[#30363d] hover:border-[#484f58] transition-colors"
          >
            <span className="text-[10px] text-[#6e7681] font-mono">{connLabel}</span>
            <span
              className="text-[11px] font-medium truncate flex-1"
              style={{ color: targetColor.text }}
            >
              {targetTitle}
            </span>
            <span className="text-[9px] text-[#6e7681] font-mono opacity-60">
              {conn.targetId.slice(0, 6)}
            </span>
          </div>
        );
      })}
    </div>
  );
});

interface SaveIndicatorProps {
  isDirty: boolean;
  isValid: boolean;
  lastSyncedAt: number | null;
}

const SaveIndicator = memo(function SaveIndicator({ isDirty, isValid, lastSyncedAt }: SaveIndicatorProps) {
  if (!isValid) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-[#f87171]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse" />
        Validation error
      </span>
    );
  }
  
  if (isDirty) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-[#f59e0b]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
        Saving...
      </span>
    );
  }
  
  if (lastSyncedAt) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-[#22c55e]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        Saved
      </span>
    );
  }
  
  return null;
});

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface NodeEditorProps {
  node: CanvasNode | null;
  allNodes: Record<string, CanvasNode>;
  onUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  onDelete: (id: string) => void;
  onAddConnected: (parentId: string, newNode: CanvasNode) => void;
}

export const NodeEditor = memo(function NodeEditor({
  node,
  allNodes,
  onUpdate,
  onDelete,
  onAddConnected,
}: NodeEditorProps) {
  const editor = useNodeEditor({
    node,
    onUpdate,
    debounceMs: 300,
    autoSave: true,
  });
  
  const handleAddConnected = useCallback(() => {
    if (!node) return;
    
    const newNode: CanvasNode = {
      id: crypto.randomUUID(),
      type: 'paragraph',
      title: 'New Node',
      content: '',
      position: { x: node.position.x + 300, y: node.position.y + 50 },
      connections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    onAddConnected(node.id, newNode);
  }, [node, onAddConnected]);
  
  const handleDelete = useCallback(() => {
    if (node && confirm('Delete this node?')) {
      onDelete(node.id);
    }
  }, [node, onDelete]);
  
  if (!editor.hasNode) {
    return (
      <div className="h-full flex items-center justify-center text-[#8b949e] p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-sm font-medium">Select a node to edit</p>
          <p className="text-xs mt-2 text-[#6e7681]">
            Click on any node in the canvas
          </p>
        </div>
      </div>
    );
  }
  
  const typeColors = TYPE_COLORS[editor.type];
  
  return (
    <div className="h-full flex flex-col bg-[#161b22]">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-[#30363d]"
        style={{
          background: `linear-gradient(135deg, ${typeColors.bg}, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 
              className="text-lg font-normal text-[#e6edf3]"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            >
              Edit Node
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ 
                  color: typeColors.text,
                  background: typeColors.bg,
                }}
              >
                {editor.type}
              </span>
              <SaveIndicator
                isDirty={editor.isDirty}
                isValid={editor.isValid}
                lastSyncedAt={editor.lastSyncedAt}
              />
            </div>
          </div>
          <span className="text-[9px] text-[#6e7681] font-mono bg-[#21262d] px-2 py-1 rounded">
            {editor.nodeId?.slice(0, 8)}
          </span>
        </div>
      </div>
      
      {/* Validation errors */}
      {editor.errors.length > 0 && (
        <div className="px-5 py-2 bg-[rgba(248,113,113,0.08)] border-b border-[rgba(248,113,113,0.2)]">
          {editor.errors.map((error, i) => (
            <p key={i} className="text-[11px] text-[#f87171]">{error}</p>
          ))}
        </div>
      )}
      
      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Type selector */}
        <TypeSelector currentType={editor.type} onChange={editor.setType} />
        
        {/* Title */}
        <div>
          <label className="block text-[11px] font-semibold text-[#7d8590] mb-2 uppercase tracking-wide">
            Title
          </label>
          <input
            type="text"
            value={editor.title}
            onChange={(e) => editor.setTitle(e.target.value)}
            placeholder="Enter title..."
            className="w-full px-3 py-2.5 rounded-lg bg-[#1c2128] border border-[#30363d] text-[#e6edf3] text-sm focus:border-[#3b6ef8] focus:outline-none focus:ring-1 focus:ring-[#3b6ef8] transition-colors placeholder:text-[#6e7681]"
          />
        </div>
        
        {/* Content */}
        <div>
          <label className="block text-[11px] font-semibold text-[#7d8590] mb-2 uppercase tracking-wide">
            Content
          </label>
          <textarea
            value={editor.content}
            onChange={(e) => editor.setContent(e.target.value)}
            placeholder="Enter content..."
            className="w-full px-3 py-2.5 rounded-lg bg-[#1c2128] border border-[#30363d] text-[#e6edf3] text-sm focus:border-[#3b6ef8] focus:outline-none focus:ring-1 focus:ring-[#3b6ef8] transition-colors resize-none min-h-32 placeholder:text-[#6e7681]"
            rows={6}
          />
        </div>
        
        {/* Connections */}
        <div>
          <label className="block text-[11px] font-semibold text-[#7d8590] mb-2 uppercase tracking-wide">
            Connections ({node?.connections.length || 0})
          </label>
          <ConnectionList connections={node?.connections || []} nodes={allNodes} />
        </div>
        
        {/* Metadata */}
        {node && (
          <div className="pt-4 border-t border-[#30363d]">
            <label className="block text-[11px] font-semibold text-[#7d8590] mb-2 uppercase tracking-wide">
              Metadata
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 rounded-lg bg-[#1c2128] border border-[#30363d]">
                <span className="text-[9px] text-[#6e7681] uppercase block mb-0.5">Created</span>
                <span className="text-[10px] text-[#8b949e] font-mono">
                  {new Date(node.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#1c2128] border border-[#30363d]">
                <span className="text-[9px] text-[#6e7681] uppercase block mb-0.5">Modified</span>
                <span className="text-[10px] text-[#8b949e] font-mono">
                  {new Date(node.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Actions - Consistent button styling */}
      <div className="p-5 border-t border-[#30363d] space-y-3">
        {/* Add Connected Node - Success/Green style */}
        <button
          onClick={handleAddConnected}
          className={BUTTON_STYLES.success.base}
          style={{
            background: BUTTON_STYLES.success.bg,
            boxShadow: BUTTON_STYLES.success.shadow,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BUTTON_STYLES.success.hoverBg;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BUTTON_STYLES.success.bg;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>⚡</span>
          <span>Add Connected Node</span>
        </button>
        
        {/* Delete Node - Danger/Red style */}
        <button
          onClick={handleDelete}
          className={BUTTON_STYLES.danger.base}
          style={{
            background: BUTTON_STYLES.danger.bg,
            boxShadow: BUTTON_STYLES.danger.shadow,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BUTTON_STYLES.danger.hoverBg;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BUTTON_STYLES.danger.bg;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>🗑</span>
          <span>Delete Node</span>
        </button>
      </div>
    </div>
  );
});