/**
 * Error Handler Middleware
 * Centralized error handling with PII protection
 * OWASP compliant - never expose internal errors to clients
 */

import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import * as Sentry from '@sentry/node'
import { createLogger } from '../lib/logger.js'
import { getClientIp } from './security.js'

const logger = createLogger('errorHandler')

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public isOperational = true
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'AUTHENTICATION_REQUIRED', message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(403, 'PERMISSION_DENIED', message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests', { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message = 'External service error') {
    super(502, 'EXTERNAL_SERVICE_ERROR', message, { service })
    this.name = 'ExternalServiceError'
  }
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default error values
  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'
  let details: Record<string, unknown> | undefined

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode
    code = error.code
    message = error.message
    details = error.details
    
    // Log operational errors at warn level
    if (error.isOperational) {
      logger.warn({
        error: {
          name: error.name,
          code: error.code,
          message: error.message
        },
        request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req)
        }
      }, 'Operational error')
    }
  } else if (error instanceof ZodError) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = 'Invalid request data'
    details = Object.fromEntries(
      error.issues.map(issue => [issue.path.join('.'), issue.message])
    )
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma errors
    const prismaError = handlePrismaError(error)
    statusCode = prismaError.statusCode
    code = prismaError.code
    message = prismaError.message
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = 'Invalid data provided'
  } else {
    // Unknown error - log full details but don't expose to client
    logger.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        requestId: req.headers['x-request-id']
      }
    }, 'Unhandled error')
    
    // Capture in Sentry
    Sentry.captureException(error, {
      tags: {
        path: req.path,
        method: req.method
      },
      extra: {
        requestId: req.headers['x-request-id']
      }
    })
  }

  // Never expose stack traces or internal details in production
  if (process.env.NODE_ENV === 'production') {
    // Only include details for validation errors
    if (code !== 'VALIDATION_ERROR') {
      details = undefined
    }
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(req.headers['x-request-id'] && { requestId: req.headers['x-request-id'] })
    }
  })
}

// =============================================================================
// 404 HANDLER
// =============================================================================

export function notFoundHandler(req: Request, res: Response): void {
  logger.debug({
    method: req.method,
    path: req.path,
    ip: getClientIp(req)
  }, 'Route not found')

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  })
}

// =============================================================================
// PRISMA ERROR HANDLER
// =============================================================================

interface ParsedPrismaError {
  statusCode: number
  code: string
  message: string
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): ParsedPrismaError {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field'
      return {
        statusCode: 409,
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${target} already exists`
      }
    
    case 'P2003':
      // Foreign key constraint violation
      return {
        statusCode: 400,
        code: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist'
      }
    
    case 'P2025':
      // Record not found
      return {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Record not found'
      }
    
    case 'P2014':
      // Required relation violation
      return {
        statusCode: 400,
        code: 'RELATION_ERROR',
        message: 'Required relation is missing'
      }
    
    default:
      logger.error({ error }, 'Unhandled Prisma error')
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred'
      }
  }
}

// =============================================================================
// ASYNC HANDLER WRAPPER
// =============================================================================

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
