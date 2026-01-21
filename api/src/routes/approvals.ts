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
import { csrfProtection } from '../middleware/csrf.js'
import { 
  sendApprovalConfirmation, 
  sendTeamNotification,
  sendApprovalReminder,
  sendApprovalRequest
} from '../services/email.js'
import { getSignedDownloadUrl, isStorageConfigured } from '../services/storage.js'

const router = Router()
const logger = createLogger('approvals')

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Resolve deliverable URL - converts R2 keys to signed URLs
 */
async function resolveDeliverableUrl(deliverableUrl: string | null): Promise<string | null> {
  if (!deliverableUrl) return null
  
  // Check if it's an R2 key (prefixed with "r2:")
  if (deliverableUrl.startsWith('r2:')) {
    const key = deliverableUrl.substring(3) // Remove "r2:" prefix
    
    if (!isStorageConfigured()) {
      logger.warn({ key }, 'R2 storage not configured, cannot resolve deliverable URL')
      return null
    }
    
    try {
      // Generate signed URL valid for 1 hour
      const signedUrl = await getSignedDownloadUrl(key, 3600)
      return signedUrl
    } catch (err) {
      logger.error({ err, key }, 'Failed to generate signed URL for deliverable')
      return null
    }
  }
  
  // Return as-is if it's a regular URL
  return deliverableUrl
}

// =============================================================================
// AUTHENTICATED ROUTES (with CSRF protection)
// =============================================================================

/**
 * POST /api/approvals
 * Create new approval request (authenticated)
 */
router.post(
  '/',
  csrfProtection,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req
    const { projectId, stage, stageLabel, deliverableUrl, deliverableName, deliverableType, expiryDays = 14 } = req.body

    if (!projectId || !stage || !stageLabel) {
      throw new ValidationError('projectId, stage, and stageLabel are required')
    }

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId
      },
      include: {
        client: true,
        organization: {
          select: { name: true }
        }
      }
    })

    if (!project) {
      throw new NotFoundError('Project')
    }

    // Create approval
    const approval = await prisma.approval.create({
      data: {
        projectId,
        clientId: project.clientId,
        sentById: user!.id,
        stage,
        stageLabel,
        deliverableUrl: deliverableUrl || null,
        deliverableName: deliverableName || null,
        deliverableType: deliverableType || null,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      }
    })

    // Log audit
    logAudit({
      action: 'approval.created',
      entityType: 'approval',
      entityId: approval.id,
      organizationId,
      userId: user!.id,
      metadata: {
        projectId,
        stage,
        stageLabel,
        hasDeliverable: !!deliverableUrl
      }
    })

    logger.info({
      approvalId: approval.id,
      projectId,
      stage,
      hasDeliverable: !!deliverableUrl
    }, 'Approval created')

    // Send approval request email to client
    sendApprovalRequest({
      to: project.client.email,
      clientName: project.client.firstName,
      projectName: project.name,
      stageName: stageLabel,
      approvalToken: approval.token,
      organizationName: project.organization?.name || 'Your architect'
    }).catch(err => logger.error({ err }, 'Failed to send approval request email'))

    res.status(201).json({
      success: true,
      data: {
        id: approval.id,
        token: approval.token,
        approvalUrl: `https://approv.co.uk/approve/${approval.token}`,
        expiresAt: approval.expiresAt.toISOString()
      }
    })
  })
)

/**
 * GET /api/approvals
 * List approvals (authenticated)
 */
