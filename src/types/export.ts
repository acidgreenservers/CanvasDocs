/**
 * Export Types
 * 
 * Security: All export content is sanitized and validated
 * Structure: Typed export configurations and results
 */

export type ExportFormat = 'markdown' | 'json' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeDepthLabels: boolean;
  theme: 'dark' | 'light';
}

export interface ExportableNode {
  id: string;
  type: string;
  title: string;
  content: string;
  depth: number;
  connections: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  nodeCount: number;
  connectionCount: number;
  generatedAt: number;
}

export interface HTMLExportConfig {
  title: string;
  description?: string;
  theme: 'dark' | 'light';
  includeStyles: boolean;
  includeMetadata: boolean;
  showConnectionLines: boolean;
  showDepthIndicators: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'html',
  includeMetadata: false,
  includeTimestamps: false,
  includeDepthLabels: false,
  theme: 'dark',
};

export const DEFAULT_HTML_CONFIG: HTMLExportConfig = {
  title: 'CanvasDocs Export',
  theme: 'dark',
  includeStyles: true,
  includeMetadata: false,
  showConnectionLines: true,
  showDepthIndicators: true,
};