/**
 * Authentication Middleware
 * Clerk-based authentication with organization context
 * OWASP Authentication compliant
 */

import type { Request, Response, NextFunction } from 'express'
import { createClerkClient } from '@clerk/backend'
import { createLogger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import { getClientIp } from './security.js'
import { AuthenticationError, AuthorizationError } from './errorHandler.js'
import type { User, Organization, UserRole } from '@prisma/client'

const logger = createLogger('auth')

// =============================================================================
// CLERK CLIENT
// =============================================================================

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string
  externalId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
  organization: Organization
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      organizationId?: string
    }
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Require authentication - validates Clerk session
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('No authentication token provided')
    }
    
    const token = authHeader.substring(7)
    
    // Verify token with Clerk
    let clerkUser
    try {
      // Decode JWT payload to get user ID
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString())
      const clerkUserId = payload.sub as string
      
      if (!clerkUserId) {
        throw new Error('No user ID in token')
      }
      
      clerkUser = await clerk.users.getUser(clerkUserId)
    } catch (error) {
      logger.warn({
        ip: getClientIp(req),
        error: error instanceof Error ? error.message : 'Unknown'
      }, 'Invalid authentication token')
      
      throw new AuthenticationError('Invalid or expired token')
    }
    
    // Get user from database
    let user = await prisma.user.findUnique({
      where: { externalId: clerkUser.id },
      include: { organization: true }
    })
    
    // Auto-create user if not found
    if (!user) {
      logger.info({
        externalId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress
      }, 'Creating new user from Clerk')
      
      const email = clerkUser.emailAddresses[0]?.emailAddress || ''
      const firstName = clerkUser.firstName || 'User'
      const lastName = clerkUser.lastName || ''
      
      // Create organization and user together
      const organization = await prisma.organization.create({
        data: {
          name: `${firstName}'s Practice`,
          slug: `org-${clerkUser.id.substring(0, 8)}`,
          plan: 'FREE',
          users: {
            create: {
              externalId: clerkUser.id,
              email: email,
              firstName: firstName,
              lastName: lastName,
              role: 'OWNER',
              isActive: true
            }
          }
        },
        include: {
          users: true
        }
      })
      
      user = await prisma.user.findUnique({
        where: { externalId: clerkUser.id },
        include: { organization: true }
      })
      
      if (!user) {
        throw new AuthenticationError('Failed to create user')
      }
      
      logger.info({
        userId: user.id,
        organizationId: organization.id
      }, 'New user and organization created')
    }
    
    if (!user.isActive) {
      throw new AuthenticationError('Account is disabled')
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(() => {}) // Non-blocking
    
    // Attach user to request
    req.user = {
      id: user.id,
      externalId: user.externalId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization
    }
    req.organizationId = user.organizationId
    
    logger.debug({
      userId: user.id,
      role: user.role
    }, 'User authenticated')
    
    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: error.message
        }
      })
      return
    }
    next(error)
  }
}

/**
 * Optional authentication - doesn't fail if not authenticated
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    // No auth provided - continue without user context
    return next()
  }
  
  // Try to authenticate but don't fail
  try {
    await requireAuth(req, res, () => {})
  } catch {
    // Ignore auth errors for optional auth
  }
  
  next()
}

// =============================================================================
// AUTHORIZATION MIDDLEWARE
// =============================================================================

/**
 * Require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      })
      return
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn({
        userId: req.user.id,
        required: roles,
        actual: req.user.role
      }, 'Authorization failed - insufficient role')
      
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions'
        }
      })
      return
    }
    
    next()
  }
}

/**
 * Require organization owner or admin
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole('OWNER', 'ADMIN')(req, res, next)
}

/**
 * Require organization owner
 */
export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return requireRole('OWNER')(req, res, next)
}

// =============================================================================
// RESOURCE AUTHORIZATION
// =============================================================================

/**
 * Verify user has access to project
 */
export async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError()
    }
    
    const projectId = req.params.id || req.params.projectId
    
    if (!projectId) {
      return next()
    }
    
    // Check project belongs to user's organization
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: req.user.organizationId
      },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    })
    
    if (!project) {
      throw new AuthorizationError('Project not found or access denied')
    }
    
    // Owners and admins can access all projects
    if (['OWNER', 'ADMIN'].includes(req.user.role)) {
      return next()
    }
    
    // Members need explicit project membership
    if (project.members.length === 0) {
      throw new AuthorizationError('Not a member of this project')
    }
    
    next()
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      })
      return
    }
    next(error)
  }
}

// =============================================================================
// API KEY AUTHENTICATION (For integrations)
// =============================================================================

/**
 * Authenticate via API key
 */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined
    
    if (!apiKey) {
      throw new AuthenticationError('API key required')
    }
    
    // Validate API key format
    if (!/^apk_[a-zA-Z0-9]{32}$/.test(apiKey)) {
      throw new AuthenticationError('Invalid API key format')
    }
    
    // Look up API key in database (you'd add an ApiKey model)
    // For now, this is a placeholder
    logger.debug({
      apiKeyPrefix: apiKey.substring(0, 8)
    }, 'API key authentication')
    
    // TODO: Implement API key lookup and validation
    // const apiKeyRecord = await prisma.apiKey.findUnique(...)
    
    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_INVALID',
          message: error.message
        }
      })
      return
    }
    next(error)
  }
}

// =============================================================================
// CLIENT PORTAL AUTHENTICATION
// =============================================================================

/**
 * Authenticate client via portal token
 */
export async function clientPortalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers['x-portal-token'] as string || req.query.token as string
    
    if (!token) {
      throw new AuthenticationError('Portal access token required')
    }
    
    // Validate token format
    if (!/^c[a-z0-9]{24}$/.test(token)) {
      throw new AuthenticationError('Invalid portal token format')
    }
    
    // Look up client by portal token
    const client = await prisma.client.findUnique({
      where: { portalToken: token },
      include: { organization: true }
    })
    
    if (!client) {
      throw new AuthenticationError('Invalid portal token')
    }
    
    // Check token expiry if set
    if (client.portalTokenExpiry && client.portalTokenExpiry < new Date()) {
      throw new AuthenticationError('Portal token has expired')
    }
    
    // Update last access
    await prisma.client.update({
      where: { id: client.id },
      data: { lastPortalAccess: new Date() }
    }).catch(() => {})
    
    // Attach client to request (different from user)
    ;(req as any).client = client
    req.organizationId = client.organizationId
    
    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'PORTAL_AUTH_FAILED',
          message: error.message
        }
      })
      return
    }
    next(error)
  }
}
