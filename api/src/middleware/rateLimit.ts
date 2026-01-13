/**
 * Rate Limiting Middleware
 * Prevents brute force and DDoS attacks
 * OWASP compliant
 */

import type { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { createLogger } from '../lib/logger.js'
import { getClientIp } from './security.js'

const logger = createLogger('rateLimit')

// =============================================================================
// CONFIGURATION
// =============================================================================

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_GENERAL = 100 // 100 requests per minute
const MAX_REQUESTS_AUTH = 10 // 10 auth attempts per minute
const MAX_REQUESTS_APPROVAL = 20 // 20 approval actions per minute

// =============================================================================
// GENERAL RATE LIMITER
// =============================================================================

export const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS_GENERAL,
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom key generator (use real client IP)
  keyGenerator: (req: Request): string => {
    return getClientIp(req)
  },
  
  // Skip successful requests for certain endpoints
  skip: (req: Request): boolean => {
    // Don't rate limit health checks
    return req.path === '/api/health'
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response): void => {
    logger.warn({
      ip: getClientIp(req),
      path: req.path,
      method: req.method
    }, 'Rate limit exceeded')
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(WINDOW_MS / 1000)
      }
    })
  },
  
  // Store in memory (use Redis in production for multi-instance)
  // store: new RedisStore({ ... })
})

// =============================================================================
// AUTH RATE LIMITER (Stricter)
// =============================================================================

export const authRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    // Rate limit by IP + email combination for login
    const email = req.body?.email || ''
    return `${getClientIp(req)}:${email}`
  },
  
  handler: (req: Request, res: Response): void => {
    logger.warn({
      ip: getClientIp(req),
      path: req.path
    }, 'Auth rate limit exceeded')
    
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT',
        message: 'Too many authentication attempts. Please try again in a minute.',
        retryAfter: 60
      }
    })
  },
  
  // Skip if already authenticated
  skip: (req: Request): boolean => {
    return !!req.headers.authorization
  }
})

// =============================================================================
// APPROVAL RATE LIMITER
// =============================================================================

export const approvalRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS_APPROVAL,
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    // Rate limit by token to prevent approval spam
    const token = req.params.token || ''
    return `approval:${token}:${getClientIp(req)}`
  },
  
  handler: (req: Request, res: Response): void => {
    logger.warn({
      ip: getClientIp(req),
      token: req.params.token
    }, 'Approval rate limit exceeded')
    
    res.status(429).json({
      success: false,
      error: {
        code: 'APPROVAL_RATE_LIMIT',
        message: 'Too many approval requests. Please wait a moment.',
        retryAfter: 60
      }
    })
  }
})

// =============================================================================
// API KEY RATE LIMITER (For integrations)
// =============================================================================

export const apiKeyRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 1000, // Higher limit for API integrations
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    // Rate limit by API key
    const apiKey = req.headers['x-api-key'] as string || ''
    return `api:${apiKey}`
  },
  
  handler: (req: Request, res: Response): void => {
    logger.warn({
      apiKey: req.headers['x-api-key']?.toString().substring(0, 8) + '...'
    }, 'API rate limit exceeded')
    
    res.status(429).json({
      success: false,
      error: {
        code: 'API_RATE_LIMIT',
        message: 'API rate limit exceeded',
        retryAfter: 60
      }
    })
  },
  
  skip: (req: Request): boolean => {
    return !req.headers['x-api-key']
  }
})

// =============================================================================
// SLIDING WINDOW RATE LIMITER (More precise)
// =============================================================================

interface RateLimitEntry {
  count: number
  timestamps: number[]
}

const slidingWindowStore = new Map<string, RateLimitEntry>()

/**
 * Sliding window rate limiter for sensitive operations
 */
export function slidingWindowRateLimiter(
  maxRequests: number,
  windowSeconds: number
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${getClientIp(req)}:${req.path}`
    const now = Date.now()
    const windowStart = now - (windowSeconds * 1000)
    
    // Get or create entry
    let entry = slidingWindowStore.get(key)
    
    if (!entry) {
      entry = { count: 0, timestamps: [] }
      slidingWindowStore.set(key, entry)
    }
    
    // Remove timestamps outside window
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)
    entry.count = entry.timestamps.length
    
    // Check limit
    if (entry.count >= maxRequests) {
      const oldestInWindow = entry.timestamps[0] || now
      const retryAfter = Math.ceil((oldestInWindow + (windowSeconds * 1000) - now) / 1000)
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          retryAfter
        }
      })
      return
    }
    
    // Add current timestamp
    entry.timestamps.push(now)
    entry.count++
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      cleanupSlidingWindowStore(windowSeconds)
    }
    
    next()
  }
}

function cleanupSlidingWindowStore(windowSeconds: number): void {
  const cutoff = Date.now() - (windowSeconds * 1000 * 2) // Double the window for safety
  
  for (const [key, entry] of slidingWindowStore.entries()) {
    const latestTimestamp = entry.timestamps[entry.timestamps.length - 1] || 0
    if (latestTimestamp < cutoff) {
      slidingWindowStore.delete(key)
    }
  }
}
