/**
 * Monday.com Routes
 * OAuth and integration management
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js'
import { createLogger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import {
  getAuthUrl,
  exchangeCodeForToken,
  getBoards,
  isMondayConnected,
  disconnectMonday
} from '../services/monday.js'
import { randomUUID } from 'crypto'

const router = Router()
const logger = createLogger('monday')

// All routes require auth
router.use(requireAuth)

/**
 * GET /api/monday/status
 * Check if Monday is connected
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const connected = await isMondayConnected(req.organizationId!)

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId! },
      select: { mondayBoardId: true }
    })

    res.json({
      success: true,
      data: { 
        connected,
        boardId: org?.mondayBoardId || null
      }
    })
  })
)

/**
 * GET /api/monday/auth
 * Get OAuth authorization URL
 */
router.get(
  '/auth',
  asyncHandler(async (req, res) => {
    const state = `${req.organizationId}:${randomUUID()}`
    
    // Store state temporarily
    await prisma.organization.update({
      where: { id: req.organizationId! },
      data: { mondayWebhookId: state } // Reusing field for OAuth state
    })

    const authUrl = getAuthUrl(state)

    res.json({
      success: true,
      data: { authUrl }
    })
  })
)

/**
 * POST /api/monday/callback
 * Handle OAuth callback
 */
router.post(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.body

    if (!code || !state) {
      throw new ValidationError('Missing code or state')
    }

    // Verify state
    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId! },
      select: { mondayWebhookId: true }
    })

    if (!org?.mondayWebhookId || org.mondayWebhookId !== state) {
      throw new ValidationError('Invalid state - please try again')
    }

    // Exchange code for token
    const token = await exchangeCodeForToken(code)

    if (!token) {
      throw new ValidationError('Failed to connect Monday.com')
    }

    // Store token
    await prisma.organization.update({
      where: { id: req.organizationId! },
      data: {
        mondayApiToken: token,
        mondayWebhookId: null
      }
    })

    logger.info({ organizationId: req.organizationId }, 'Monday connected')

    res.json({
      success: true,
      data: { message: 'Monday.com connected successfully' }
    })
  })
)

/**
 * GET /api/monday/boards
 * Get user's boards
 */
router.get(
  '/boards',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId! },
      select: { mondayApiToken: true }
    })

    if (!org?.mondayApiToken) {
      throw new ValidationError('Monday.com not connected')
    }

    const boards = await getBoards(org.mondayApiToken)

    res.json({
      success: true,
      data: { boards }
    })
  })
)

/**
 * POST /api/monday/board
 * Set the board to sync with
 */
router.post(
  '/board',
  asyncHandler(async (req, res) => {
    const { boardId } = req.body

    if (!boardId) {
      throw new ValidationError('boardId is required')
    }

    await prisma.organization.update({
      where: { id: req.organizationId! },
      data: { mondayBoardId: boardId }
    })

    logger.info({ organizationId: req.organizationId, boardId }, 'Monday board set')

    res.json({
      success: true,
      data: { message: 'Board selected successfully' }
    })
  })
)

/**
 * DELETE /api/monday
 * Disconnect Monday
 */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await disconnectMonday(req.organizationId!)

    res.json({
      success: true,
      data: { message: 'Monday.com disconnected' }
    })
  })
)

export { router as mondayRoutes }
