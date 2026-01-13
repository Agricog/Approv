/**
 * Middleware Index
 * Barrel exports for all middleware
 */

// Security
export { 
  securityHeaders, 
  sanitizeBody, 
  sanitizeString,
  detectSqlInjection,
  getClientIp,
  isUrlSafe,
  isValidToken
} from './security.js'

// CSRF Protection
export { 
  csrfProtection, 
  getCsrfToken,
  generateCsrfToken,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_EXPIRY_SECONDS
} from './csrf.js'

// Rate Limiting
export { 
  rateLimiter, 
  authRateLimiter,
  approvalRateLimiter,
  apiKeyRateLimiter,
  slidingWindowRateLimiter
} from './rateLimit.js'

// Validation
export { 
  validate,
  requestValidator,
  // Schemas
  cuidSchema,
  uuidSchema,
  idSchema,
  tokenSchema,
  emailSchema,
  phoneSchema,
  urlSchema,
  paginationSchema,
  sortSchema,
  dateRangeSchema,
  approvalSchemas,
  projectSchemas,
  dashboardSchemas,
  notificationSchemas,
  webhookSchemas,
  userSchemas
} from './validation.js'

// Error Handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError
} from './errorHandler.js'

// Authentication
export {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireOwner,
  requireProjectAccess,
  apiKeyAuth,
  clientPortalAuth
} from './auth.js'
export type { AuthenticatedUser } from './auth.js'
