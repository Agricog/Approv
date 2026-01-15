/**
 * Logger Configuration
 * Pino-based logging with PII redaction
 * SECURITY: Never log sensitive data
 */
import pino from 'pino'
import { prisma } from './prisma.js'

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// =============================================================================
// PII PATTERNS TO REDACT
// =============================================================================

const REDACT_PATHS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'apiToken',
  'api_token',
  'secret',
  'authorization',
  'auth',
  'bearer',
  'email',
  'phone',
  'mobile',
  'address',
  'ssn',
  'nationalInsurance',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'bankAccount',
  'cookie',
  'session',
  'sessionId',
  'session_id',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'req.body.password',
  'req.body.token',
  'req.body.email',
  'res.headers["set-cookie"]',
  'data.email',
  'data.password',
  'user.email',
  'client.email',
  'client.phone',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.secret',
  '*.email',
  '*.phone'
]

// =============================================================================
// BASE LOGGER
// =============================================================================

const baseLogger = pino({
  level: LOG_LEVEL,
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      env: process.env.NODE_ENV
    })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: IS_PRODUCTION ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  },
  base: {
    service: 'approv-api',
    version: process.env.npm_package_version || '1.0.0'
  }
})

// =============================================================================
// CHILD LOGGER FACTORY
// =============================================================================

export function createLogger(context: string): pino.Logger {
  return baseLogger.child({ context })
}

// =============================================================================
// SAFE LOGGING HELPERS
// =============================================================================

export function safeLog(obj: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (isPiiKey(key)) {
      safe[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      safe[key] = safeLog(value as Record<string, unknown>)
    } else {
      safe[key] = value
    }
  }
  
  return safe
}

function isPiiKey(key: string): boolean {
  const piiPatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /auth/i,
    /email/i,
    /phone/i,
    /mobile/i,
    /address/i,
    /ssn/i,
    /credit/i,
    /card/i,
    /cvv/i,
    /cookie/i,
    /session/i
  ]
  
  return piiPatterns.some(pattern => pattern.test(key))
}

export function maskValue(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length)
  }
  
  const start = value.substring(0, visibleChars)
  const end = value.substring(value.length - visibleChars)
  const masked = '*'.repeat(Math.min(value.length - visibleChars * 2, 8))
  
  return start + masked + end
}

export function secureLog(
  logger: pino.Logger,
  level: 'debug' | 'info' | 'warn' | 'error',
  data: Record<string, unknown>,
  message: string
): void {
  logger[level](safeLog(data), message)
}

// =============================================================================
// AUDIT LOGGER
// =============================================================================

const auditLogger = createLogger('audit')

interface AuditLogEntry {
  action: string
  entityType: string
  entityId: string
  userId?: string
  organizationId?: string
  projectId?: string
  approvalId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
}

/**
 * Log audit trail entry - writes to database AND console
 */
export function logAudit(entry: AuditLogEntry): void {
  // Log to console
  auditLogger.info({
    audit: true,
    action: entry.action,
    entity: {
      type: entry.entityType,
      id: entry.entityId
    },
    actor: {
      userId: entry.userId,
      organizationId: entry.organizationId,
      ip: entry.ipAddress
    },
    metadata: entry.metadata ? safeLog(entry.metadata) : undefined
  }, 'Audit: ' + entry.action)

  // Write to database (async, non-blocking)
  if (entry.organizationId) {
    prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        organizationId: entry.organizationId,
        userId: entry.userId,
        projectId: entry.projectId,
        approvalId: entry.approvalId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata || undefined,
        previousState: entry.previousState ? safeLog(entry.previousState) : undefined,
        newState: entry.newState ? safeLog(entry.newState) : undefined
      }
    }).catch(err => {
      auditLogger.error({ err, entry }, 'Failed to write audit log to database')
    })
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { baseLogger as logger }
export default createLogger
