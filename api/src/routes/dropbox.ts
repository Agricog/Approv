/**
 * Dropbox Routes
 * OAuth and integration management
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js'
import { createLogger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import {
  getAuthUrl,
  exchangeCodeForTokens,
  isDropboxConnected,
  disconnectDropbox
} from '../services/dropbox.js'
import { randomUUID } from 'crypto'

const router = Router()
const logger = createLogger('dropbox')

// All routes require auth
router.use(requireAuth)

/**
 * GET /api/dropbox/status
 * Check if Dropbox is connected
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const connected = await isDropboxConnected(req.organizationId!)

    res.json({
      success: true,
      data: { connected }
    })
  })
)

/**
 * GET /api/dropbox/auth
 * Get OAuth authorization URL
 */
router.get(
  '/auth',
  asyncHandler(async (req, res) => {
    // Generate state token to prevent CSRF
    const state = `${req.organizationId}:${randomUUID()}`
    
    // Store state temporarily (expires in 10 min)
    await prisma.organization.update({
      where: { id: req.organizationId! },
      data: { dropboxOAuthState: state }
    })

    const authUrl = getAuthUrl(state)

    res.json({
      success: true,
      data: { authUrl }
    })
  })
)

/**
 * POST /api/dropbox/callback
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
      select: { dropboxOAuthState: true }
    })

    if (!org?.dropboxOAuthState || org.dropboxOAuthState !== state) {
      throw new ValidationError('Invalid state - please try again')
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens) {
      throw new ValidationError('Failed to connect Dropbox')
    }

    // Store tokens
    await prisma.organization.update({
      where: { id: req.organizationId! },
      data: {
        dropboxAccessToken: tokens.accessToken,
        dropboxRefreshToken: tokens.refreshToken,
        dropboxTokenExpiry: tokens.expiresAt,
        dropboxOAuthState: null
      }
    })

    logger.info({ organizationId: req.organizationId }, 'Dropbox connected')

    res.json({
      success: true,
      data: { message: 'Dropbox connected successfully' }
    })
  })
)

/**
 * DELETE /api/dropbox
 * Disconnect Dropbox
 */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await disconnectDropbox(req.organizationId!)

    res.json({
      success: true,
      data: { message: 'Dropbox disconnected' }
    })
  })
)

export { router as dropboxRoutes }