router.get(
  '/',
  csrfProtection,
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
          reminderCount: a.reminderCount,
          hasDeliverable: !!a.deliverableUrl
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
 * POST /api/approvals/:id/resubmit
 * Resubmit approval after changes requested (authenticated)
 */
router.post(
  '/:id/resubmit',
  csrfProtection,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { organizationId, user } = req
    const { deliverableUrl, deliverableName, deliverableType, expiryDays = 14 } = req.body

    // Find the approval
    const approval = await prisma.approval.findFirst({
      where: {
        id,
        project: { organizationId }
      },
      include: {
        client: true,
        project: {
          include: {
            organization: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!approval) {
      throw new NotFoundError('Approval')
    }

    // Only allow resubmit for CHANGES_REQUESTED status
    if (approval.status !== 'CHANGES_REQUESTED') {
      throw new AppError(
        400,
        'INVALID_STATUS',
        'Only approvals with "Changes Requested" status can be resubmitted'
      )
    }

    // Store previous state for audit
    const previousState = {
      status: approval.status,
      deliverableUrl: approval.deliverableUrl,
      deliverableName: approval.deliverableName,
      responseNotes: approval.responseNotes
    }

    // Update the approval - reset to PENDING with new deliverable
    const updatedApproval = await prisma.approval.update({
      where: { id },
      data: {
        status: 'PENDING',
        deliverableUrl: deliverableUrl || approval.deliverableUrl,
        deliverableName: deliverableName || approval.deliverableName,
        deliverableType: deliverableType || approval.deliverableType,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
        // Reset response fields
        respondedAt: null,
        responseNotes: null,
        responseTimeHours: null,
        // Reset view tracking for this revision
        viewCount: 0,
        viewedAt: null,
        // Keep reminder count for history but reset last reminder
        lastReminderAt: null,
        updatedAt: new Date()
      }
    })

    // Log audit trail
    logAudit({
      action: 'approval.resubmitted',
      entityType: 'approval',
      entityId: approval.id,
      organizationId: organizationId!,
      userId: user!.id,
      metadata: {
        projectId: approval.projectId,
        stage: approval.stage,
        previousFeedback: previousState.responseNotes,
        hasNewDeliverable: !!deliverableUrl
      },
      previousState,
      newState: {
        status: 'PENDING',
        deliverableUrl: updatedApproval.deliverableUrl,
        deliverableName: updatedApproval.deliverableName
      }
    })

    logger.info({
      approvalId: id,
      projectId: approval.projectId,
      stage: approval.stage,
      hasNewDeliverable: !!deliverableUrl
    }, 'Approval resubmitted')

    // Send new approval request email to client
    sendApprovalRequest({
      to: approval.client.email,
      clientName: approval.client.firstName,
      projectName: approval.project.name,
      stageName: `${approval.stageLabel} (Revised)`,
      approvalToken: approval.token,
      organizationName: approval.project.organization?.name || 'Your architect'
    }).catch(err => logger.error({ err }, 'Failed to send resubmit approval email'))

    res.json({
      success: true,
      data: {
        id: updatedApproval.id,
        token: updatedApproval.token,
        status: updatedApproval.status,
        approvalUrl: `https://approv.co.uk/approve/${updatedApproval.token}`,
        expiresAt: updatedApproval.expiresAt.toISOString(),
        message: 'Approval resubmitted successfully. Client will receive a new email.'
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
  csrfProtection,
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

// =============================================================================
// PUBLIC ROUTES (Token-based access - NO CSRF)
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
    
    // Resolve deliverable URL (converts R2 keys to signed URLs)
    const resolvedDeliverableUrl = await resolveDeliverableUrl(approval.deliverableUrl)
    
    logger.info({
      approvalId: approval.id,
      status: effectiveStatus,
      hasDeliverable: !!resolvedDeliverableUrl,
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
        deliverableUrl: resolvedDeliverableUrl,
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
 * Submit approval response (public - NO CSRF, token acts as auth)
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
    
    // Resolve deliverable URL for the confirmation email
    const resolvedDeliverableUrl = await resolveDeliverableUrl(approval.deliverableUrl)
    
    // Send confirmation email to client with all details
    sendApprovalConfirmation({
      to: approval.client.email,
      clientName: approval.client.firstName,
      projectName: approval.project.name,
      stageName: approval.stageLabel,
      approvedAt: new Date(),
      approvalToken: token,
      deliverableUrl: resolvedDeliverableUrl,
      deliverableName: approval.deliverableName,
      action: action === 'approve' ? 'approved' : 'changes_requested',
      organizationName: approval.project.organization?.name || 'Your architect'
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

export { router as approvalRoutes }
