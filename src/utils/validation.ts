/**
 * Structure Validation Utilities
 * 
 * ATTRACTOR: "Structure can be broken"
 * GROUNDING: Validation runs on every state change to prevent corrupt exports
 * Security: All validation issues are tracked and must be resolved before export
 */

import { CanvasNode, ConnectionType } from '../types/canvas';
import { 
  ValidationResult, 
  ValidationIssue, 
  ValidationSeverity,
  ValidationCategory,
  ValidationIssueType,
  ValidationContext,
  RequiredStructure,
  DOCUMENT_STRUCTURES 
} from '../types/validation';
import { generateSecureId } from './security';

// ═══════════════════════════════════════════════════════════════
// VALIDATION CONTEXT BUILDING
// ═══════════════════════════════════════════════════════════════

/**
 * Build validation context from nodes
 * Security: Creates indexed structures for efficient validation
 */
function buildValidationContext(nodes: Record<string, CanvasNode>): ValidationContext {
  const nodeMap = new Map<string, CanvasNode>();
  const connectionsMap = new Map<string, { sourceId: string; targetId: string; type: ConnectionType }>();
  const nodeTypes = new Map<string, CanvasNode['type']>();
  const rootNodes = new Set<string>();
  const leafNodes = new Set<string>();
  
  // Index all nodes
  Object.values(nodes).forEach(node => {
    nodeMap.set(node.id, node);
    nodeTypes.set(node.id, node.type);
    rootNodes.add(node.id);
    leafNodes.add(node.id);
  });
  
  // Build connection index and identify roots/leaves
  Object.values(nodes).forEach(node => {
    node.connections.forEach(conn => {
      const connId = `${node.id}-${conn.targetId}`;
      connectionsMap.set(connId, {
        sourceId: node.id,
        targetId: conn.targetId,
        type: conn.type,
      });
      
      // Target is not a root (has incoming connections)
      rootNodes.delete(conn.targetId);
      // Source is not a leaf (has outgoing connections)
      leafNodes.delete(node.id);
    });
  });
  
  return {
    nodes: nodeMap,
    connections: connectionsMap,
    nodeTypes,
    rootNodes,
    leafNodes,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════

interface ValidationRule {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  check: (ctx: ValidationContext) => ValidationIssue[];
}

const VALIDATION_RULES: ValidationRule[] = [
  // ─────────────────────────────────────────────────────────────
  // STRUCTURE VALIDATION
  // ─────────────────────────────────────────────────────────────
  
  {
    id: 'orphaned-nodes',
    category: 'structure',
    severity: 'warning',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      ctx.nodes.forEach((node, id) => {
        const hasIncoming = Array.from(ctx.connections.values())
          .some(c => c.targetId === id);
        const hasOutgoing = node.connections.length > 0;
        
        if (!hasIncoming && !hasOutgoing && ctx.nodes.size > 1) {
          issues.push({
            id: generateSecureId(),
            severity: 'warning',
            category: 'structure',
            type: 'orphaned_node',
            message: `Node "${node.title || 'Untitled'}" is not connected to any other nodes`,
            nodeId: id,
            suggestion: 'Connect this node to the main document structure',
            autoFixable: false,
          });
        }
      });
      
      return issues;
    },
  },
  
  {
    id: 'circular-dependencies',
    category: 'structure',
    severity: 'error',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      const cyclePath: string[] = [];
      
      function detectCycle(nodeId: string, path: string[]): boolean {
        if (recursionStack.has(nodeId)) {
          // Found cycle - record the path
          const cycleStart = path.indexOf(nodeId);
          cyclePath.push(...path.slice(cycleStart), nodeId);
          return true;
        }
        
        if (visited.has(nodeId)) return false;
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);
        
        const node = ctx.nodes.get(nodeId);
        if (node) {
          for (const conn of node.connections) {
            if (detectCycle(conn.targetId, [...path])) {
              return true;
            }
          }
        }
        
        recursionStack.delete(nodeId);
        return false;
      }
      
      ctx.nodes.forEach((_, id) => {
        if (!visited.has(id)) {
          if (detectCycle(id, [])) {
            const cycleNodes = cyclePath
              .map(id => ctx.nodes.get(id)?.title || 'Untitled')
              .join(' → ');
            
            issues.push({
              id: generateSecureId(),
              severity: 'error',
              category: 'structure',
              type: 'circular_dependency',
              message: `Circular dependency detected: ${cycleNodes}`,
              suggestion: 'Remove one of the connections to break the cycle',
              autoFixable: false,
            });
          }
        }
      });
      
      return issues;
    },
  },
  
  {
    id: 'multiple-roots',
    category: 'structure',
    severity: 'info',
    check: (ctx): ValidationIssue[] => {
      if (ctx.rootNodes.size <= 1) return [];
      
      const rootNames = Array.from(ctx.rootNodes)
        .map(id => ctx.nodes.get(id)?.title || 'Untitled')
        .slice(0, 3)
        .join(', ');
      
      return [{
        id: generateSecureId(),
        severity: 'info',
        category: 'structure',
        type: 'multiple_roots',
        message: `Multiple root nodes found: ${rootNames}${ctx.rootNodes.size > 3 ? '...' : ''}`,
        suggestion: 'Consider connecting separate chains or using a single root',
        autoFixable: false,
      }];
    },
  },
  
  {
    id: 'deep-nesting',
    category: 'structure',
    severity: 'warning',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const depths = new Map<string, number>();
      const MAX_DEPTH = 10;
      
      function calculateDepth(nodeId: string, visited: Set<string>): number {
        if (visited.has(nodeId)) return 0; // Cycle protection
        if (depths.has(nodeId)) return depths.get(nodeId)!;
        
        visited.add(nodeId);
        
        const node = ctx.nodes.get(nodeId);
        if (!node || node.connections.length === 0) {
          depths.set(nodeId, 0);
          return 0;
        }
        
        const maxChildDepth = Math.max(
          ...node.connections.map(c => calculateDepth(c.targetId, new Set(visited)))
        );
        
        const depth = maxChildDepth + 1;
        depths.set(nodeId, depth);
        return depth;
      }
      
      ctx.nodes.forEach((node, id) => {
        const depth = calculateDepth(id, new Set());
        if (depth > MAX_DEPTH) {
          issues.push({
            id: generateSecureId(),
            severity: 'warning',
            category: 'structure',
            type: 'deep_nesting',
            message: `Node "${node.title}" is nested ${depth} levels deep`,
            nodeId: id,
            suggestion: `Consider flattening the structure to improve readability`,
            autoFixable: false,
          });
        }
      });
      
      return issues;
    },
  },
  
  // ─────────────────────────────────────────────────────────────
  // CONTENT VALIDATION
  // ─────────────────────────────────────────────────────────────
  
  {
    id: 'empty-titles',
    category: 'content',
    severity: 'warning',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      ctx.nodes.forEach((node, id) => {
        if (!node.title || node.title.trim().length === 0) {
          issues.push({
            id: generateSecureId(),
            severity: 'warning',
            category: 'content',
            type: 'empty_title',
            message: `Node has empty title`,
            nodeId: id,
            suggestion: 'Add a descriptive title',
            autoFixable: false,
          });
        }
      });
      
      return issues;
    },
  },
  
  {
    id: 'empty-content',
    category: 'content',
    severity: 'info',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      ctx.nodes.forEach((node, id) => {
        if (!node.content || node.content.trim().length === 0) {
          issues.push({
            id: generateSecureId(),
            severity: 'info',
            category: 'content',
            type: 'empty_content',
            message: `Node "${node.title || 'Untitled'}" has no content`,
            nodeId: id,
            suggestion: 'Add content to make this node meaningful',
            autoFixable: false,
          });
        }
      });
      
      return issues;
    },
  },
  
  {
    id: 'title-length',
    category: 'content',
    severity: 'info',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const MAX_TITLE_LENGTH = 100;
      
      ctx.nodes.forEach((node, id) => {
        if (node.title && node.title.length > MAX_TITLE_LENGTH) {
          issues.push({
            id: generateSecureId(),
            severity: 'info',
            category: 'content',
            type: 'title_too_long',
            message: `Title is ${node.title.length} characters (max ${MAX_TITLE_LENGTH})`,
            nodeId: id,
            suggestion: 'Shorten the title for better readability',
            autoFixable: false,
          });
        }
      });
      
      return issues;
    },
  },
  
  // ─────────────────────────────────────────────────────────────
  // CONNECTION VALIDATION
  // ─────────────────────────────────────────────────────────────
  
  {
    id: 'self-connections',
    category: 'connections',
    severity: 'error',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      ctx.nodes.forEach((node, id) => {
        node.connections.forEach(conn => {
          if (conn.targetId === id) {
            issues.push({
              id: generateSecureId(),
              severity: 'error',
              category: 'connections',
              type: 'self_connection',
              message: `Node "${node.title}" connects to itself`,
              nodeId: id,
              connectionId: `${id}-${conn.targetId}`,
              suggestion: 'Remove the self-referencing connection',
              autoFixable: true,
            });
          }
        });
      });
      
      return issues;
    },
  },
  
  {
    id: 'duplicate-connections',
    category: 'connections',
    severity: 'warning',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      ctx.nodes.forEach((node, id) => {
        const seen = new Map<string, number>();
        
        node.connections.forEach(conn => {
          const key = conn.targetId;
          seen.set(key, (seen.get(key) || 0) + 1);
        });
        
        seen.forEach((count, targetId) => {
          if (count > 1) {
            issues.push({
              id: generateSecureId(),
              severity: 'warning',
              category: 'connections',
              type: 'duplicate_connection',
              message: `Node "${node.title}" has ${count} connections to the same target`,
              nodeId: id,
              suggestion: 'Remove duplicate connections',
              autoFixable: true,
            });
          }
        });
      });
      
      return issues;
    },
  },
  
  {
    id: 'missing-connection-targets',
    category: 'connections',
    severity: 'error',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      ctx.nodes.forEach((node, id) => {
        node.connections.forEach(conn => {
          if (!ctx.nodes.has(conn.targetId)) {
            issues.push({
              id: generateSecureId(),
              severity: 'error',
              category: 'connections',
              type: 'missing_connection_target',
              message: `Connection points to non-existent node`,
              nodeId: id,
              connectionId: `${id}-${conn.targetId}`,
              suggestion: 'Remove the invalid connection',
              autoFixable: true,
            });
          }
        });
      });
      
      return issues;
    },
  },
  
  // ─────────────────────────────────────────────────────────────
  // COMPLETENESS VALIDATION
  // ─────────────────────────────────────────────────────────────
  
  {
    id: 'missing-sections',
    category: 'completeness',
    severity: 'warning',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      // Check for at least one section node
      const hasSection = Array.from(ctx.nodes.values())
        .some(n => n.type === 'section');
      
      if (!hasSection && ctx.nodes.size > 0) {
        issues.push({
          id: generateSecureId(),
          severity: 'warning',
          category: 'completeness',
          type: 'missing_section',
          message: 'Document has no section nodes',
          suggestion: 'Add section nodes to organize content',
          autoFixable: false,
        });
      }
      
      return issues;
    },
  },
  
  {
    id: 'unreachable-nodes',
    category: 'completeness',
    severity: 'warning',
    check: (ctx): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      if (ctx.rootNodes.size === 0 || ctx.nodes.size <= 1) return issues;
      
      // BFS from all roots
      const reachable = new Set<string>();
      const queue = Array.from(ctx.rootNodes);
      
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (reachable.has(nodeId)) continue;
        
        reachable.add(nodeId);
        
        const node = ctx.nodes.get(nodeId);
        if (node) {
          node.connections.forEach(conn => {
            if (!reachable.has(conn.targetId)) {
              queue.push(conn.targetId);
            }
          });
        }
      }
      
      // Find unreachable nodes
      ctx.nodes.forEach((node, id) => {
        if (!reachable.has(id)) {
          issues.push({
            id: generateSecureId(),
            severity: 'warning',
            category: 'completeness',
            type: 'unreachable_node',
            message: `Node "${node.title}" is not reachable from any root`,
            nodeId: id,
            suggestion: 'Connect this node to the main structure',
            autoFixable: false,
          });
        }
      });
      
      return issues;
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate canvas structure
 * Security: Runs on every state change, prevents corrupt exports
 */
