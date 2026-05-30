/**
 * Security utilities for CanvasDocs
 * All user input flows through these functions
 * Security invariant: No unsanitized content reaches the DOM or exports
 */

/**
 * Validation result for content security checks
 * Security: Separate from structural validation to avoid circular dependencies
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedContent: string | null;
}

// HTML entity escaping for XSS prevention
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Sanitizes user input to prevent XSS attacks
 * Security: All user content must pass through this
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Validates and sanitizes content for safe rendering
 * Security: Double validation layer for defense in depth
 */
export function validateContent(content: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (typeof content !== 'string') {
    return { isValid: false, errors: ['Content must be a string'], sanitizedContent: null };
  }
  
  // Length boundary check
  if (content.length > 50000) {
    errors.push('Content exceeds maximum length of 50000 characters');
  }
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:/i,
  ];
  
  dangerousPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      errors.push(`Content contains potentially unsafe pattern: ${pattern.source}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedContent: sanitizeInput(content),
  };
}

/**
 * Generates a cryptographically secure random ID
 * Security: Prevents ID prediction attacks
 */
export function generateSecureId(): string {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => n.toString(16)).join('-');
}

/**
 * Validates node ID format to prevent injection
 * Security: Ensures IDs match expected pattern
 */
export function isValidNodeId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-f0-9\-]{35}$/.test(id);
}

/**
 * Sanitizes markdown output for safe export
 * Security: Ensures exported content is safe for file systems
 */
export function sanitizeForExport(content: string): string {
  // Remove any null bytes and control characters
  return content.replace(/[\x00-\x1F\x7F]/g, '');
}