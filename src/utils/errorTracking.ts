/**
 * Error Tracking Utilities
 * Sentry integration for error monitoring
 * SECURITY: Never log sensitive data (PII, tokens, passwords)
 */

import * as Sentry from '@sentry/react'

// =============================================================================
// TYPES
// =============================================================================

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

export type ErrorContext = 
  | 'approval'
  | 'project'
  | 'api'
  | 'auth'
  | 'form'
  | 'navigation'
  | 'notification'
  | 'webhook'
  | 'analytics'
  | 'unknown'

export interface ErrorMetadata {
  context: ErrorContext
  action?: string
  userId?: string
  projectId?: string
  approvalId?: string
  additionalData?: Record<string, unknown>
}

// =============================================================================
// SENSITIVE DATA PATTERNS
// =============================================================================

const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /auth[_-]?token/i,
  /password/i,
  /secret/i,
  /bearer/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
  /email/i,
  /phone/i
]

/**
 * Check if a key might contain sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key))
}

/**
 * Redact sensitive values from an object
 */
function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      redacted[key] = value.map(item => 
        typeof item === 'object' && item !== null
          ? redactSensitiveData(item as Record<string, unknown>)
          : item
      )
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

// =============================================================================
// ERROR CAPTURE FUNCTIONS
// =============================================================================

/**
 * Capture an error with context
 * Main function for error tracking
 */
export function captureError(
  error: unknown,
  metadata: ErrorMetadata
): string | undefined {
  const errorObj = error instanceof Error ? error : new Error(String(error))

  // Redact any sensitive data from additional data
  const safeAdditionalData = metadata.additionalData
    ? redactSensitiveData(metadata.additionalData)
    : undefined

  return Sentry.captureException(errorObj, {
    tags: {
      context: metadata.context,
      action: metadata.action || 'unknown'
    },
    extra: {
      projectId: metadata.projectId,
      approvalId: metadata.approvalId,
      ...safeAdditionalData
    },
    user: metadata.userId ? { id: metadata.userId } : undefined
  })
}

/**
 * Capture an API error
 */
export function captureApiError(
  error: unknown,
  endpoint: string,
  method: string,
  statusCode?: number
): string | undefined {
  return captureError(error, {
    context: 'api',
    action: `${method} ${endpoint}`,
    additionalData: {
      endpoint,
      method,
      statusCode
    }
  })
}

/**
 * Capture a form validation error
 */
export function captureFormError(
  formName: string,
  errors: Record<string, string>
): void {
  // Only capture if there are actual errors (not just validation messages)
  if (Object.keys(errors).length > 0) {
    Sentry.addBreadcrumb({
      category: 'form',
      message: `Form validation failed: ${formName}`,
      level: 'warning',
      data: {
        formName,
        errorCount: Object.keys(errors).length
        // Don't log actual error messages as they might contain user input
      }
    })
  }
}

/**
 * Capture an approval-specific error
 */
export function captureApprovalError(
  error: unknown,
  action: string,
  approvalId?: string,
  projectId?: string
): string | undefined {
  return captureError(error, {
    context: 'approval',
    action,
    approvalId,
    projectId
  })
}

/**
 * Capture a webhook error
 */
export function captureWebhookError(
  error: unknown,
  webhookType: string,
  payload?: Record<string, unknown>
): string | undefined {
  return captureError(error, {
    context: 'webhook',
    action: webhookType,
    additionalData: payload ? redactSensitiveData(payload) : undefined
  })
}

// =============================================================================
// BREADCRUMBS
// =============================================================================

/**
 * Add a navigation breadcrumb
 */
export function addNavigationBreadcrumb(
  from: string,
  to: string
): void {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
    data: { from, to }
  })
}

/**
 * Add a user action breadcrumb
 */
export function addActionBreadcrumb(
  action: string,
  category: ErrorContext,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message: action,
    level: 'info',
    data: data ? redactSensitiveData(data) : undefined
  })
}

/**
 * Add an API request breadcrumb
 */
export function addApiBreadcrumb(
  method: string,
  endpoint: string,
  statusCode?: number
): void {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: {
      method,
      endpoint,
      statusCode
    }
  })
}

// =============================================================================
// USER CONTEXT
// =============================================================================

/**
 * Set the current user for error tracking
 * Only set non-sensitive identifiers
 */
export function setErrorTrackingUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Set additional context tags
 */
export function setErrorTrackingContext(
  key: string,
  value: string | number | boolean
): void {
  Sentry.setTag(key, String(value))
}

/**
 * Clear all user context
 */
export function clearErrorTrackingContext(): void {
  Sentry.setUser(null)
  Sentry.setTags({})
}

// =============================================================================
// MESSAGE CAPTURE
// =============================================================================

/**
 * Capture a message (not an error)
 * Use for important events that aren't errors
 */
export function captureMessage(
  message: string,
  level: ErrorSeverity = 'info',
  context?: ErrorContext
): string | undefined {
  return Sentry.captureMessage(message, {
    level,
    tags: context ? { context } : undefined
  })
}

/**
 * Capture a warning message
 */
export function captureWarning(
  message: string,
  context?: ErrorContext
): string | undefined {
  return captureMessage(message, 'warning', context)
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  operation: string
): ReturnType<typeof Sentry.startInactiveSpan> {
  return Sentry.startInactiveSpan({
    name,
    op: operation
  })
}

/**
 * Measure an async operation
 */
export async function measureAsync<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const span = startTransaction(name, operation)
  
  try {
    const result = await fn()
    span?.end()
    return result
  } catch (error) {
    span?.end()
    throw error
  }
}
