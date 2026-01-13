/**
 * Approval Routes
 * Core approval workflow endpoints
 * Public (token-based) and authenticated access
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger, logAudit } from '../lib/logger.js'
import { 
  asyncHandler, 
  NotFoundError,
  ValidationError,
  AppError
} from '../middleware/errorHandler.js'
import { 
  validate, 
  approvalSchemas,
  isValidToken,
  getClientIp 
} from '../middleware/index.js'
import { approvalRateLimiter } from '../middleware/rateLimit.js'
import { requireAuth, requireProjectAccess } from '../middleware/auth.js'
import { 
  sendApprovalConfirmation, 
  sendTeamNotification,
  sendApprovalReminder 
} from '../services/email.js'

const router = Router()
const logger = createLogger('approvals')

// =============================================================================
// PUBLIC ROUTES (Token-based access)
// =============================================================================

/**
 * GET /api/approvals/:token
 * Get approval details by secure token (public)
 */
router.get(
  '/:token',
  approvalRateLimiter,
  validate(approvalSchemas.getByToken),
  asyncHandler(async (req, res) => {
    const { token } = req.params
    
    // Validate token format
    if (!isValidToken(token)) {
      throw new NotFoundError('Approval')
    }
    
    const approval = await prisma.approval.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            reference: true,
            organization: {
              select: {
                name: true,
                logo: true,
                primaryColor: true
              }
            }
          }
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
            company: true
          }
        }
      }
    })
    
    if (!approval) {
      throw new NotFoundError('Approval')
    }
    
    // Check if expired
    const isExpired = approval.expiresAt < new Date()
    const effectiveStatus = isExpired && approval.status === 'PENDING' 
      ? 'EXPIRED' 
      : approval.status
    
    // Track view (only for pending approvals)
    if (approval.status === 'PENDING' && !isExpired) {
      await prisma.approval.update({
        where: { id: approval.id },
        data: {
          viewCount: { increment: 1 },
          viewedAt: approval.viewedAt || new Date()
        }
      }).catch(() => {}) // Non-blocking
    }
    
    logger.info({
      approvalId: approval.id,
      status: effectiveStatus,
      ip: getClientIp(req)
    }, 'Approval viewed')
    
    res.json({
      success: true,
      data: {
        id: approval.id,
        projectName: approval.project.name,
        projectReference: approval.project.reference,
        clientName: `${approval.client.firstName} ${approval.client.lastName}`,
        clientCompany: approval.client.company,
        stage: approval.stage,
        stageLabel: approval.stageLabel,
        status: effectiveStatus,
        deliverableUrl: approval.deliverableUrl,
        deliverableType: approval.deliverableType,
        deliverableName: approval.deliverableName,
        createdAt: approval.createdAt.toISOString(),
        expiresAt: approval.expiresAt.toISOString(),
        respondedAt: approval.respondedAt?.toISOString() || null,
        responseNotes: approval.status !== 'PENDING' ? approval.responseNotes : null,
        organization: {
          name: approval.project.organization.name,
          logo: approval.project.organization.logo,
          primaryColor: approval.project.organization.primaryColor
        }
      }
    })
  })
)

/**
 * POST /api/approvals/:token/respond
 * Submit approval response (public)
 */
router.post(
  '/:token/respond',
  approvalRateLimiter,
  validate(approvalSchemas.respond),
  asyncHandler(async (req, res) => {
    const { token } = req.params
    const { action, notes } = req.body
    
    // Validate token format
    if (!isValidToken(token)) {
      throw new NotFoundError('Approval')
    }
    
    const approval = await prisma.approval.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    if (!approval) {
      throw new NotFoundError('Approval')
    }
    
    // Check if already responded
    if (approval.status !== 'PENDING') {
      throw new AppError(
        400,
        'ALREADY_RESPONDED',
        'This approval has already been responded to'
      )
    }
    
    // Check if expired
    if (approval.expiresAt < new Date()) {
      throw new AppError(
        400,
        'APPROVAL_EXPIRED',
        'This approval request has expired'
      )
    }
    
    // Calculate response time
    const responseTimeHours = (Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60)
    
    // Update approval
    const newStatus = action === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED'
    
    const updatedApproval = await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        responseNotes: notes || null,
        responseTimeHours
      }
    })
    
    // Log audit trail
    logAudit({
      action: `approval.${action}`,
      entityType: 'approval',
      entityId: approval.id,
      organizationId: approval.project.organizationId,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: {
        projectId: approval.project.id,
        stage: approval.stage,
        responseTimeHours: responseTimeHours.toFixed(2)
      },
      previousState: { status: 'PENDING' },
      newState: { status: newStatus, notes }
    })
    
    logger.info({
      approvalId: approval.id,
      action,
      responseTimeHours: responseTimeHours.toFixed(2),
      ip: getClientIp(req)
    }, 'Approval response submitted')
    
    // Send confirmation email to client
    sendApprovalConfirmation({
      to: approval.client.email,
      clientName: approval.client.firstName,
      projectName: approval.project.name,
      stageName: approval.stageLabel,
      approvedAt: new Date()
    }).catch(err => logger.error({ err }, 'Failed to send confirmation email'))
    
    // Get team emails and notify
    const teamMembers = await prisma.user.findMany({
      where: { 
        organizationId: approval.project.organizationId,
        isActive: true
      },
      select: { email: true }
    })
    
    if (teamMembers.length > 0) {
      sendTeamNotification({
        to: teamMembers.map(m => m.email),
        projectName: approval.project.name,
        stageName: approval.stageLabel,
        clientName: `${approval.client.firstName} ${approval.client.lastName}`,
        action: action === 'approve' ? 'approved' : 'changes_requested',
        notes: notes || undefined
      }).catch(err => logger.error({ err }, 'Failed to send team notification'))
    }
    
    res.json({
      success: true,
      data: {
        id: updatedApproval.id,
        status: newStatus,
        respondedAt: updatedApproval.respondedAt?.toISOString(),
        message: action === 'approve' 
          ? 'Thank you for your approval!'
          : 'Your feedback has been submitted'
      }
    })
  })
)

