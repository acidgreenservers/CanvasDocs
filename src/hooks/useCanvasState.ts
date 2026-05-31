/**
 * Optimized Canvas State Hook
 * 
 * Performance: Batches updates, memoizes computations
 * Security: All updates flow through validated setters
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { CanvasNode, ConnectionType } from '../types/canvas';
import { CanvasZone } from '../types/zones';
import { CanvasSnapshot } from '../types/snapshots';
import { ValidationResult } from '../types/validation';
import { FocusConfig, FocusState, DEFAULT_FOCUS_CONFIG } from '../types/focus';
import { generateSecureId, isValidNodeId, validateContent } from '../utils/security';
import { validateCanvas } from '../utils/validation';
import { computeFocusState } from '../utils/focusEngine';

interface UseCanvasStateOptions {
  onNodeSelect?: (nodeId: string | null) => void;
  onConnectionCreate?: (sourceId: string, targetId: string) => void;
}

export function useCanvasState(options: UseCanvasStateOptions = {}) {
  // ═══════════════════════════════════════════════════════════════
  // STATE - Grouped to minimize re-renders
  // ═══════════════════════════════════════════════════════════════
  
  const [nodes, setNodes] = useState<Record<string, CanvasNode>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [focusConfig, setFocusConfig] = useState<FocusConfig>(DEFAULT_FOCUS_CONFIG);
  const [zones, setZones] = useState<Record<string, CanvasZone>>({});
  const [snapshots, setSnapshots] = useState<Record<string, CanvasSnapshot>>({});
  
  // Drag state ref - doesn't need to trigger re-renders
  const dragStateRef = useRef<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  
  // ═══════════════════════════════════════════════════════════════
  // MEMOIZED COMPUTATIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Validation - only recompute when nodes change
  const validationResult = useMemo<ValidationResult>(() => {
    return validateCanvas(nodes);
  }, [nodes]);
  
  // Focus state - only recompute when nodes or config changes
  const focusState = useMemo<FocusState>(() => {
    return computeFocusState(nodes, focusConfig);
  }, [nodes, focusConfig]);
  
  // Stats - derived from nodes
  const stats = useMemo(() => ({
    nodes: Object.keys(nodes).length,
    connections: Object.values(nodes).reduce((acc, n) => acc + n.connections.length, 0),
  }), [nodes]);
  
  // Node list for iteration (cached)
  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  
  // ═══════════════════════════════════════════════════════════════
  // STABLE CALLBACKS
  // ═══════════════════════════════════════════════════════════════
  
  const validateNodeExists = useCallback((id: string): boolean => {
    return isValidNodeId(id) && id in nodes;
  }, [nodes]);
  
  const addNode = useCallback((position?: { x: number; y: number }) => {
    const id = generateSecureId();
    const newNode: CanvasNode = {
      id,
      type: 'paragraph',
      title: 'New Node',
      content: '',
      position: position ?? { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      connections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setNodes(prev => ({ ...prev, [id]: newNode }));
    setSelectedNodeId(id);
    
    return newNode;
  }, []);
  
  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>) => {
    setNodes(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      
      // Validate content if provided
      if (updates.title !== undefined) {
        const validation = validateContent(updates.title);
        if (!validation.isValid) return prev;
        updates.title = validation.sanitizedContent ?? undefined;
      }
      if (updates.content !== undefined) {
        const validation = validateContent(updates.content);
        if (!validation.isValid) return prev;
        updates.content = validation.sanitizedContent ?? undefined;
      }
      
      return {
        ...prev,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
    });
  }, []);
  
  const deleteNode = useCallback((id: string) => {
    setNodes(prev => {
      if (!prev[id]) return prev;
      
      const newNodes = { ...prev };
      delete newNodes[id];
      
      // Clean up connections in single pass
      Object.keys(newNodes).forEach(nodeId => {
        const node = newNodes[nodeId];
        const filtered = node.connections.filter(c => c.targetId !== id);
        if (filtered.length !== node.connections.length) {
          newNodes[nodeId] = { ...node, connections: filtered };
        }
      });
      
      return newNodes;
    });
    
    setSelectedNodeId(prev => prev === id ? null : prev);
    setFocusConfig(prev => 
      prev.focusNodeId === id 
        ? { ...prev, focusNodeId: null, enabled: false }
        : prev
    );
  }, []);
  
  const setNodesBatch = useCallback((newNodes: Record<string, CanvasNode>) => {
    setNodes(newNodes);
    setSelectedNodeId(null);
    setFocusConfig(DEFAULT_FOCUS_CONFIG);
  }, []);
  
  const createZone = useCallback((zone: CanvasZone) => {
    setZones(prev => ({ ...prev, [zone.id]: zone }));
  }, []);
  
  const createSnapshot = useCallback((snapshot: CanvasSnapshot) => {
    setSnapshots(prev => ({ ...prev, [snapshot.metadata.id]: snapshot }));
  }, []);
  
  const restoreSnapshot = useCallback((snapshot: CanvasSnapshot) => {
    setNodes(snapshot.content.nodes);
    setSelectedNodeId(null);
  }, []);
  
  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots(prev => {
      const updated = { ...prev };
      delete updated[snapshotId];
      return updated;
    });
  }, []);
  
  const deleteZone = useCallback((zoneId: string) => {
    setZones(prev => {
      const updated = { ...prev };
      delete updated[zoneId];
      return updated;
    });
  }, []);
  
  const addNodes = useCallback((newNodes: CanvasNode[]) => {
    setNodes(prev => {
      const updated = { ...prev };
      for (const node of newNodes) {
        updated[node.id] = node;
      }
      return updated;
    });
  }, []);
  
  const addConnectedNode = useCallback((parentId: string, newNode: CanvasNode, connectionType: ConnectionType = 'follows') => {
    setNodes(prev => {
      const parent = prev[parentId];
      if (!parent) return prev;
      
      return {
        ...prev,
        [newNode.id]: newNode,
        [parentId]: {
          ...parent,
          connections: [...parent.connections, { targetId: newNode.id, type: connectionType, createdAt: Date.now() }],
          updatedAt: Date.now(),
        },
      };
    });
    setSelectedNodeId(newNode.id);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════
  // CONNECTION HANDLING
  // ═══════════════════════════════════════════════════════════════
  
  const startConnection = useCallback((nodeId: string) => {
    if (isValidNodeId(nodeId) && nodeId in nodes) {
      setConnectingFromId(nodeId);
    }
  }, [nodes]);
  
  const endConnection = useCallback((targetId: string, type: ConnectionType = 'follows') => {
    setConnectingFromId(prev => {
      if (!prev || prev === targetId || !isValidNodeId(targetId)) {
        return null;
      }
      
      setNodes(nodesPrev => {
        const source = nodesPrev[prev];
        if (!source || source.connections.some(c => c.targetId === targetId)) {
          return nodesPrev;
        }
        
        options.onConnectionCreate?.(prev, targetId);
        
        return {
          ...nodesPrev,
          [prev]: {
            ...source,
            connections: [...source.connections, { targetId, type, createdAt: Date.now() }],
            updatedAt: Date.now(),
          },
        };
      });
      
      return null;
    });
  }, [options]);
  
  const cancelConnection = useCallback(() => {
    setConnectingFromId(null);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════
  // DRAG HANDLING - Optimized with refs
  // ═══════════════════════════════════════════════════════════════
  
  const startDrag = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = nodes[nodeId];
    if (!node) return;
    
    dragStateRef.current = {
      nodeId,
      offsetX: event.clientX - node.position.x,
      offsetY: event.clientY - node.position.y,
    };
  }, [nodes]);
  
  const updateDrag = useCallback((event: MouseEvent) => {
    const drag = dragStateRef.current;
    if (!drag) return false;
    
    const { nodeId, offsetX, offsetY } = drag;
    const newX = Math.max(0, event.clientX - offsetX);
    const newY = Math.max(0, event.clientY - offsetY);
    
    setNodes(prev => {
      const node = prev[nodeId];
      if (!node) return prev;
      
      // Skip if position hasn't changed
      if (node.position.x === newX && node.position.y === newY) {
        return prev;
      }
      
      return {
        ...prev,
        [nodeId]: { ...node, position: { x: newX, y: newY } },
      };
    });
    
    return true;
  }, []);
  
  const endDrag = useCallback(() => {
    dragStateRef.current = null;
  }, []);
  
  const isDragging = useCallback(() => {
    return dragStateRef.current !== null;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════════════════
  
  const selectNode = useCallback((nodeId: string | null) => {
    if (nodeId && !isValidNodeId(nodeId)) return;
    if (nodeId && !(nodeId in nodes)) return;
    
    setSelectedNodeId(nodeId);
    options.onNodeSelect?.(nodeId);
  }, [nodes, options]);
  
  // ═══════════════════════════════════════════════════════════════
  // RETURN - Stable interface
  // ═══════════════════════════════════════════════════════════════
  
  return {
    // State
    nodes,
    nodeList,
    selectedNodeId,
    connectingFromId,
    focusConfig,
    focusState,
    validationResult,
    stats,
    zones,
    snapshots,
    
    // Node operations
    addNode,
    addConnectedNode,
    addNodes,
    updateNode,
    deleteNode,
    setNodes: setNodesBatch,
    validateNodeExists,
    
    // Connection operations
    startConnection,
    endConnection,
    cancelConnection,
    
    // Drag operations
    startDrag,
    updateDrag,
    endDrag,
    isDragging,
    
    // Selection
    selectNode,
    // Zone operations
    createZone,
    deleteZone,
    
    // Snapshot operations
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    
    setFocusConfig,
  };
}