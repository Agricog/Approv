/**
 * Sanitization Utilities
 * DOMPurify wrapper for XSS protection
 * Use for any user-generated content displayed in the UI
 */

import DOMPurify from 'dompurify'

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Strict config - removes all HTML, keeps only text
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true
}

/**
 * Basic config - allows basic formatting only
 */
const BASIC_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true
}

/**
 * Rich config - allows more formatting (for admin content)
 */
const RICH_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'br', 'p', 'span',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'blockquote', 'code', 'pre'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize text - removes ALL HTML tags
 * Use for: user names, project names, single-line inputs
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return DOMPurify.sanitize(input.trim(), STRICT_CONFIG)
}

/**
 * Sanitize with basic formatting allowed
 * Use for: notes, comments, short descriptions
 */
export function sanitizeBasic(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return DOMPurify.sanitize(input.trim(), BASIC_CONFIG)
}

/**
 * Sanitize with rich formatting allowed
 * Use for: admin-created content, help text
 * DO NOT use for user-generated content
 */
export function sanitizeRich(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Force external links to open in new tab with security attributes
  const sanitized = DOMPurify.sanitize(input.trim(), RICH_CONFIG)
  
  // Add rel="noopener noreferrer" to all links
  return sanitized.replace(
    /<a\s+href=/gi,
    '<a rel="noopener noreferrer" href='
  )
}

/**
 * Sanitize URL - validates and sanitizes URLs
 * Prevents javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = trimmed.toLowerCase()
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''
    }
  }

  // Allow only http, https, mailto, tel
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:']
  const hasAllowedProtocol = allowedProtocols.some(p => lowerUrl.startsWith(p))
  
  // If no protocol, assume relative URL (must start with /)
  if (!hasAllowedProtocol && !trimmed.startsWith('/')) {
    return ''
  }

  return trimmed
}

/**
 * Sanitize filename - removes path traversal and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  return filename
    // Remove path traversal
    .replace(/\.\./g, '')
    // Remove directory separators
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Keep only safe characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove multiple underscores
    .replace(/_{2,}/g, '_')
    // Limit length
    .substring(0, 100)
}

/**
 * Sanitize object - recursively sanitizes all string values
 * Use for: API response data before rendering
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' 
          ? sanitizeText(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      )
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Safely set innerHTML with sanitization
 * Returns sanitized HTML string for dangerouslySetInnerHTML
 */
export function createSafeHtml(html: string, allowRich: boolean = false): { __html: string } {
  const sanitized = allowRich ? sanitizeRich(html) : sanitizeBasic(html)
  return { __html: sanitized }
}

/**
 * Truncate text safely (preserves word boundaries)
 */
export function truncateText(text: string, maxLength: number): string {
  const sanitized = sanitizeText(text)
  
  if (sanitized.length <= maxLength) {
    return sanitized
  }

  // Find last space before maxLength
  const truncated = sanitized.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

// =============================================================================
// ENCODING UTILITIES
// =============================================================================

/**
 * Encode for use in HTML attributes
 */
export function encodeHtmlAttribute(value: string): string {
  return sanitizeText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Encode for use in URLs (query parameters)
 */
export function encodeUrlParam(value: string): string {
  return encodeURIComponent(sanitizeText(value))
}

/**
 * Decode URL parameter safely
 */
export function decodeUrlParam(value: string): string {
  try {
    return sanitizeText(decodeURIComponent(value))
  } catch {
    return ''
  }
}
