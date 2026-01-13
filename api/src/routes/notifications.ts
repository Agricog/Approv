/**
 * Notification Routes
 * Email, SMS, and Slack notification endpoints
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { asyncHandler, NotFoundError, AppError } from '../middleware/errorHandler.js'
import { validate, notificationSchemas } from '../middleware/index.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { slidingWindowRateLimiter } from '../middleware/rateLimit.js'

const router = Router()
const logger = createLogger('notifications')

// All notification routes require authentication
router.use(requireAuth)

// =============================================================================
// SEND NOTIFICATIONS
// =============================================================================

/**
 * POST /api/notifications/email
 * Send email notification
 */
router.post(
  '/email',
  slidingWindowRateLimiter(20, 60), // 20 emails per minute
  validate(notificationSchemas.sendEmail),
  asyncHandler(async (req, res) => {
    const { template, to, data } = req.body
    const { organizationId, user } = req
    
    // Get organization's email template
    const emailTemplate = await prisma.emailTemplate.findFirst({
      where: {
        organizationId,
        slug: template,
        isActive: true
      }
    })
    
    // Use default template if custom not found
    const templateData = emailTemplate || getDefaultTemplate(template)
    
    if (!templateData) {
      throw new NotFoundError('Email template')
    }
    
    // TODO: Actually send email via Resend/SendGrid
    // For now, just log it
    logger.info({
      template,
      to,
      userId: user?.id
    }, 'Email notification sent')
    
    res.json({
      success: true,
      data: {
        messageId: `msg_${Date.now()}`,
        status: 'sent'
      }
    })
  })
)

/**
 * POST /api/notifications/reminder
 * Send approval reminder
 */
router.post(
  '/reminder',
  slidingWindowRateLimiter(10, 60), // 10 reminders per minute
  validate(notificationSchemas.sendReminder),
  asyncHandler(async (req, res) => {
    const { approvalId, reminderType } = req.body
    const { organizationId, user } = req
    
    const approval = await prisma.approval.findFirst({
      where: {
        id: approvalId,
        project: { organizationId },
        status: 'PENDING'
      },
      include: {
        client: true,
        project: {
          include: {
            organization: true
          }
        }
      }
    })
    
    if (!approval) {
      throw new NotFoundError('Approval')
    }
    
    if (approval.expiresAt < new Date()) {
      throw new AppError(400, 'APPROVAL_EXPIRED', 'Cannot send reminder for expired approval')
    }
    
    // Create reminder record
    const reminder = await prisma.reminder.create({
      data: {
        type: reminderType,
        channel: 'EMAIL',
        approvalId,
        sentById: user!.id,
        scheduledFor: new Date(),
        sentAt: new Date()
      }
    })
    
    // Update approval reminder count
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date()
      }
    })
    
    // TODO: Actually send the reminder email
    logger.info({
      approvalId,
      reminderType,
      reminderCount: approval.reminderCount + 1
    }, 'Reminder sent')
    
    res.json({
      success: true,
      data: {
        reminderId: reminder.id,
        sentVia: ['email'],
        timestamp: new Date().toISOString()
      }
    })
  })
)

/**
 * POST /api/notifications/slack
 * Send Slack notification
 */
router.post(
  '/slack',
  slidingWindowRateLimiter(30, 60),
  asyncHandler(async (req, res) => {
    const { channel, message, approvalId, projectId } = req.body
    const { organizationId, user } = req
    
    // Get organization's Slack config
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    })
    
    if (!org?.slackBotToken || !org?.slackChannelId) {
      throw new AppError(400, 'SLACK_NOT_CONFIGURED', 'Slack is not configured for this organization')
    }
    
    // TODO: Send via Slack API
    logger.info({
      channel: channel || org.slackChannelId,
      organizationId,
      userId: user?.id
    }, 'Slack notification sent')
    
    res.json({
      success: true,
      data: {
        messageId: `slack_${Date.now()}`,
        channel: channel || org.slackChannelId,
        timestamp: new Date().toISOString()
      }
    })
  })
)

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * GET /api/notifications/preferences
 * Get current user's notification preferences
 */
