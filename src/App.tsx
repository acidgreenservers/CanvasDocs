/**
 * CanvasDocs - Consolidated UI Layout
 * 
 * Layout: Extended sidebar for better editing
 * Visual: Consistent button styling across all views
 */

import React, { useState, useCallback, useRef } from 'react';
import { CanvasNode, ConnectionType } from './types/canvas';
import { NodeTemplate } from './types/templates';
import { useCanvasState } from './hooks/useCanvasState';
import { CanvasNodeComponent } from './components/CanvasNode';
import { CanvasConnections } from './components/CanvasConnections';
import { NodeEditor } from './components/NodeEditor';
import { ExportPanel } from './components/ExportPanel';
import { TemplateSelector } from './components/TemplateSelector';
import { TemplateCreator } from './components/TemplateCreator';
import { CanvasZoneManager } from './components/CanvasZoneManager';
import { ZoneOverlay } from './components/ZoneOverlay';
import { ValidationPanel } from './components/ValidationPanel';
import { SnapshotManager } from './components/SnapshotManager';
import { SnapshotDiffViewer } from './components/SnapshotDiffViewer';
import { FocusModePanel } from './components/FocusModePanel';

// Shared button styles
const PRIMARY_BUTTON_STYLE = {
  base: 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
  bg: '#3b6ef8',
  hoverBg: '#2d5ce8',
  shadow: '0 4px 12px rgba(59, 110, 248, 0.3)',
};

type SidebarTab = 'nodes' | 'templates' | 'zones' | 'snapshots' | 'focus' | 'validation';

