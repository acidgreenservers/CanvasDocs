/**
 * HTML Export Security Utilities
 * 
 * Security: All content is escaped and validated before HTML generation
 * Prevents XSS attacks through malicious node content
 */

/**
 * Escapes HTML special characters
 * Security: Prevents XSS injection in exported HTML
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

/**
 * Escapes CSS special characters for safe inline styles
 */
export function escapeCss(unsafe: string): string {
  return unsafe
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Escapes JavaScript string content
 */
export function escapeJs(unsafe: string): string {
  return unsafe
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

/**
 * Validates and sanitizes a string for HTML attribute use
 */
export function sanitizeAttribute(value: string): string {
  // Remove any characters that could break out of attributes
  return value
    .replace(/[<>"'&]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .slice(0, 256); // Limit length
}

/**
 * Validates a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Validates a CSS property name
 */
export function isValidCssProperty(prop: string): boolean {
  return /^[a-z-]+$/.test(prop) && prop.length < 64;
}

/**
 * Sanitizes URL for safe use (prevents javascript: URLs)
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application',
  ];
  
  if (dangerousProtocols.some(p => trimmed.startsWith(p))) {
    return '#';
  }
  
  return url;
}

/**
 * Generates a secure nonce for inline styles (if CSP is used)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Content security policy for exported HTML
 */
export const EXPORT_CSP = `
  default-src 'none';
  style-src 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self' https:;
`.trim();