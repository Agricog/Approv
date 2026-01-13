/**
 * Validation Middleware
 * Zod-based request validation with strict schemas
 * OWASP Input Validation compliant
 */

import type { Request, Response, NextFunction } from 'express'
import { z, ZodError, ZodSchema } from 'zod'
import { createLogger } from '../lib/logger.js'
import { getClientIp } from './security.js'

const logger = createLogger('validation')

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

interface ValidationSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

/**
 * Create validation middleware from Zod schemas
 */
export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body)
      }
      
      // Validate query params
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query)
      }
      
      // Validate URL params
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params)
      }
      
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({
          ip: getClientIp(req),
          path: req.path,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        }, 'Validation failed')
        
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: formatZodErrors(error)
          }
        })
        return
      }
      
      next(error)
    }
  }
}

/**
 * Format Zod errors for API response
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    formatted[path] = issue.message
  }
  
  return formatted
}

// Alias for convenience
export const requestValidator = validate

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

// ID schemas
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format')
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const idSchema = z.union([cuidSchema, uuidSchema])

// Token schema (CUID or UUID)
export const tokenSchema = z.string().min(20).max(50).regex(
  /^[a-zA-Z0-9-_]+$/,
  'Invalid token format'
)

// Email schema (strict)
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email too long')
  .transform(val => val.toLowerCase().trim())

// Phone schema (UK format)
export const phoneSchema = z.string()
  .regex(/^(\+44|0)[1-9]\d{9,10}$/, 'Invalid UK phone number')
  .optional()

// URL schema (safe URLs only)
export const urlSchema = z.string()
  .url('Invalid URL')
  .refine(url => {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }, 'Only HTTP/HTTPS URLs allowed')

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

// Sort schema
export const sortSchema = z.object({
  sortField: z.string().max(50).optional(),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
})

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate)
  }
  return true
}, 'Start date must be before end date')

// =============================================================================
// APPROVAL SCHEMAS
// =============================================================================

export const approvalSchemas = {
  // GET /approvals/:token
  getByToken: {
    params: z.object({
      token: tokenSchema
    })
  },
  
  // POST /approvals/:token/respond
  respond: {
    params: z.object({
      token: tokenSchema
    }),
    body: z.object({
      action: z.enum(['approve', 'request_changes'], {
        errorMap: () => ({ message: 'Action must be "approve" or "request_changes"' })
      }),
      notes: z.string()
        .max(2000, 'Notes must be under 2000 characters')
        .optional()
        .transform(val => val?.trim())
    }).refine(data => {
      // Notes required for changes_requested
      if (data.action === 'request_changes' && (!data.notes || data.notes.length < 10)) {
        return false
      }
      return true
    }, {
      message: 'Please provide at least 10 characters explaining the changes needed',
      path: ['notes']
    })
  },
  
  // POST /approvals/:token/view
  trackView: {
    params: z.object({
      token: tokenSchema
    })
  }
}

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const projectSchemas = {
  // GET /projects
  list: {
    query: paginationSchema.merge(sortSchema).merge(z.object({
      status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
      stage: z.enum(['INITIAL_DRAWINGS', 'DETAILED_DESIGN', 'PLANNING_PACK', 'FINAL_APPROVAL']).optional(),
      clientId: cuidSchema.optional(),
      search: z.string().max(100).optional()
    }))
  },
  
  // GET /projects/:id
  getById: {
    params: z.object({
      id: cuidSchema
    })
  },
  
  // POST /projects
  create: {
    body: z.object({
      name: z.string()
        .min(3, 'Project name must be at least 3 characters')
        .max(200, 'Project name must be under 200 characters')
        .transform(val => val.trim()),
      reference: z.string()
        .regex(/^[A-Z0-9-]+$/, 'Reference must be uppercase letters, numbers, and dashes only')
        .max(50)
        .optional(),
      description: z.string().max(2000).optional(),
      address: z.string().max(500).optional(),
      clientId: cuidSchema.optional(),
      // Or create new client
      client: z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: emailSchema,
        company: z.string().max(200).optional(),
        phone: phoneSchema
      }).optional(),
      targetCompletionDate: z.string().datetime().optional()
    }).refine(data => {
      // Must have either clientId or client details
      return data.clientId || data.client
    }, {
      message: 'Either clientId or client details required',
      path: ['clientId']
    })
  },
  
  // PATCH /projects/:id
  update: {
    params: z.object({
      id: cuidSchema
    }),
    body: z.object({
      name: z.string().min(3).max(200).optional(),
      description: z.string().max(2000).optional(),
      address: z.string().max(500).optional(),
      status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
      currentStage: z.enum(['INITIAL_DRAWINGS', 'DETAILED_DESIGN', 'PLANNING_PACK', 'FINAL_APPROVAL']).optional(),
      targetCompletionDate: z.string().datetime().nullable().optional()
    })
  },
  
  // POST /projects/:id/approvals
  createApproval: {
    params: z.object({
      id: cuidSchema
    }),
    body: z.object({
      stage: z.enum(['INITIAL_DRAWINGS', 'DETAILED_DESIGN', 'PLANNING_PACK', 'FINAL_APPROVAL']),
      stageLabel: z.string().min(1).max(100),
      deliverableUrl: urlSchema.optional(),
      deliverableType: z.enum(['PDF', 'IMAGE', 'LINK']).optional(),
      deliverableName: z.string().max(200).optional(),
      expiresInDays: z.number().int().min(1).max(90).default(14)
    })
  }
}

// =============================================================================
// DASHBOARD SCHEMAS
// =============================================================================

export const dashboardSchemas = {
  // GET /dashboard/analytics
  analytics: {
    query: z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    })
  }
}

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

export const notificationSchemas = {
  // POST /notifications/email
  sendEmail: {
    body: z.object({
      template: z.string().min(1).max(50),
      to: emailSchema,
      data: z.record(z.unknown())
    })
  },
  
  // POST /notifications/reminder
  sendReminder: {
    body: z.object({
      approvalId: cuidSchema,
      reminderType: z.enum(['FIRST', 'SECOND', 'ESCALATION', 'CUSTOM'])
    })
  }
}

// =============================================================================
// WEBHOOK SCHEMAS
// =============================================================================

export const webhookSchemas = {
  // POST /webhooks/monday
  monday: {
    body: z.object({
      challenge: z.string().optional(),
      event: z.object({
        type: z.string(),
        triggerTime: z.string(),
        boardId: z.number(),
        pulseId: z.number(),
        columnId: z.string().optional(),
        value: z.unknown().optional()
      }).optional()
    })
  }
}

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const userSchemas = {
  // PATCH /users/:id/notification-preferences
  updatePreferences: {
    params: z.object({
      id: cuidSchema
    }),
    body: z.object({
      emailNotifications: z.boolean().optional(),
      slackNotifications: z.boolean().optional(),
      dailyDigest: z.boolean().optional()
    })
  }
}