export default function App() {
  const canvas = useCanvasState();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('nodes');
  const [showExport, setShowExport] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<NodeTemplate[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [snapshotDiff, setSnapshotDiff] = useState<{ fromId: string; toId: string } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    canvas.updateDrag(e.nativeEvent);
  }, [canvas]);
  
  const handleCanvasMouseUp = useCallback(() => {
    canvas.endDrag();
  }, [canvas]);
  
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      canvas.selectNode(null);
      canvas.cancelConnection();
    }
  }, [canvas]);
  
  const handleAddNode = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const position = rect 
      ? { x: rect.width / 2 - 128, y: rect.height / 2 - 50 }
      : { x: 200, y: 200 };
    canvas.addNode(position);
  }, [canvas]);
  
  const handleAddConnectedNode = useCallback((parentId: string, newNode: CanvasNode, connectionType: ConnectionType) => {
    canvas.addConnectedNode(parentId, newNode, connectionType);
  }, [canvas]);
  
  const handleTemplateSelect = useCallback((templateNodes: CanvasNode[]) => {
    canvas.addNodes(templateNodes);
  }, [canvas]);
  
  const handleTemplateSave = useCallback((template: NodeTemplate) => {
    setCustomTemplates(prev => [...prev, template]);
    setShowCreator(false);
  }, []);
  
  const { nodes, nodeList, selectedNodeId, connectingFromId, focusState, stats, zones, snapshots } = canvas;
  
  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden relative">
      {/* Atmospheric glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(30, 50, 80, 0.6) 0%, transparent 60%)',
        }}
      />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <h1 
            className="text-xl font-normal tracking-tight"
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          >
            CanvasDocs
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.25)]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-xs font-medium text-[#22c55e] uppercase tracking-wide">Local Only</span>
          </div>
          <div className="text-xs text-[#6e7681] font-mono">
            {stats.nodes} nodes · {stats.connections} connections
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex relative z-10 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 bg-[#161b22] border-r border-[#30363d] flex flex-col">
          <nav className="p-3 space-y-1">
            {[
              { id: 'nodes' as const, label: 'Nodes', icon: '⚡' },
              { id: 'templates' as const, label: 'Templates', icon: '📋' },
              { id: 'zones' as const, label: 'Zones', icon: '🗺️' },
              { id: 'snapshots' as const, label: 'Snapshots', icon: '📸' },
              { id: 'focus' as const, label: 'Focus', icon: '🔍' },
              { id: 'validation' as const, label: 'Validation', icon: '✓' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none ${
                  sidebarTab === tab.id
                    ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
                    : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-3 mt-auto border-t border-[#30363d]">
            {/* Add Node - Primary Blue */}
            <button
              onClick={handleAddNode}
              className={PRIMARY_BUTTON_STYLE.base}
              style={{
                background: PRIMARY_BUTTON_STYLE.bg,
                boxShadow: PRIMARY_BUTTON_STYLE.shadow,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = PRIMARY_BUTTON_STYLE.hoverBg;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = PRIMARY_BUTTON_STYLE.bg;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>⚡</span>
              <span>Add Node</span>
            </button>
            
            {/* Export Canvas - Secondary style */}
            <button
              onClick={() => setShowExport(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-lg text-sm font-medium bg-[#21262d] text-[#e6edf3] border border-[#30363d] transition-all hover:border-[#484f58] hover:bg-[#30363d]"
            >
              <span>📤</span>
              <span>Export Canvas</span>
            </button>
          </div>
          
          {connectingFromId && (
            <div className="p-3 bg-[rgba(59,110,248,0.08)] border-t border-[rgba(59,110,248,0.2)]">
              <p className="text-xs text-[#3b6ef8] font-medium">Click another node to connect</p>
            </div>
          )}
        </aside>
        
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden canvas-background"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-20 canvas-background"
            style={{
              backgroundImage: `
                linear-gradient(to right, #30363d 1px, transparent 1px),
                linear-gradient(to bottom, #30363d 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          
          {/* Zone overlays */}
          {Object.values(zones).map(zone => (
            <ZoneOverlay
              key={zone.id}
              zone={zone}
              isSelected={false}
              nodeCount={Object.values(nodes).filter(n => 
                n.position.x >= zone.bounds.x && 
                n.position.x < zone.bounds.x + zone.bounds.width && 
                n.position.y >= zone.bounds.y && 
                n.position.y < zone.bounds.y + zone.bounds.height
              ).length}
              onSelect={() => {}}
            />
          ))}
          
          {/* Connections */}
          <CanvasConnections nodes={nodes} focusState={focusState} />
          
          {/* Nodes */}
          {nodeList.map(node => (
            <CanvasNodeComponent
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isConnecting={connectingFromId !== null}
              isFaded={focusState.config.enabled && focusState.fadedNodeIds.has(node.id)}
              showDepth={focusState.config.showDepthLabels}
              depth={focusState.nodeDepths.get(node.id) ?? null}
              onSelect={canvas.selectNode}
              onDragStart={canvas.startDrag}
              onConnectionStart={canvas.startConnection}
              onConnectionEnd={canvas.endConnection}
            />
          ))}
          
          {/* Empty state */}
          {nodeList.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-[#8b949e] text-lg">No nodes yet</p>
                <p className="text-sm text-[#6e7681] mt-2">Click "Add Node" to get started</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Right panel */}
        <aside className="w-[345px] bg-[#161b22] border-l border-[#30363d] overflow-y-auto">
          {sidebarTab === 'templates' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 
                  className="text-lg font-normal text-[#e6edf3]"
                  style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                >
                  Templates
                </h2>
                <button
                  onClick={() => setShowCreator(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#21262d] text-[#e6edf3] border border-[#30363d] hover:bg-[#30363d] transition-colors"
                  disabled={selectedNodeId === null}
                  title={selectedNodeId ? 'Save selected node as template' : 'Select a node first'}
                >
                  + Save as Template
                </button>
              </div>
              <TemplateSelector
                customTemplates={customTemplates}
                onSelect={handleTemplateSelect}
              />
            </div>
          ) : sidebarTab === 'zones' ? (
            <div className="p-4">
              <h2 
                className="text-lg font-normal text-[#e6edf3] mb-4"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                Canvas Zones
              </h2>
              <CanvasZoneManager
                zones={zones}
                nodes={nodes}
                onCreateZone={canvas.createZone}
                onDeleteZone={canvas.deleteZone}
                onMoveNodeToZone={() => {}}
              />
            </div>
          ) : sidebarTab === 'snapshots' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 
                  className="text-lg font-normal text-[#e6edf3]"
                  style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                >
                  Snapshots
                </h2>
                {snapshotDiff && (
                  <button
                    onClick={() => setSnapshotDiff(null)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#21262d] text-[#e6edf3] border border-[#30363d] hover:bg-[#30363d] transition-colors"
                  >
                    ← Back
                  </button>
                )}
              </div>
              {snapshotDiff ? (
                <SnapshotDiffViewer
                  diff={canvas.snapshots[snapshotDiff.fromId] && canvas.snapshots[snapshotDiff.toId] ? (() => {
                    const from = canvas.snapshots[snapshotDiff.fromId];
                    const to = canvas.snapshots[snapshotDiff.toId];
                    return {
                      fromSnapshotId: snapshotDiff.fromId,
                      toSnapshotId: snapshotDiff.toId,
                      timestamp: Date.now(),
                      addedNodes: Object.values(to.content.nodes).filter(n => !from.content.nodes[n.id]),
                      removedNodes: Object.values(from.content.nodes).filter(n => !to.content.nodes[n.id]),
                      modifiedNodes: [],
                      addedConnections: [],
                      removedConnections: [],
                      summary: { nodesAdded: 0, nodesRemoved: 0, nodesModified: 0, connectionsAdded: 0, connectionsRemoved: 0 },
                    };
                  })() : null as any}
                  fromSnapshot={canvas.snapshots[snapshotDiff.fromId]}
                  toSnapshot={canvas.snapshots[snapshotDiff.toId]}
                  onClose={() => setSnapshotDiff(null)}
                />
              ) : (
                <SnapshotManager
                  snapshots={canvas.snapshots}
                  nodes={nodes}
                  onCreateSnapshot={canvas.createSnapshot}
                  onRestoreSnapshot={canvas.restoreSnapshot}
                  onDeleteSnapshot={canvas.deleteSnapshot}
                  onCompareSnapshots={(fromId, toId) => setSnapshotDiff({ fromId, toId })}
                />
              )}
            </div>
          ) : sidebarTab === 'focus' ? (
            <div className="p-4">
              <h2 
                className="text-lg font-normal text-[#e6edf3] mb-4"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                Focus Mode
              </h2>
              <FocusModePanel
                focusState={focusState}
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onFocusChange={canvas.setFocusConfig}
                onSelectNode={(id) => canvas.selectNode(id)}
              />
            </div>
          ) : sidebarTab === 'validation' ? (
            <div className="p-4">
              <h2 
                className="text-lg font-normal text-[#e6edf3] mb-4"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                Validation
              </h2>
              <ValidationPanel
                validationResult={canvas.validationResult}
                nodes={nodes}
                onAutoFix={(fixedNodes) => canvas.setNodes(fixedNodes)}
                onSelectNode={(id) => canvas.selectNode(id)}
              />
            </div>
          ) : (
            <NodeEditor
              node={selectedNodeId ? nodes[selectedNodeId] : null}
              allNodes={nodes}
              onUpdate={canvas.updateNode}
              onDelete={canvas.deleteNode}
              onAddConnected={handleAddConnectedNode}
            />
          )}
        </aside>
      </div>
      
      {/* Template Creator modal */}
      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-[480px] max-h-[80vh] overflow-y-auto p-6">
            <TemplateCreator
              nodes={nodes}
              selectedNodeIds={selectedNodeId ? [selectedNodeId] : []}
              onSave={handleTemplateSave}
              onClose={() => setShowCreator(false)}
            />
          </div>
        </div>
      )}
      
      {/* Export modal */}
      {showExport && (
        <ExportPanel
          nodes={nodes}
          selectedNodeIds={selectedNodeId ? [selectedNodeId] : []}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}