router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const { user } = req
    
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: {
        emailNotifications: true,
        slackNotifications: true,
        dailyDigest: true
      }
    })
    
    res.json({
      success: true,
      data: {
        email: dbUser?.emailNotifications ?? true,
        slack: dbUser?.slackNotifications ?? true,
        dailyDigest: dbUser?.dailyDigest ?? true
      }
    })
  })
)

/**
 * PATCH /api/notifications/preferences
 * Update current user's notification preferences
 */
router.patch(
  '/preferences',
  asyncHandler(async (req, res) => {
    const { user } = req
    const { email, slack, dailyDigest } = req.body
    
    const updates: any = {}
    if (email !== undefined) updates.emailNotifications = email
    if (slack !== undefined) updates.slackNotifications = slack
    if (dailyDigest !== undefined) updates.dailyDigest = dailyDigest
    
    await prisma.user.update({
      where: { id: user!.id },
      data: updates
    })
    
    logger.info({
      userId: user!.id,
      updates
    }, 'Notification preferences updated')
    
    res.json({
      success: true,
      data: {
        email: updates.emailNotifications,
        slack: updates.slackNotifications,
        dailyDigest: updates.dailyDigest
      }
    })
  })
)

// =============================================================================
// EMAIL TEMPLATES (Admin only)
// =============================================================================

/**
 * GET /api/notifications/templates
 * List email templates
 */
router.get(
  '/templates',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    
    const templates = await prisma.emailTemplate.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    })
    
    res.json({
      success: true,
      data: templates.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        subject: t.subject,
        isCustom: t.isCustom,
        isActive: t.isActive,
        updatedAt: t.updatedAt.toISOString()
      }))
    })
  })
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDefaultTemplate(slug: string): { subject: string; bodyHtml: string; bodyText: string } | null {
  const templates: Record<string, { subject: string; bodyHtml: string; bodyText: string }> = {
    'approval_request': {
      subject: 'Approval Required: {{projectName}} - {{stageName}}',
      bodyHtml: `
        <h1>Approval Required</h1>
        <p>Hi {{clientName}},</p>
        <p>Please review and approve the {{stageName}} for {{projectName}}.</p>
        <p><a href="{{approvalUrl}}">Review Now</a></p>
        <p>This request expires on {{expiresAt}}.</p>
      `,
      bodyText: `
        Approval Required
        
        Hi {{clientName}},
        
        Please review and approve the {{stageName}} for {{projectName}}.
        
        Review here: {{approvalUrl}}
        
        This request expires on {{expiresAt}}.
      `
    },
    'approval_reminder': {
      subject: 'Reminder: Approval Needed for {{projectName}}',
      bodyHtml: `
        <h1>Reminder</h1>
        <p>Hi {{clientName}},</p>
        <p>A reminder that the {{stageName}} for {{projectName}} is still awaiting your approval.</p>
        <p>It has been pending for {{daysPending}} days.</p>
        <p><a href="{{approvalUrl}}">Review Now</a></p>
      `,
      bodyText: `
        Reminder
        
        Hi {{clientName}},
        
        A reminder that the {{stageName}} for {{projectName}} is still awaiting your approval.
        
        It has been pending for {{daysPending}} days.
        
        Review here: {{approvalUrl}}
      `
    },
    'approval_confirmation': {
      subject: 'Approval Received: {{projectName}} - {{stageName}}',
      bodyHtml: `
        <h1>Thank You</h1>
        <p>Hi {{clientName}},</p>
        <p>Thank you for your response on {{projectName}} - {{stageName}}.</p>
        <p>Status: {{status}}</p>
      `,
      bodyText: `
        Thank You
        
        Hi {{clientName}},
        
        Thank you for your response on {{projectName}} - {{stageName}}.
        
        Status: {{status}}
      `
    }
  }
  
  return templates[slug] || null
}

export { router as notificationRoutes }
