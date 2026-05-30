/**
 * Node Editor State Hook
 * 
 * Topology: Manages form state with proper synchronization
 * Security: Validates all changes before propagation
 * Consistency: Maintains dirty state and sync tracking
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CanvasNode, NodeType } from '../types/canvas';
import { validateContent, ValidationResult } from '../utils/security';

export interface NodeEditorState {
  title: string;
  content: string;
  type: NodeType;
  isDirty: boolean;
  isValid: boolean;
  errors: string[];
  lastSyncedAt: number | null;
}

export interface NodeEditorActions {
  setTitle: (value: string) => void;
  setContent: (value: string) => void;
  setType: (value: NodeType) => void;
  save: () => boolean;
  reset: () => void;
  validate: () => ValidationResult;
}

interface UseNodeEditorOptions {
  node: CanvasNode | null;
  onUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  debounceMs?: number;
  autoSave?: boolean;
}

const DEFAULT_STATE: NodeEditorState = {
  title: '',
  content: '',
  type: 'paragraph',
  isDirty: false,
  isValid: true,
  errors: [],
  lastSyncedAt: null,
};

export function useNodeEditor(options: UseNodeEditorOptions) {
  const { node, onUpdate, debounceMs = 300, autoSave = true } = options;
  
  // ═══════════════════════════════════════════════════════════════
  // STATE - Form state with dirty tracking
  // ═══════════════════════════════════════════════════════════════
  
  const [formState, setFormState] = useState<NodeEditorState>(DEFAULT_STATE);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Track the node ID we're editing to detect node switches
  const currentNodeIdRef = useRef<string | null>(null);
  
  // ═══════════════════════════════════════════════════════════════
  // SYNC - Synchronize form with node changes
  // ═══════════════════════════════════════════════════════════════
  
  // Sync when node changes (including ID change)
  useEffect(() => {
    // Detect if we switched to a different node
    const nodeSwitched = node?.id !== currentNodeIdRef.current;
    
    if (node) {
      currentNodeIdRef.current = node.id;
      
      // On node switch, immediately sync all values
      if (nodeSwitched) {
        // Clear any pending debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        
        setFormState({
          title: node.title,
          content: node.content,
          type: node.type,
          isDirty: false,
          isValid: true,
          errors: [],
          lastSyncedAt: Date.now(),
        });
        
        lastUpdateRef.current = node.updatedAt;
      } else {
        // Same node - check if external update occurred
        if (node.updatedAt > lastUpdateRef.current && !formState.isDirty) {
          setFormState(prev => ({
            ...prev,
            title: node.title,
            content: node.content,
            type: node.type,
            lastSyncedAt: Date.now(),
          }));
          lastUpdateRef.current = node.updatedAt;
        }
      }
    } else {
      // No node selected - reset to defaults
      currentNodeIdRef.current = null;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      setFormState(DEFAULT_STATE);
    }
  }, [node?.id, node?.updatedAt, node?.title, node?.content, node?.type, formState.isDirty]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // ═══════════════════════════════════════════════════════════════
  // VALIDATION - Validate current form state
  // ═══════════════════════════════════════════════════════════════
  
  const validate = useCallback((): ValidationResult => {
    const errors: string[] = [];
    
    const titleValidation = validateContent(formState.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
    }
    
    const contentValidation = validateContent(formState.content);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedContent: null,
    };
  }, [formState.title, formState.content]);
  
  // ═══════════════════════════════════════════════════════════════
  // PERSISTENCE - Debounced save to parent
  // ═══════════════════════════════════════════════════════════════
  
  const persistChanges = useCallback((field: 'title' | 'content' | 'type', value: string | NodeType) => {
    if (!node || !currentNodeIdRef.current) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Type changes are immediate (no debounce)
    if (field === 'type') {
      onUpdate(node.id, { type: value as NodeType });
      lastUpdateRef.current = Date.now();
      setFormState(prev => ({
        ...prev,
        type: value as NodeType,
        isDirty: false,
        lastSyncedAt: Date.now(),
      }));
      return;
    }
    
    // Mark as dirty immediately
    setFormState(prev => ({
      ...prev,
      [field]: value,
      isDirty: true,
    }));
    
    if (autoSave) {
      // Debounce title/content changes
      debounceTimerRef.current = setTimeout(() => {
        if (!node || !currentNodeIdRef.current) return;
        
        const validation = validate();
        
        if (validation.isValid) {
          onUpdate(node.id, { [field]: value });
          lastUpdateRef.current = Date.now();
          setFormState(prev => ({
            ...prev,
            isDirty: false,
            lastSyncedAt: Date.now(),
          }));
        } else {
          setFormState(prev => ({
            ...prev,
            isValid: false,
            errors: validation.errors,
          }));
        }
        
        debounceTimerRef.current = null;
      }, debounceMs);
    }
  }, [node, onUpdate, autoSave, debounceMs, validate]);
  
  // ═══════════════════════════════════════════════════════════════
  // ACTIONS - Stable action creators
  // ═══════════════════════════════════════════════════════════════
  
  const setTitle = useCallback((value: string) => {
    persistChanges('title', value);
  }, [persistChanges]);
  
  const setContent = useCallback((value: string) => {
    persistChanges('content', value);
  }, [persistChanges]);
  
  const setType = useCallback((value: NodeType) => {
    persistChanges('type', value);
  }, [persistChanges]);
  
  const save = useCallback((): boolean => {
    // Force immediate save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (!node || !formState.isDirty) return false;
    
    const validation = validate();
    
    if (validation.isValid) {
      onUpdate(node.id, {
        title: formState.title,
        content: formState.content,
      });
      lastUpdateRef.current = Date.now();
      setFormState(prev => ({
        ...prev,
        isDirty: false,
        lastSyncedAt: Date.now(),
      }));
      return true;
    }
    
    return false;
  }, [node, formState.isDirty, formState.title, formState.content, validate, onUpdate]);
  
  const reset = useCallback(() => {
    // Cancel pending changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (node) {
      setFormState({
        title: node.title,
        content: node.content,
        type: node.type,
        isDirty: false,
        isValid: true,
        errors: [],
        lastSyncedAt: Date.now(),
      });
    }
  }, [node]);
  
  // ═══════════════════════════════════════════════════════════════
  // RETURN - Complete state and actions
  // ═══════════════════════════════════════════════════════════════
  
  return {
    // State
    ...formState,
    
    // Actions
    setTitle,
    setContent,
    setType,
    save,
    reset,
    validate,
    
    // Computed
    hasNode: node !== null,
    nodeId: node?.id ?? null,
  };
}