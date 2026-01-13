/**
 * Approv API Server
 * Enterprise-grade Express server with full security hardening
 * OWASP Top 10 2024 compliant
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import hpp from 'hpp'
import * as Sentry from '@sentry/node'
import { pinoHttp } from 'pino-http'
import { createLogger } from './lib/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { securityHeaders } from './middleware/security.js'
import { rateLimiter } from './middleware/rateLimit.js'
import { csrfProtection } from './middleware/csrf.js'
import { uploadRoutes } from './routes/uploads.js'
import { dropboxRoutes } from './routes/dropbox.js'
import { mondayRoutes } from './routes/monday.js'
import { requestValidator } from './middleware/validation.js'

// Routes
import { healthRoutes } from './routes/health.js'
import { csrfRoutes } from './routes/csrf.js'
import { approvalRoutes } from './routes/approvals.js'
import { projectRoutes } from './routes/projects.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { portalRoutes } from './routes/portal.js'
import { webhookRoutes } from './routes/webhooks.js'
import { notificationRoutes } from './routes/notifications.js'

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
  'http://localhost:5173',
  'https://approv.co.uk',
  'https://www.approv.co.uk',
  'https://approv-production.up.railway.app'
]

// Log allowed origins on startup
console.log('Allowed origins:', ALLOWED_ORIGINS)

const logger = createLogger('server')

// =============================================================================
// SENTRY INITIALIZATION
// =============================================================================

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Don't send PII
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-csrf-token']
      }
      
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(crumb => {
          if (crumb.data) {
            delete crumb.data.password
            delete crumb.data.token
            delete crumb.data.apiKey
          }
          return crumb
        })
      }
      
      return event
    }
  })
}

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express()

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1)

// =============================================================================
// SECURITY MIDDLEWARE (Order matters!)
// =============================================================================

// 1. Sentry request handler (must be first)
app.use(Sentry.Handlers.requestHandler())

// 2. Security headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding PDFs
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// 3. Additional security headers
app.use(securityHeaders)

// 4. HTTP Parameter Pollution protection
app.use(hpp())

// 5. CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn({ origin }, 'CORS blocked origin')
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
}))

// 6. Request logging (PII-safe)
app.use(pinoHttp({
  logger: createLogger('http'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]'
    ],
    censor: '[REDACTED]'
  },
  customProps: (req) => ({
    requestId: req.headers['x-request-id']
  })
}))

// 7. Body parsing with size limits
app.use(express.json({ 
  limit: '1mb',
  verify: (req, _res, buf) => {
    // Store raw body for webhook signature verification
    (req as any).rawBody = buf
  }
}))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// 8. Global rate limiting
app.use(rateLimiter)

// =============================================================================
// ROUTES
// =============================================================================

// Health check (no auth, no CSRF)
app.use('/api/health', healthRoutes)

// CSRF token endpoint
app.use('/api/csrf-token', csrfRoutes)

// Webhooks (custom auth, no CSRF - uses signatures)
app.use('/api/webhooks', webhookRoutes)

// Protected routes (require CSRF for mutations)
app.use('/api/approvals', csrfProtection, approvalRoutes)
app.use('/api/projects', csrfProtection, projectRoutes)
app.use('/api/dashboard', csrfProtection, dashboardRoutes)
app.use('/api/portal', csrfProtection, portalRoutes)
app.use('/api/uploads', csrfProtection, uploadRoutes)
app.use('/api/dropbox', csrfProtection, dropboxRoutes)
app.use('/api/monday', csrfProtection, mondayRoutes)
app.use('/api/notifications', csrfProtection, notificationRoutes)

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Sentry error handler
app.use(Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Report 4xx and 5xx errors
    if (error.status) {
      return Number(error.status) >= 400
    }
    return true
  }
}))

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    env: NODE_ENV,
    node: process.version
  }, '🚀 Approv API server started')
})

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received')
  
  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
  
  // Force close after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection')
  Sentry.captureException(reason)
})

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception')
  Sentry.captureException(error)
  process.exit(1)
})

export { app }
