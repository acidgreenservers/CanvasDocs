/**
 * Built-in Templates
 * 
 * ATTRACTOR: "Structure repeats"
 * GROUNDING: Common document patterns encoded as validated templates
 * Security: All templates validated at build time
 */

import { NodeTemplate } from '../types/templates';

// RFC Document Template
export const RFC_TEMPLATE: NodeTemplate = {
  metadata: {
    id: 'builtin-rfc-001',
    name: 'RFC Document',
    description: 'Request for Comments document structure with standard sections',
    category: 'document',
    tags: ['rfc', 'specification', 'standards'],
    author: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    version: '1.0.0',
  },
  nodes: [
    {
      type: 'section',
      title: 'Title',
      content: '{{title}}',
      positionOffset: { x: 0, y: 0 },
      connections: [{ targetIndex: 1, type: 'follows' }],
    },
    {
      type: 'heading',
      title: 'Abstract',
      content: 'Summary of the proposal',
      positionOffset: { x: 320, y: 0 },
      connections: [{ targetIndex: 2, type: 'follows' }],
    },
    {
      type: 'paragraph',
      title: 'Abstract Content',
      content: '{{abstract}}',
      positionOffset: { x: 640, y: 0 },
      connections: [],
    },
  ],
  contentHash: '', // Computed on load
};

// README Template
export const README_TEMPLATE: NodeTemplate = {
  metadata: {
    id: 'builtin-readme-001',
    name: 'README Document',
    description: 'Standard README structure for open source projects',
    category: 'document',
    tags: ['readme', 'documentation', 'open-source'],
    author: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    version: '1.0.0',
  },
  nodes: [
    {
      type: 'section',
      title: 'Project Title',
      content: '# {{project_name}}',
      positionOffset: { x: 0, y: 0 },
      connections: [{ targetIndex: 1, type: 'follows' }],
    },
    {
      type: 'paragraph',
      title: 'Description',
      content: '{{description}}',
      positionOffset: { x: 320, y: 0 },
      connections: [{ targetIndex: 2, type: 'follows' }],
    },
    {
      type: 'heading',
      title: 'Installation',
      content: '## Installation',
      positionOffset: { x: 640, y: 0 },
      connections: [{ targetIndex: 3, type: 'extends' }],
    },
    {
      type: 'code',
      title: 'Install Command',
      content: 'npm install {{package_name}}',
      positionOffset: { x: 960, y: 0 },
      connections: [],
    },
  ],
  contentHash: '', // Computed on load
};

// API Documentation Template
export const API_DOC_TEMPLATE: NodeTemplate = {
  metadata: {
    id: 'builtin-api-001',
    name: 'API Documentation',
    description: 'REST API endpoint documentation structure',
    category: 'section',
    tags: ['api', 'rest', 'documentation'],
    author: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    version: '1.0.0',
  },
  nodes: [
    {
      type: 'section',
      title: 'Endpoint',
      content: '{{method}} {{endpoint}}',
      positionOffset: { x: 0, y: 0 },
      connections: [{ targetIndex: 1, type: 'follows' }],
    },
    {
      type: 'heading',
      title: 'Description',
      content: 'What this endpoint does',
      positionOffset: { x: 320, y: 0 },
      connections: [{ targetIndex: 2, type: 'extends' }],
    },
    {
      type: 'paragraph',
      title: 'Details',
      content: '{{description}}',
      positionOffset: { x: 640, y: 0 },
      connections: [{ targetIndex: 3, type: 'references' }],
    },
    {
      type: 'code',
      title: 'Response',
      content: '{\n  "status": "success"\n}',
      positionOffset: { x: 960, y: 0 },
      connections: [],
    },
  ],
  contentHash: '', // Computed on load
};

// Decision Record Template
export const DECISION_RECORD_TEMPLATE: NodeTemplate = {
  metadata: {
    id: 'builtin-decision-001',
    name: 'Decision Record',
    description: 'Architecture Decision Record (ADR) structure',
    category: 'document',
    tags: ['adr', 'decision', 'architecture'],
    author: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    version: '1.0.0',
  },
  nodes: [
    {
      type: 'section',
      title: 'Decision',
      content: '# {{decision_title}}',
      positionOffset: { x: 0, y: 0 },
      connections: [{ targetIndex: 1, type: 'follows' }],
    },
    {
      type: 'heading',
      title: 'Context',
      content: '## Context',
      positionOffset: { x: 320, y: 0 },
      connections: [{ targetIndex: 2, type: 'extends' }],
    },
    {
      type: 'paragraph',
      title: 'Context Details',
      content: '{{context}}',
      positionOffset: { x: 640, y: 0 },
      connections: [],
    },
  ],
  contentHash: '', // Computed on load
};

// All built-in templates
export const BUILT_IN_TEMPLATES: NodeTemplate[] = [
  RFC_TEMPLATE,
  README_TEMPLATE,
  API_DOC_TEMPLATE,
  DECISION_RECORD_TEMPLATE,
];

/**
 * Initialize built-in templates with content hashes
 * Security: Called once at application startup
 */
export async function initializeBuiltInTemplates(): Promise<NodeTemplate[]> {
  const { computeTemplateHash } = await import('../utils/templateSecurity');
  
  const initializedTemplates = await Promise.all(
    BUILT_IN_TEMPLATES.map(async (template) => {
      const contentHash = await computeTemplateHash({
        metadata: template.metadata,
        nodes: template.nodes,
      });
      
      return {
        ...template,
        contentHash,
      };
    })
  );
  
  return initializedTemplates;
}