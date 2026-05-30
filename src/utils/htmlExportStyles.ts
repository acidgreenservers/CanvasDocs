/**
 * HTML Export Styles Generator
 * 
 * Design: ShadowSign design system for exported HTML
 * Generates self-contained CSS matching the canvas UI
 */

import { escapeCss } from './htmlExportSecurity';

/**
 * Color palette matching DESIGN.md
 */
export const COLORS = {
  // Primary Actions
  electricBlue: '#3b6ef8',
  blueHover: '#2d5ce8',
  
  // Trust & Validation
  emeraldActive: '#22c55e',
  
  // Surfaces
  abyssNavy: '#0d1117',
  cardSurface: '#161b22',
  elevatedSurface: '#1c2128',
  
  // Borders
  standardBorder: '#30363d',
  subtleBorder: '#21262d',
  
  // Text
  primaryWhite: '#e6edf3',
  secondaryGray: '#8b949e',
  monospaceMuted: '#6e7681',
  labelUppercase: '#7d8590',
  
  // Node Types
  nodeSection: '#22c55e',
  nodeHeading: '#3b6ef8',
  nodeParagraph: '#8b5cf6',
  nodeCode: '#f59e0b',
  nodeList: '#ec4899',
  
  // Semantic
  warningAmber: '#f59e0b',
  dangerRed: '#f87171',
  codeCyan: '#58c4dc',
  hashGreen: '#3fb950',
} as const;

/**
 * Generates the complete CSS for HTML export
 */
export function generateExportStyles(config: {
  theme: 'dark' | 'light';
  includeStyles: boolean;
}): string {
  if (!config.includeStyles) {
    return '';
  }
  
  const isDark = config.theme === 'dark';
  
  // Theme-specific overrides
  const themeVars = isDark ? `
    --bg-primary: ${COLORS.abyssNavy};
    --bg-card: ${COLORS.cardSurface};
    --bg-elevated: ${COLORS.elevatedSurface};
    --text-primary: ${COLORS.primaryWhite};
    --text-secondary: ${COLORS.secondaryGray};
    --text-muted: ${COLORS.monospaceMuted};
    --border-color: ${COLORS.standardBorder};
  ` : `
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-elevated: #f1f5f9;
    --text-primary: #1e293b;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border-color: #e2e8f0;
  `;
  
  return `
/* CanvasDocs Export Styles - ShadowSign Design System */
:root {
  --electric-blue: ${COLORS.electricBlue};
  --emerald-active: ${COLORS.emeraldActive};
  --node-section: ${COLORS.nodeSection};
  --node-heading: ${COLORS.nodeHeading};
  --node-paragraph: ${COLORS.nodeParagraph};
  --node-code: ${COLORS.nodeCode};
  --node-list: ${COLORS.nodeList};
  --warning-amber: ${COLORS.warningAmber};
  --code-cyan: ${COLORS.codeCyan};
  --hash-green: ${COLORS.hashGreen};
  ${themeVars}
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SFMono-Regular', 'SF Mono', Menlo, Monaco, Consolas, monospace;
  --font-serif: Georgia, 'Times New Roman', 'Palatino Linotype', serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
}

/* Atmospheric glow background */
.atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(30, 50, 80, 0.6) 0%, transparent 60%);
}

/* Main container */
.export-container {
  position: relative;
  z-index: 1;
  max-width: 820px;
  margin: 0 auto;
  padding: 48px 24px;
}

/* Header */
.export-header {
  text-align: center;
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border-color);
}

.export-logo {
  font-size: 48px;
  margin-bottom: 16px;
}

.export-title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 28px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.export-subtitle {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.export-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.export-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.export-meta-item::before {
  content: '●';
  color: var(--emerald-active);
  font-size: 8px;
}

/* Node chain container */
.node-chain {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Connection line between nodes */
.connection-line {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 32px;
  position: relative;
}

.connection-line::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, var(--emerald-active), var(--electric-blue));
  transform: translateX(-50%);
}

.connection-line::after {
  content: '↓';
  position: relative;
  z-index: 1;
  background: var(--bg-card);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--emerald-active);
  border: 1px solid var(--border-color);
}

/* Node card */
.node-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border-color);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.node-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Node type accent bar */
.node-accent {
  height: 4px;
}

.node-card[data-type="section"] .node-accent { background: var(--node-section); }
.node-card[data-type="heading"] .node-accent { background: var(--node-heading); }
.node-card[data-type="paragraph"] .node-accent { background: var(--node-paragraph); }
.node-card[data-type="code"] .node-accent { background: var(--node-code); }
.node-card[data-type="list"] .node-accent { background: var(--node-list); }

/* Node type border colors */
.node-card[data-type="section"] { border-color: var(--node-section); }
.node-card[data-type="heading"] { border-color: var(--node-heading); }
.node-card[data-type="paragraph"] { border-color: var(--node-paragraph); }
.node-card[data-type="code"] { border-color: var(--node-code); }
.node-card[data-type="list"] { border-color: var(--node-list); }

/* Node header */
.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.node-type {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.node-card[data-type="section"] .node-type { color: var(--node-section); }
.node-card[data-type="heading"] .node-type { color: var(--node-heading); }
.node-card[data-type="paragraph"] .node-type { color: var(--node-paragraph); }
.node-card[data-type="code"] .node-type { color: var(--node-code); }
.node-card[data-type="list"] .node-type { color: var(--node-list); }

.node-depth {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  padding: 2px 8px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
}

/* Node content */
.node-content {
  padding: 20px;
}

.node-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.4;
}

.node-body {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.node-body code {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: var(--code-cyan);
}

.node-body pre {
  background: var(--bg-elevated);
  padding: 16px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid var(--border-color);
}

.node-body pre code {
  background: none;
  padding: 0;
  color: var(--text-primary);
}

/* Code node special styling */
.node-card[data-type="code"] .node-body {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--bg-elevated);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

/* Node footer */
.node-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.node-connections {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}

.node-connections strong {
  color: var(--emerald-active);
}

/* Metadata section */
.node-metadata {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.metadata-item {
  font-family: var(--font-mono);
  font-size: 10px;
}

.metadata-label {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 6px;
}

.metadata-value {
  color: var(--hash-green);
}

/* Footer */
.export-footer {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.footer-logo {
  font-size: 20px;
}

.footer-name {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.footer-tagline {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.footer-tagline span {
  color: var(--emerald-active);
}

/* Badge */
.local-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 9999px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--emerald-active);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.local-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--emerald-active);
}

/* Print styles */
@media print {
  .atmosphere {
    display: none;
  }
  
  body {
    background: white;
    color: black;
  }
  
  .node-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  .connection-line {
    height: 16px;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .export-container {
    padding: 24px 16px;
  }
  
  .export-title {
    font-size: 22px;
  }
  
  .node-title {
    font-size: 16px;
  }
  
  .node-content {
    padding: 16px;
  }
}
`.trim();
}

/**
 * Generates inline styles for a specific node type
 */
export function getNodeInlineStyles(nodeType: string): Record<string, string> {
  const colorMap: Record<string, string> = {
    section: COLORS.nodeSection,
    heading: COLORS.nodeHeading,
    paragraph: COLORS.nodeParagraph,
    code: COLORS.nodeCode,
    list: COLORS.nodeList,
  };
  
  const color = colorMap[nodeType] || COLORS.nodeParagraph;
  
  return {
    '--node-color': color,
    borderColor: color,
  };
}