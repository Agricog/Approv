/**
 * CSRF Protection Middleware
 * Secure token-based CSRF protection
 * OWASP compliant
 */

import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { createLogger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import { getClientIp } from './security.js'

const logger = createLogger('csrf')

// =============================================================================
// CONFIGURATION
// =============================================================================

const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY_SECONDS = 3600 // 1 hour
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_COOKIE_NAME = '__csrf'

// Methods that require CSRF validation
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Hash token for storage (one-way)
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * CSRF Protection Middleware
 * - Validates token on protected methods
 * - Uses double-submit cookie pattern
 */
export async function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip validation for safe methods
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next()
  }
  
  try {
    // Get token from header
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined
    
    if (!headerToken) {
      logger.warn({
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      }, 'CSRF token missing')
      
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_MISSING',
          message: 'CSRF token is required'
        }
      })
      return
    }
    
    // Validate token format
    if (!/^[a-f0-9]{64}$/.test(headerToken)) {
      logger.warn({
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      }, 'CSRF token invalid format')
      
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'Invalid CSRF token format'
        }
      })
      return
    }
    
    // Hash the received token to compare with stored hash
    const tokenHash = hashToken(headerToken)
    
    // Look up token in database
    const storedToken = await prisma.csrfToken.findUnique({
      where: { token: tokenHash }
    })
    
    if (!storedToken) {
      logger.warn({
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      }, 'CSRF token not found')
      
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'Invalid CSRF token'
        }
      })
      return
    }
    
    // Check expiry
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.csrfToken.delete({
        where: { id: storedToken.id }
      }).catch(() => {}) // Ignore deletion errors
      
      logger.warn({
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      }, 'CSRF token expired')
      
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_EXPIRED',
          message: 'CSRF token has expired'
        }
      })
      return
    }
    
    // Token is valid - proceed
    next()
    
  } catch (error) {
    logger.error({ error }, 'CSRF validation error')
    next(error)
  }
}

// =============================================================================
// TOKEN ENDPOINT HANDLER
// =============================================================================

/**
 * Generate and return a new CSRF token
 */
export async function getCsrfToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Generate new token
    const token = generateCsrfToken()
    const tokenHash = hashToken(token)
    
    // Calculate expiry
    const expiresAt = new Date(Date.now() + CSRF_TOKEN_EXPIRY_SECONDS * 1000)
    
    // Store hashed token
    await prisma.csrfToken.create({
      data: {
        token: tokenHash,
        expiresAt,
        sessionId: req.headers['x-session-id'] as string || null
      }
    })
    
    // Clean up old tokens periodically (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupExpiredTokens().catch(err => 
        logger.error({ error: err }, 'Token cleanup failed')
      )
    }
    
    // Set cookie for double-submit pattern
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_EXPIRY_SECONDS * 1000,
      path: '/'
    })
    
    // Return token in response
    res.json({
      token,
      expiresIn: CSRF_TOKEN_EXPIRY_SECONDS
    })
    
  } catch (error) {
    logger.error({ error }, 'Failed to generate CSRF token')
    res.status(500).json({
      success: false,
      error: {
        code: 'CSRF_GENERATION_FAILED',
        message: 'Failed to generate CSRF token'
      }
    })
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up expired CSRF tokens
 */
async function cleanupExpiredTokens(): Promise<void> {
  const deleted = await prisma.csrfToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  })
  
  if (deleted.count > 0) {
    logger.info({ count: deleted.count }, 'Cleaned up expired CSRF tokens')
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { CSRF_HEADER_NAME, CSRF_TOKEN_EXPIRY_SECONDS }
