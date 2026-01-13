/**
 * CSRF Routes
 * Token generation endpoint
 */

import { Router } from 'express'
import { getCsrfToken } from '../middleware/csrf.js'
import { slidingWindowRateLimiter } from '../middleware/rateLimit.js'

const router = Router()

// Rate limit CSRF token requests (10 per minute)
router.use(slidingWindowRateLimiter(10, 60))

/**
 * GET /api/csrf-token
 * Generate a new CSRF token
 */
router.get('/', getCsrfToken)

export { router as csrfRoutes }
