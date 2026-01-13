/**
 * Security Middleware
 * Additional security headers and protections beyond Helmet
 * OWASP Top 10 2024 compliant
 */

import type { Request, Response, NextFunction } from 'express'
import { createLogger } from '../lib/logger.js'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('security')

// =============================================================================
// SECURITY HEADERS
// =============================================================================

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID for tracing
  const requestId = req.headers['x-request-id'] as string || uuidv4()
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-ID', requestId)
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')
  
  // XSS Protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  
  // Cache control for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  next()
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /vbscript:/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi
]

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /(--|\*\/|\/\*)/g,
  /(\bOR\b|\bAND\b)\s+[\d\w'\"=]+\s*[=<>]/gi
]

/**
 * Sanitize string input - removes dangerous patterns
 */
export function sanitizeString(input: string): string {
  let sanitized = input
  
  // Remove dangerous HTML/JS patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
  
  return sanitized.trim()
}

/**
 * Check for SQL injection attempts
 */
export function detectSqlInjection(input: string): boolean {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true
    }
    pattern.lastIndex = 0 // Reset regex
  }
  return false
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  next()
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Check for SQL injection
      if (detectSqlInjection(value)) {
        logger.warn({ key }, 'SQL injection attempt detected')
        sanitized[key] = ''
      } else {
        sanitized[key] = sanitizeString(value)
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      )
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// =============================================================================
// IP VALIDATION
// =============================================================================

/**
 * Get real client IP (handles proxies)
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for']
  
  if (forwardedFor) {
    // Take first IP in chain (client IP)
    const ips = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0])
      .split(',')
      .map(ip => ip.trim())
    
    // Validate IP format
    const clientIp = ips[0]
    if (clientIp && isValidIp(clientIp)) {
      return clientIp
    }
  }
  
  return req.socket.remoteAddress || 'unknown'
}

function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === '127.0.0.1'
}

// =============================================================================
// URL VALIDATION (SSRF Prevention)
// =============================================================================

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254' // AWS metadata
]

const BLOCKED_PROTOCOLS = [
  'file:',
  'ftp:',
  'gopher:',
  'data:',
  'javascript:',
  'vbscript:'
]

/**
 * Validate URL is safe (SSRF prevention)
 */
export function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    
    // Check protocol
    if (BLOCKED_PROTOCOLS.includes(url.protocol)) {
      return false
    }
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }
    
    // Check hostname
    const hostname = url.hostname.toLowerCase()
    if (BLOCKED_HOSTS.includes(hostname)) {
      return false
    }
    
    // Check for private IPs
    if (isPrivateIp(hostname)) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

function isPrivateIp(hostname: string): boolean {
  // Check for private IP ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./
  ]
  
  return privateRanges.some(range => range.test(hostname))
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate token format (prevents injection)
 */
export function isValidToken(token: string): boolean {
  // CUID format: starts with 'c', 25 chars, alphanumeric
  const cuidRegex = /^c[a-z0-9]{24}$/
  // UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  return cuidRegex.test(token) || uuidRegex.test(token)
}
