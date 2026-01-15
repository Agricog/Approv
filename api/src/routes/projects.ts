/**
 * Project Routes
 * Project management endpoints (authenticated)
 */
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger, logAudit } from '../lib/logger.js'
import { 
  asyncHandler, 
  NotFoundError,
  ConflictError
} from '../middleware/errorHandler.js'
import { 
  validate, 
  projectSchemas,
  getClientIp 
} from '../middleware/index.js'
import { requireAuth, requireProjectAccess, requireAdmin } from '../middleware/auth.js'

const router = Router()
const logger = createLogger('projects')

// All project routes require authentication
router.use(requireAuth)

// =============================================================================
// LIST & GET
// =============================================================================

/**
 * GET /api/projects
 * List projects for organization
 */
router.get(
  '/',
  validate(projectSchemas.list),
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const { 
      status, 
      stage, 
      clientId, 
      search,
      page = 1, 
      pageSize = 20,
      sortField = 'createdAt',
      sortDirection = 'desc'
    } = req.query as any
    
    const where: any = { organizationId }
    
    if (status) where.status = status
    if (stage) where.currentStage = stage
    if (clientId) where.clientId = clientId
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { client: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ]
    }
    
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              company: true
            }
          },
          _count: {
            select: {
              approvals: {
                where: { status: 'PENDING' }
              }
            }
          }
        },
        orderBy: { [sortField]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.project.count({ where })
    ])
    
    res.json({
      success: true,
      data: {
        items: projects.map(p => ({
          id: p.id,
          name: p.name,
          reference: p.reference,
          clientName: p.client.firstName + ' ' + p.client.lastName,
          clientCompany: p.client.company,
          status: p.status,
          currentStage: p.currentStage,
          pendingApprovals: p._count.approvals,
          startDate: p.startDate.toISOString(),
          targetCompletionDate: p.targetCompletionDate?.toISOString() || null,
          lastActivityAt: p.updatedAt.toISOString()
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total
      }
    })
  })
)

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get(
  '/:id',
  validate(projectSchemas.getById),
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { organizationId } = req
    
    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            phone: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            token: true,
            stage: true,
            stageLabel: true,
            status: true,
            expiresAt: true,
            createdAt: true,
            respondedAt: true,
            responseTimeHours: true,
            responseNotes: true,
            viewCount: true,
            reminderCount: true
          }
        }
      }
    })
    
    if (!project) {
      throw new NotFoundError('Project')
    }
    
    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        reference: project.reference,
        description: project.description,
        address: project.address,
        status: project.status,
        currentStage: project.currentStage,
        mondayItemId: project.mondayItemId,
        startDate: project.startDate.toISOString(),
        targetCompletionDate: project.targetCompletionDate?.toISOString() || null,
        completedAt: project.completedAt?.toISOString() || null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        client: {
          id: project.client.id,
          name: project.client.firstName + ' ' + project.client.lastName,
          email: project.client.email,
          company: project.client.company,
          phone: project.client.phone
        },
        members: project.members.map(m => ({
          id: m.user.id,
          name: m.user.firstName + ' ' + m.user.lastName,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          role: m.role
        })),
        approvals: project.approvals.map(a => ({
          id: a.id,
          token: a.token,
          stage: a.stage,
          stageLabel: a.stageLabel,
          status: a.status,
          expiresAt: a.expiresAt?.toISOString() || null,
          createdAt: a.createdAt.toISOString(),
          respondedAt: a.respondedAt?.toISOString() || null,
          responseTimeHours: a.responseTimeHours,
          responseNotes: a.responseNotes,
          viewCount: a.viewCount || 0,
          reminderCount: a.reminderCount || 0
        })),
        stats: {
          totalApprovals: project.approvals.length,
          pendingApprovals: project.approvals.filter(a => a.status === 'PENDING').length,
          approvedApprovals: project.approvals.filter(a => a.status === 'APPROVED').length,
          changesRequested: project.approvals.filter(a => a.status === 'CHANGES_REQUESTED').length
        }
      }
    })
  })
)

// =============================================================================
// CREATE & UPDATE
// =============================================================================

/**
 * POST /api/projects
 * Create new project
 */