/**
 * POST /api/approvals/:token/view
 * Track approval view (public, no CSRF)
 */
router.post(
  '/:token/view',
  approvalRateLimiter,
  validate(approvalSchemas.trackView),
  asyncHandler(async (req, res) => {
    const { token } = req.params
    
    if (!isValidToken(token)) {
      res.status(204).send()
      return
    }
    
    await prisma.approval.updateMany({
      where: { 
        token,
        status: 'PENDING'
      },
      data: {
        viewCount: { increment: 1 },
        viewedAt: new Date()
      }
    }).catch(() => {})
    
    res.status(204).send()
  })
)

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

/**
 * GET /api/approvals
 * List approvals (authenticated)
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const { status, projectId, page = '1', pageSize = '20' } = req.query
    
    const where: any = {
      project: { organizationId }
    }
    
    if (status) {
      where.status = status
    }
    
    if (projectId) {
      where.projectId = projectId
    }
    
    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              reference: true
            }
          },
          client: {
            select: {
              firstName: true,
              lastName: true,
              company: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        take: parseInt(pageSize as string)
      }),
      prisma.approval.count({ where })
    ])
    
    res.json({
      success: true,
      data: {
        items: approvals.map(a => ({
          id: a.id,
          projectId: a.project.id,
          projectName: a.project.name,
          projectReference: a.project.reference,
          clientName: `${a.client.firstName} ${a.client.lastName}`,
          clientCompany: a.client.company,
          stage: a.stage,
          stageLabel: a.stageLabel,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          expiresAt: a.expiresAt.toISOString(),
          respondedAt: a.respondedAt?.toISOString() || null,
          viewCount: a.viewCount,
          reminderCount: a.reminderCount
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(total / parseInt(pageSize as string))
      }
    })
  })
)

/**
 * POST /api/approvals/:id/remind
 * Send reminder for pending approval (authenticated)
 */
router.post(
  '/:id/remind',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { organizationId, user } = req
    
    const approval = await prisma.approval.findFirst({
      where: {
        id,
        project: { organizationId },
        status: 'PENDING'
      },
      include: {
        client: true,
        project: true
      }
    })
    
    if (!approval) {
      throw new NotFoundError('Approval')
    }
    
    // Check if expired
    if (approval.expiresAt < new Date()) {
      throw new AppError(400, 'APPROVAL_EXPIRED', 'Cannot send reminder for expired approval')
    }
    
    // Calculate days pending
    const daysPending = Math.floor((Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    
    // Send reminder email
    await sendApprovalReminder({
      to: approval.client.email,
      clientName: approval.client.firstName,
      projectName: approval.project.name,
      stageName: approval.stageLabel,
      approvalToken: approval.token,
      daysPending
    })
    
    // Update reminder count
    await prisma.approval.update({
      where: { id },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date()
      }
    })
    
    // Create reminder record
    await prisma.reminder.create({
      data: {
        type: approval.reminderCount === 0 ? 'FIRST' : approval.reminderCount === 1 ? 'SECOND' : 'ESCALATION',
        channel: 'EMAIL',
        approvalId: id,
        sentById: user!.id,
        scheduledFor: new Date(),
        sentAt: new Date()
      }
    })
    
    logger.info({
      approvalId: id,
      reminderCount: approval.reminderCount + 1
    }, 'Reminder sent')
    
    res.json({
      success: true,
      data: {
        message: 'Reminder sent successfully',
        reminderCount: approval.reminderCount + 1
      }
    })
  })
)

export { router as approvalRoutes }
