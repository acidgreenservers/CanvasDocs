/**
 * Zone Security Utilities
 * 
 * ATTRACTOR: "Space has meaning"
 * GROUNDING: Zone boundaries must be enforced to maintain semantic integrity
 * Security: All zone operations validate boundaries and permissions
 */

import { CanvasZone, ZoneValidationResult, ZonePermission, ZoneBoundaryError } from '../types/zones';
import { CanvasNode } from '../types/canvas';
import { generateSecureId } from './security';

// Minimum zone dimensions
const MIN_ZONE_WIDTH = 200;
const MIN_ZONE_HEIGHT = 150;
const MAX_ZONE_NAME_LENGTH = 50;

/**
 * Validate zone bounds
 * Security: Ensures zones have valid spatial definitions
 */
export function validateZoneBounds(bounds: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!bounds || typeof bounds !== 'object') {
    return { isValid: false, errors: ['Bounds must be an object'] };
  }
  
  const b = bounds as Record<string, unknown>;
  
  if (typeof b.x !== 'number' || b.x < 0) {
    errors.push('x must be a non-negative number');
  }
  if (typeof b.y !== 'number' || b.y < 0) {
    errors.push('y must be a non-negative number');
  }
  if (typeof b.width !== 'number' || b.width < MIN_ZONE_WIDTH) {
    errors.push(`width must be at least ${MIN_ZONE_WIDTH}`);
  }
  if (typeof b.height !== 'number' || b.height < MIN_ZONE_HEIGHT) {
    errors.push(`height must be at least ${MIN_ZONE_HEIGHT}`);
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate zone definition
 * Security: Full validation before zone creation
 */
export function validateZone(zone: unknown): ZoneValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!zone || typeof zone !== 'object') {
    return { isValid: false, errors: ['Zone must be an object'], warnings: [] };
  }
  
  const z = zone as Record<string, unknown>;
  
  // Validate name
  if (typeof z.name !== 'string' || z.name.trim().length === 0) {
    errors.push('Zone name is required');
  } else if (z.name.length > MAX_ZONE_NAME_LENGTH) {
    errors.push(`Zone name cannot exceed ${MAX_ZONE_NAME_LENGTH} characters`);
  }
  
  // Validate type
  const validTypes = ['draft', 'review', 'approved', 'final', 'archived'];
  if (!validTypes.includes(z.type as string)) {
    errors.push(`Invalid zone type: ${z.type}`);
  }
  
  // Validate bounds
  const boundsResult = validateZoneBounds(z.bounds);
  errors.push(...boundsResult.errors);
  
  // Validate permission
  const validPermissions: ZonePermission[] = ['edit', 'review', 'locked'];
  if (!validPermissions.includes(z.permission as ZonePermission)) {
    warnings.push(`Invalid permission "${z.permission}", defaulting to "edit"`);
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Check if a point is inside a zone
 */
export function isPointInZone(
  point: { x: number; y: number },
  zone: CanvasZone
): boolean {
  const { bounds } = zone;
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Check if a node is inside a zone
 */
export function isNodeInZone(node: CanvasNode, zone: CanvasZone): boolean {
  // Check node center point
  const nodeCenter = {
    x: node.position.x + 128, // Half node width
    y: node.position.y + 40,  // Half node height
  };
  
  return isPointInZone(nodeCenter, zone);
}

/**
 * Find which zone a node belongs to
 */
export function findNodeZone(
  node: CanvasNode,
  zones: Record<string, CanvasZone>
): CanvasZone | null {
  for (const zone of Object.values(zones)) {
    if (isNodeInZone(node, zone)) {
      return zone;
    }
  }
  return null;
}

/**
 * Check if a move would cross zone boundaries
 * Security: Prevents unauthorized zone transitions
 */
export function wouldCrossZoneBoundary(
  node: CanvasNode,
  newPosition: { x: number; y: number },
  zones: Record<string, CanvasZone>
): { crosses: boolean; fromZone: CanvasZone | null; toZone: CanvasZone | null } {
  const currentZone = findNodeZone(node, zones);
  
  // Create temporary node at new position
  const tempNode: CanvasNode = {
    ...node,
    position: newPosition,
  };
  
  const newZone = findNodeZone(tempNode, zones);
  
  return {
    crosses: currentZone?.id !== newZone?.id,
    fromZone: currentZone,
    toZone: newZone,
  };
}

/**
 * Validate zone transition
 * Security: Enforces transition rules between zones
 */
export function validateZoneTransition(
  node: CanvasNode,
  fromZone: CanvasZone | null,
  toZone: CanvasZone | null,
  requireExplicit: boolean = true
): { allowed: boolean; reason?: string } {
  // No zones involved - allowed
  if (!fromZone && !toZone) {
    return { allowed: true };
  }
  
  // Moving from no zone to a zone - allowed
  if (!fromZone && toZone) {
    return { allowed: true };
  }
  
  // Moving from a zone to no zone - check permission
  if (fromZone && !toZone) {
    if (fromZone.permission === 'locked') {
      return { 
        allowed: false, 
        reason: `Cannot move node from locked zone "${fromZone.name}"` 
      };
    }
    return { allowed: !requireExplicit };
  }
  
  // Moving between zones
  if (fromZone && toZone) {
    // Check if moving backwards in workflow
    if (toZone.order < fromZone.order) {
      return {
        allowed: false,
        reason: `Cannot move node backwards from "${fromZone.name}" to "${toZone.name}"`,
      };
    }
    
    // Check source zone permission
    if (fromZone.permission === 'locked') {
      return {
        allowed: false,
        reason: `Cannot move node from locked zone "${fromZone.name}"`,
      };
    }
    
    // Check destination zone permission
    if (toZone.permission === 'locked' && requireExplicit) {
      return {
        allowed: false,
        reason: `Cannot move node into locked zone "${toZone.name}" without explicit action`,
      };
    }
    
    return { allowed: !requireExplicit };
  }
  
  return { allowed: true };
}

/**
 * Create a new zone with validated properties
 */
export function createZone(
  name: string,
  type: CanvasZone['type'],
  bounds: CanvasZone['bounds'],
  options?: Partial<CanvasZone>
): CanvasZone {
  const validation = validateZone({ name, type, bounds, ...options });
  if (!validation.isValid) {
    throw new Error(`Invalid zone: ${validation.errors.join(', ')}`);
  }
  
  const now = Date.now();
  
  return {
    id: generateSecureId(),
    name: name.trim(),
    type,
    bounds,
    color: options?.color || '#6366f1',
    status: options?.status || 'active',
    permission: options?.permission || 'edit',
    order: options?.order ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Check for zone overlap
 * Security: Prevents zones from overlapping
 */
export function checkZoneOverlap(
  newZone: CanvasZone,
  existingZones: Record<string, CanvasZone>
): { overlaps: boolean; overlappingZones: CanvasZone[] } {
  const overlappingZones: CanvasZone[] = [];
  
  for (const zone of Object.values(existingZones)) {
    if (zone.id === newZone.id) continue;
    
    const a = newZone.bounds;
    const b = zone.bounds;
    
    const overlaps = !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
    
    if (overlaps) {
      overlappingZones.push(zone);
    }
  }
  
  return {
    overlaps: overlappingZones.length > 0,
    overlappingZones,
  };
}

/**
 * Get zone statistics
 */
export function getZoneStats(
  zone: CanvasZone,
  nodes: Record<string, CanvasNode>
): { nodeCount: number; connectionCount: number; nodeTypes: Record<string, number> } {
  const zoneNodes = Object.values(nodes).filter(n => isNodeInZone(n, zone));
  
  const nodeTypes: Record<string, number> = {};
  let connectionCount = 0;
  
  zoneNodes.forEach(node => {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    connectionCount += node.connections.length;
  });
  
  return {
    nodeCount: zoneNodes.length,
    connectionCount,
    nodeTypes,
  };
}