router.post(
  '/',
  validate(projectSchemas.create),
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req
    const { name, reference, description, address, clientId, client, targetCompletionDate } = req.body
    
    // Generate reference if not provided
    const projectReference = reference || await generateProjectReference(organizationId!)
    
    // Check for duplicate reference
    const existing = await prisma.project.findFirst({
      where: { organizationId, reference: projectReference }
    })
    
    if (existing) {
      throw new ConflictError('A project with this reference already exists')
    }
    
    // Create or get client
    let finalClientId = clientId
    
    if (!finalClientId && client) {
      // Create new client
      const newClient = await prisma.client.create({
        data: {
          organizationId: organizationId!,
          createdBy: user!.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          company: client.company,
          phone: client.phone
        }
      })
      finalClientId = newClient.id
    }
    
    // Create project
    const project = await prisma.project.create({
      data: {
        organizationId: organizationId!,
        clientId: finalClientId,
        name,
        reference: projectReference,
        description,
        address,
        targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        members: {
          create: {
            userId: user!.id,
            role: 'LEAD'
          }
        }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    // Log audit
    logAudit({
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      userId: user!.id,
      organizationId: organizationId!,
      ipAddress: getClientIp(req),
      newState: { name, reference: projectReference, clientId: finalClientId }
    })
    
    logger.info({
      projectId: project.id,
      reference: projectReference,
      userId: user!.id
    }, 'Project created')
    
    res.status(201).json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        reference: project.reference,
        clientName: project.client.firstName + ' ' + project.client.lastName
      }
    })
  })
)

/**
 * PATCH /api/projects/:id
 * Update project
 */
router.patch(
  '/:id',
  validate(projectSchemas.update),
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { organizationId, user } = req
    const updates = req.body
    
    const existing = await prisma.project.findFirst({
      where: { id, organizationId }
    })
    
    if (!existing) {
      throw new NotFoundError('Project')
    }
    
    // Process updates
    const data: any = {}
    
    if (updates.name !== undefined) data.name = updates.name
    if (updates.description !== undefined) data.description = updates.description
    if (updates.address !== undefined) data.address = updates.address
    if (updates.status !== undefined) data.status = updates.status
    if (updates.currentStage !== undefined) data.currentStage = updates.currentStage
    if (updates.targetCompletionDate !== undefined) {
      data.targetCompletionDate = updates.targetCompletionDate 
        ? new Date(updates.targetCompletionDate) 
        : null
    }
    
    // Set completion date if status changed to COMPLETED
    if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      data.completedAt = new Date()
    }
    
    const project = await prisma.project.update({
      where: { id },
      data
    })
    
    // Log audit
    logAudit({
      action: 'project.updated',
      entityType: 'project',
      entityId: id,
      userId: user!.id,
      organizationId: organizationId!,
      ipAddress: getClientIp(req),
      previousState: {
        name: existing.name,
        status: existing.status,
        currentStage: existing.currentStage
      },
      newState: updates
    })
    
    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        status: project.status,
        currentStage: project.currentStage,
        updatedAt: project.updatedAt.toISOString()
      }
    })
  })
)

// =============================================================================
// APPROVALS
// =============================================================================

/**
 * POST /api/projects/:id/approvals
 * Create approval request for project
 */
router.post(
  '/:id/approvals',
  validate(projectSchemas.createApproval),
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { organizationId, user } = req
    const { stage, stageLabel, deliverableUrl, deliverableType, deliverableName, expiresInDays } = req.body
    
    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: { 
        client: true,
        organization: {
          select: { defaultExpiryDays: true }
        }
      }
    })
    
    if (!project) {
      throw new NotFoundError('Project')
    }
    
    const expiryDays = expiresInDays || project.organization.defaultExpiryDays
    
    const approval = await prisma.approval.create({
      data: {
        projectId: id,
        clientId: project.clientId,
        sentById: user!.id,
        stage,
        stageLabel,
        deliverableUrl,
        deliverableType,
        deliverableName,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      }
    })
    
    // Log audit
    logAudit({
      action: 'approval.created',
      entityType: 'approval',
      entityId: approval.id,
      userId: user!.id,
      organizationId: organizationId!,
      ipAddress: getClientIp(req),
      metadata: {
        projectId: id,
        stage,
        expiresInDays: expiryDays
      }
    })
    
    logger.info({
      approvalId: approval.id,
      projectId: id,
      stage,
      clientId: project.clientId
    }, 'Approval request created')
    
    // TODO: Send notification email to client
    
    res.status(201).json({
      success: true,
      data: {
        id: approval.id,
        token: approval.token,
        stage: approval.stage,
        stageLabel: approval.stageLabel,
        expiresAt: approval.expiresAt.toISOString(),
        approvalUrl: (process.env.APP_URL || 'https://approv.co.uk') + '/approve/' + approval.token
      }
    })
  })
)

// =============================================================================
// HELPERS
// =============================================================================

async function generateProjectReference(organizationId: string): Promise<string> {
  const year = new Date().getFullYear()
  
  // Count existing projects this year
  const count = await prisma.project.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(year + '-01-01'),
        lt: new Date((year + 1) + '-01-01')
      }
    }
  })
  
  return 'PRJ-' + year + '-' + String(count + 1).padStart(3, '0')
}

export { router as projectRoutes }
