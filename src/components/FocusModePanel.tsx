/**
 * Focus Mode Panel Component
 * 
 * ATTRACTOR: "Structure has depth"
 * GROUNDING: UI controls for focus mode configuration
 * Security: Focus is a view transformation - state remains protected
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { 
  FocusConfig, 
  FocusState, 
  FocusDirection,
  FOCUS_PRESETS 
} from '../types/focus';
import { CanvasNode } from '../types/canvas';

interface FocusModePanelProps {
  focusState: FocusState;
  nodes: Record<string, CanvasNode>;
  selectedNodeId: string | null;
  onFocusChange: (config: FocusConfig) => void;
  onSelectNode: (nodeId: string) => void;
}

const DIRECTION_LABELS: Record<FocusDirection, string> = {
  downstream: '↓ Downstream',
  upstream: '↑ Upstream',
  both: '↕ Both',
};

const PRESET_LABELS: Record<string, string> = {
  subtree: 'Subtree',
  ancestors: 'Ancestors',
  immediate: 'Immediate',
  'full-context': 'Full Context',
};

export function FocusModePanel({
  focusState,
  nodes,
  selectedNodeId,
  onFocusChange,
  onSelectNode,
}: FocusModePanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const config = focusState.config;
  
  const handleEnableFocus = useCallback((enabled: boolean) => {
    onFocusChange({
      ...config,
      enabled,
      focusNodeId: enabled ? (selectedNodeId || config.focusNodeId) : null,
    });
  }, [config, selectedNodeId, onFocusChange]);
  
  const handleSetFocusNode = useCallback((nodeId: string) => {
    onFocusChange({
      ...config,
      enabled: true,
      focusNodeId: nodeId,
    });
  }, [config, onFocusChange]);
  
  const handleDirectionChange = useCallback((direction: FocusDirection) => {
    onFocusChange({
      ...config,
      direction,
    });
  }, [config, onFocusChange]);
  
  const handleDepthChange = useCallback((type: 'upstream' | 'downstream', value: number) => {
    onFocusChange({
      ...config,
      depth: {
        ...config.depth,
        [type === 'upstream' ? 'maxUpstream' : 'maxDownstream']: value,
      },
    });
  }, [config, onFocusChange]);
  
  const handlePresetSelect = useCallback((presetName: string) => {
    const preset = FOCUS_PRESETS[presetName];
    if (preset) {
      onFocusChange({
        ...config,
        ...preset,
        depth: {
          ...config.depth,
          ...(preset.depth || {}),
        },
      });
    }
  }, [config, onFocusChange]);
  
  const handleToggleFade = useCallback(() => {
    onFocusChange({
      ...config,
      fadeDisconnected: !config.fadeDisconnected,
    });
  }, [config, onFocusChange]);
  
  const handleToggleHighlight = useCallback(() => {
    onFocusChange({
      ...config,
      highlightPath: !config.highlightPath,
    });
  }, [config, onFocusChange]);
  
  const handleToggleDepthLabels = useCallback(() => {
    onFocusChange({
      ...config,
      showDepthLabels: !config.showDepthLabels,
    });
  }, [config, onFocusChange]);
  
  // Get nodes sorted by connection count for quick selection
  const suggestedNodes = useMemo(() => {
    return Object.values(nodes)
      .sort((a, b) => b.connections.length - a.connections.length)
      .slice(0, 5);
  }, [nodes]);
  
  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Focus Mode</h2>
          <button
            onClick={() => handleEnableFocus(!config.enabled)}
            className={`w-10 h-5 rounded-full transition-colors ${
              config.enabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {config.enabled 
            ? `Focused on ${nodes[config.focusNodeId || '']?.title || 'Unknown'}`
            : 'Show connected nodes only'
          }
        </p>
      </div>
      
      {config.enabled && (
        <>
          {/* Stats */}
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-white">
                  {focusState.stats.visibleNodes}
                </div>
                <div className="text-xs text-slate-500">Visible</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-400">
                  {focusState.stats.hiddenNodes}
                </div>
                <div className="text-xs text-slate-500">Hidden</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {focusState.stats.maxDepth}
                </div>
                <div className="text-xs text-slate-500">Max Depth</div>
              </div>
            </div>
          </div>
          
          {/* Focus node selection */}
          <div className="px-4 py-3 border-b border-slate-700">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Focus Node
            </label>
            
            {config.focusNodeId && nodes[config.focusNodeId] && (
              <div className="mb-2 p-2 bg-emerald-900 rounded flex items-center justify-between">
                <span className="text-sm text-emerald-200">
                  {nodes[config.focusNodeId].title}
                </span>
                <span className="text-xs text-emerald-400">
                  {nodes[config.focusNodeId].connections.length} connections
                </span>
              </div>
            )}
            
            {selectedNodeId && selectedNodeId !== config.focusNodeId && (
              <Button
                onClick={() => handleSetFocusNode(selectedNodeId)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs"
              >
                Focus on selected node
              </Button>
            )}
            
            {/* Quick select */}
            <div className="mt-2">
              <div className="text-xs text-slate-500 mb-1">Quick select:</div>
              <div className="flex flex-wrap gap-1">
                {suggestedNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => handleSetFocusNode(node.id)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      config.focusNodeId === node.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {node.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Direction */}
          <div className="px-4 py-3 border-b border-slate-700">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Direction
            </label>
            <div className="flex gap-1">
              {(['downstream', 'upstream', 'both'] as FocusDirection[]).map(dir => (
                <button
                  key={dir}
                  onClick={() => handleDirectionChange(dir)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    config.direction === dir
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {DIRECTION_LABELS[dir]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Presets */}
          <div className="px-4 py-3 border-b border-slate-700">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Presets
            </label>
            <div className="flex flex-wrap gap-1">
              {Object.keys(PRESET_LABELS).map(presetName => (
                <button
                  key={presetName}
                  onClick={() => handlePresetSelect(presetName)}
                  className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                >
                  {PRESET_LABELS[presetName]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Advanced options */}
          <div className="flex-1 overflow-y-auto">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-800"
            >
              <span>Advanced Options</span>
              <span>{showAdvanced ? '−' : '+'}</span>
            </button>
            
            {showAdvanced && (
              <div className="px-4 py-3 space-y-3 bg-slate-800">
                {/* Depth limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Upstream Depth
                    </label>
                    <select
                      value={config.depth.maxUpstream}
                      onChange={(e) => handleDepthChange('upstream', Number(e.target.value))}
                      className="w-full bg-slate-700 border-slate-600 rounded text-white text-xs p-1.5"
                    >
                      <option value="0">Unlimited</option>
                      <option value="1">1 level</option>
                      <option value="2">2 levels</option>
                      <option value="3">3 levels</option>
                      <option value="5">5 levels</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Downstream Depth
                    </label>
                    <select
                      value={config.depth.maxDownstream}
                      onChange={(e) => handleDepthChange('downstream', Number(e.target.value))}
                      className="w-full bg-slate-700 border-slate-600 rounded text-white text-xs p-1.5"
                    >
                      <option value="0">Unlimited</option>
                      <option value="1">1 level</option>
                      <option value="2">2 levels</option>
                      <option value="3">3 levels</option>
                      <option value="5">5 levels</option>
                    </select>
                  </div>
                </div>
                
                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fadeDisconnected}
                      onChange={handleToggleFade}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700"
                    />
                    <span className="text-xs text-slate-400">Fade disconnected nodes</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.highlightPath}
                      onChange={handleToggleHighlight}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700"
                    />
                    <span className="text-xs text-slate-400">Highlight connection paths</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showDepthLabels}
                      onChange={handleToggleDepthLabels}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700"
                    />
                    <span className="text-xs text-slate-400">Show depth labels</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Exit focus */}
          <div className="p-4 border-t border-slate-700">
            <Button
              onClick={() => handleEnableFocus(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
            >
              Exit Focus Mode
            </Button>
          </div>
        </>
      )}
      
      {/* Disabled state */}
      {!config.enabled && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-slate-400">
              Select a node and enable focus mode
            </p>
            <p className="text-xs text-slate-500 mt-1">
              to show only connected nodes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}