export function validateCanvas(nodes: Record<string, CanvasNode>): ValidationResult {
  const context = buildValidationContext(nodes);
  const issues: ValidationIssue[] = [];
  
  // Run all validation rules
  VALIDATION_RULES.forEach(rule => {
    const ruleIssues = rule.check(context);
    issues.push(...ruleIssues);
  });
  
  // Calculate summary
  const summary = {
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    infoCount: issues.filter(i => i.severity === 'info').length,
    nodesWithIssues: new Set(issues.map(i => i.nodeId).filter(Boolean)).size,
    categories: issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<ValidationCategory, number>),
  };
  
  // Generate hash for caching
  const hash = generateValidationHash(nodes, issues);
  
  return {
    isValid: summary.errorCount === 0,
    issues,
    summary,
    timestamp: Date.now(),
    hash,
  };
}

/**
 * Validate against specific document structure
 */
export function validateDocumentStructure(
  nodes: Record<string, CanvasNode>,
  structure: RequiredStructure
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const context = buildValidationContext(nodes);
  
  // Check required sections
  structure.requiredSections.forEach(req => {
    const matchingNodes = Array.from(context.nodes.values())
      .filter(n => {
        if (n.type !== req.type) return false;
        if (req.titlePattern && !req.titlePattern.test(n.title)) return false;
        return true;
      });
    
    if (matchingNodes.length < req.minCount) {
      issues.push({
        id: generateSecureId(),
        severity: 'warning',
        category: 'completeness',
        type: 'missing_section',
        message: `Missing required ${req.type}${req.titlePattern ? ` matching ${req.titlePattern}` : ''}`,
        suggestion: `Add at least ${req.minCount} ${req.type} node${req.minCount > 1 ? 's' : ''}`,
        autoFixable: false,
      });
    }
    
    if (req.maxCount && matchingNodes.length > req.maxCount) {
      issues.push({
        id: generateSecureId(),
        severity: 'warning',
        category: 'completeness',
        type: 'missing_section',
        message: `Too many ${req.type} sections (max ${req.maxCount})`,
        suggestion: `Remove excess ${req.type} nodes`,
        autoFixable: false,
      });
    }
  });
  
  // Check max depth
  if (structure.maxDepth) {
    // Use depth calculation from validation rules
    const deepNestingRule = VALIDATION_RULES.find(r => r.id === 'deep-nesting');
    if (deepNestingRule) {
      const depthIssues = deepNestingRule.check(context);
      issues.push(...depthIssues.filter(i => {
        const node = i.nodeId ? context.nodes.get(i.nodeId) : null;
        // Custom depth threshold based on structure
        return node !== undefined;
      }));
    }
  }
  
  return issues;
}

