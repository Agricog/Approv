/**
 * Webhook Routes
 * External service webhooks (Monday.com, etc.)
 * Uses signature verification instead of CSRF
 */

import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { createLogger, logAudit } from '../lib/logger.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validate, webhookSchemas, getClientIp } from '../middleware/index.js'
import { slidingWindowRateLimiter } from '../middleware/rateLimit.js'

const router = Router()
const logger = createLogger('webhooks')

// =============================================================================
// MONDAY.COM WEBHOOK
// =============================================================================

/**
 * POST /api/webhooks/monday
 * Monday.com webhook endpoint
 */
router.post(
  '/monday',
  slidingWindowRateLimiter(100, 60), // 100 webhooks per minute
  validate(webhookSchemas.monday),
  asyncHandler(async (req, res) => {
    const { challenge, event } = req.body
    
    // Handle webhook verification challenge
    if (challenge) {
      logger.info('Monday.com webhook verification')
      res.json({ challenge })
      return
    }
    
    // Verify webhook signature
    const signature = req.headers['authorization']
    if (!verifyMondaySignature(req, signature as string)) {
      logger.warn({
        ip: getClientIp(req)
      }, 'Invalid Monday.com webhook signature')
      
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
    }
    
    if (!event) {
      res.status(200).json({ success: true })
      return
    }
    
    logger.info({
      eventType: event.type,
      boardId: event.boardId,
      pulseId: event.pulseId
    }, 'Monday.com webhook received')
    
    // Process different event types
    switch (event.type) {
      case 'change_column_value':
        await handleColumnChange(event)
        break
      
      case 'create_item':
        await handleItemCreated(event)
        break
      
      case 'change_status_column_value':
        await handleStatusChange(event)
        break
      
      default:
        logger.debug({ eventType: event.type }, 'Unhandled webhook event type')
    }
    
    res.status(200).json({ success: true })
  })
)

/**
 * Verify Monday.com webhook signature
 */
function verifyMondaySignature(req: any, signature: string | undefined): boolean {
  if (!signature || !process.env.MONDAY_WEBHOOK_SECRET) {
    // In development, allow unsigned webhooks
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    return false
  }
  
  try {
    const rawBody = req.rawBody
    if (!rawBody) return false
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MONDAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    logger.error({ error }, 'Webhook signature verification failed')
    return false
  }
}

/**
 * Handle column value changes
 */
async function handleColumnChange(event: any): Promise<void> {
  const { boardId, pulseId, columnId, value } = event
  
  // Find project linked to this Monday item
  const project = await prisma.project.findFirst({
    where: { mondayItemId: String(pulseId) },
    include: { organization: true }
  })
  
  if (!project) {
    logger.debug({ pulseId }, 'No project found for Monday item')
    return
  }
  
  // Update project based on column change
  // This would be customized based on the organization's Monday board setup
  logger.info({
    projectId: project.id,
    columnId,
    value
  }, 'Project updated from Monday.com')
  
  await prisma.project.update({
    where: { id: project.id },
    data: { mondayLastSyncAt: new Date() }
  })
}

/**
 * Handle new item creation
 */
async function handleItemCreated(event: any): Promise<void> {
  const { boardId, pulseId, pulseName } = event
  
  logger.info({
    boardId,
    pulseId,
    name: pulseName
  }, 'New Monday.com item created')
  
  // Could auto-create a project from Monday item
  // Implementation depends on requirements
}

/**
 * Handle status column changes
 */
async function handleStatusChange(event: any): Promise<void> {
  const { pulseId, columnId, value } = event
  
  // Find project linked to this Monday item
  const project = await prisma.project.findFirst({
    where: { mondayItemId: String(pulseId) }
  })
  
  if (!project) {
    return
  }
  
  const statusLabel = value?.label?.text?.toLowerCase()
  
  // Map Monday status to project status
  let newStatus: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | null = null
  
  if (statusLabel?.includes('complete') || statusLabel?.includes('done')) {
    newStatus = 'COMPLETED'
  } else if (statusLabel?.includes('hold') || statusLabel?.includes('pause')) {
    newStatus = 'ON_HOLD'
  } else if (statusLabel?.includes('cancel')) {
    newStatus = 'CANCELLED'
  } else if (statusLabel?.includes('active') || statusLabel?.includes('progress')) {
    newStatus = 'ACTIVE'
  }
  
  if (newStatus && newStatus !== project.status) {
    await prisma.project.update({
      where: { id: project.id },
      data: { 
        status: newStatus,
        mondayLastSyncAt: new Date(),
        completedAt: newStatus === 'COMPLETED' ? new Date() : project.completedAt
      }
    })
    
    logger.info({
      projectId: project.id,
      oldStatus: project.status,
      newStatus
    }, 'Project status updated from Monday.com')
  }
}

// =============================================================================
// CLERK WEBHOOK (User sync)
// =============================================================================

/**
 * POST /api/webhooks/clerk
 * Clerk user management webhooks
 */
router.post(
  '/clerk',
  slidingWindowRateLimiter(50, 60),
  asyncHandler(async (req, res) => {
    const svixId = req.headers['svix-id']
    const svixTimestamp = req.headers['svix-timestamp']
    const svixSignature = req.headers['svix-signature']
    
    // Verify Clerk webhook signature
    if (!verifyClerkSignature(req, svixId as string, svixTimestamp as string, svixSignature as string)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature')
    }
    
    const { type, data } = req.body
    
    logger.info({ eventType: type }, 'Clerk webhook received')
    
    switch (type) {
      case 'user.created':
        // User created in Clerk - would need to link to organization
        logger.info({ userId: data.id }, 'New Clerk user created')
        break
      
      case 'user.updated':
        // Update user in our database
        await prisma.user.updateMany({
          where: { externalId: data.id },
          data: {
            email: data.email_addresses?.[0]?.email_address,
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.image_url
          }
        })
        break
      
      case 'user.deleted':
        // Soft delete or deactivate user
        await prisma.user.updateMany({
          where: { externalId: data.id },
          data: { isActive: false }
        })
        break
    }
    
    res.status(200).json({ success: true })
  })
)

/**
 * Verify Clerk webhook signature
 */
function verifyClerkSignature(
  req: any,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature || !process.env.CLERK_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    return false
  }
  
  try {
    const payload = req.rawBody?.toString() || JSON.stringify(req.body)
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`
    
    // Clerk uses multiple signatures, verify against any
    const signatures = svixSignature.split(' ')
    
    for (const sig of signatures) {
      const [, hash] = sig.split(',')
      if (!hash) continue
      
      const expected = crypto
        .createHmac('sha256', Buffer.from(process.env.CLERK_WEBHOOK_SECRET.split('_')[1] || '', 'base64'))
        .update(signedContent)
        .digest('base64')
      
      if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
        return true
      }
    }
    
    return false
  } catch (error) {
    logger.error({ error }, 'Clerk signature verification failed')
    return false
  }
}

export { router as webhookRoutes }
