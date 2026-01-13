/**
 * Health Routes
 * System health and readiness checks
 */

import { Router } from 'express'
import { checkDatabaseHealth } from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'

const router = Router()
const logger = createLogger('health')

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/health
 * Basic health check - returns 200 if server is running
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'approv-api',
    version: process.env.npm_package_version || '1.0.0'
  })
})

/**
 * GET /api/health/ready
 * Readiness check - verifies all dependencies are available
 */
router.get('/ready', async (_req, res) => {
  const checks: Record<string, { healthy: boolean; latency?: number; error?: string }> = {}
  let allHealthy = true

  // Database check
  const dbHealth = await checkDatabaseHealth()
  checks.database = dbHealth
  if (!dbHealth.healthy) allHealthy = false

  // Add more checks as needed (Redis, external services, etc.)

  const status = allHealthy ? 200 : 503

  if (!allHealthy) {
    logger.warn({ checks }, 'Health check failed')
  }

  res.status(status).json({
    status: allHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  })
})

/**
 * GET /api/health/live
 * Liveness check - basic ping
 */
router.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

export { router as healthRoutes }