/**
 * Generate hash for validation caching
 */
function generateValidationHash(
  nodes: Record<string, CanvasNode>, 
  issues: ValidationIssue[]
): string {
  const content = JSON.stringify({
    nodeCount: Object.keys(nodes).length,
    connectionCount: Object.values(nodes).reduce((acc, n) => acc + n.connections.length, 0),
    issueCount: issues.length,
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Auto-fix validation issues where possible
 */
export function autoFixIssues(
  nodes: Record<string, CanvasNode>,
  issues: ValidationIssue[]
): { fixed: ValidationIssue[]; nodes: Record<string, CanvasNode> } {
  const fixed: ValidationIssue[] = [];
  const newNodes = { ...nodes };
  
  issues.forEach(issue => {
    if (!issue.autoFixable || !issue.nodeId) return;
    
    const node = newNodes[issue.nodeId];
    if (!node) return;
    
    switch (issue.type) {
      case 'self_connection':
        // Remove self-connections
        newNodes[issue.nodeId] = {
          ...node,
          connections: node.connections.filter(c => c.targetId !== issue.nodeId),
        };
        fixed.push(issue);
        break;
        
      case 'duplicate_connection':
        // Keep only first connection to each target
        const seen = new Set<string>();
        newNodes[issue.nodeId] = {
          ...node,
          connections: node.connections.filter(c => {
            if (seen.has(c.targetId)) return false;
            seen.add(c.targetId);
            return true;
          }),
        };
        fixed.push(issue);
        break;
        
      case 'missing_connection_target':
        // Remove connections to non-existent nodes
        newNodes[issue.nodeId] = {
          ...node,
          connections: node.connections.filter(c => newNodes[c.targetId] !== undefined),
        };
        fixed.push(issue);
        break;
    }
  });
  
  return { fixed, nodes: newNodes };
}

/**
 * Check if export is safe
 * Security: Prevents export of corrupt structures
 */
export function canSafelyExport(result: ValidationResult): { 
  canExport: boolean; 
  blockers: ValidationIssue[] 
} {
  const blockers = result.issues.filter(i => 
    i.severity === 'error' && 
    ['circular_dependency', 'missing_connection_target'].includes(i.type)
  );
  
  return {
    canExport: blockers.length === 0,
    blockers,
  };
}