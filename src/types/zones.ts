/**
 * Zone Type Definitions
 * 
 * ATTRACTOR: "Space has meaning"
 * GROUNDING: Spatial position signals document maturity/status
 * Security: Zone boundaries enforced; transitions require explicit action
 */

import { ZoneType } from './canvas';

// Zone status for workflow tracking
export type ZoneStatus = 'active' | 'archived' | 'locked';

// Zone permission levels
export type ZonePermission = 
  | 'edit'      // Full edit access
  | 'review'    // Can view and comment
  | 'locked';   // Read-only

// Zone definition
export interface CanvasZone {
  id: string;
  name: string;
  type: ZoneType;
  
  // Spatial bounds
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Visual styling
  color: string;
  icon?: string;
  
  // Workflow properties
  status: ZoneStatus;
  permission: ZonePermission;
  
  // Ordering (for workflow progression)
  order: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  
  // Node count (derived)
  nodeCount?: number;
}

// Zone transition rules
export interface ZoneTransition {
  fromZoneId: string;
  toZoneId: string;
  allowed: boolean;
  requiresApproval: boolean;
}

// Zone validation result
export interface ZoneValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Zone configuration by type
export const ZONE_TYPE_CONFIGS: Record<ZoneType, {
  label: string;
  description: string;
  defaultColor: string;
  defaultPermission: ZonePermission;
  workflowOrder: number;
}> = {
  draft: {
    label: 'Draft',
    description: 'Work in progress',
    defaultColor: '#6366f1', // indigo
    defaultPermission: 'edit',
    workflowOrder: 0,
  },
  review: {
    label: 'Review',
    description: 'Awaiting review',
    defaultColor: '#f59e0b', // amber
    defaultPermission: 'review',
    workflowOrder: 1,
  },
  approved: {
    label: 'Approved',
    description: 'Reviewed and approved',
    defaultColor: '#10b981', // emerald
    defaultPermission: 'edit',
    workflowOrder: 2,
  },
  final: {
    label: 'Final',
    description: 'Completed and finalized',
    defaultColor: '#3b82f6', // blue
    defaultPermission: 'locked',
    workflowOrder: 3,
  },
  archived: {
    label: 'Archived',
    description: 'Historical reference',
    defaultColor: '#64748b', // slate
    defaultPermission: 'locked',
    workflowOrder: 4,
  },
};

// Default zone layout (horizontal workflow)
export const DEFAULT_ZONES: Omit<CanvasZone, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Draft',
    type: 'draft',
    bounds: { x: 0, y: 0, width: 400, height: 600 },
    color: '#6366f1',
    status: 'active',
    permission: 'edit',
    order: 0,
  },
  {
    name: 'Review',
    type: 'review',
    bounds: { x: 420, y: 0, width: 400, height: 600 },
    color: '#f59e0b',
    status: 'active',
    permission: 'review',
    order: 1,
  },
  {
    name: 'Final',
    type: 'final',
    bounds: { x: 840, y: 0, width: 400, height: 600 },
    color: '#3b82f6',
    status: 'active',
    permission: 'locked',
    order: 2,
  },
];

// Zone boundary error
export class ZoneBoundaryError extends Error {
  constructor(
    message: string,
    public readonly fromZone: string,
    public readonly toZone: string,
    public readonly nodeId: string
  ) {
    super(message);
    this.name = 'ZoneBoundaryError';
  }
}