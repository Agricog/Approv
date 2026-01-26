/**
 * Project Routes
 * Project management endpoints (authenticated)
 */
import { Router } from 'express'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')
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
            reminderCount: true,
            deliverableUrl: true,
            deliverableName: true,
            deliverableType: true
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
          reminderCount: a.reminderCount || 0,
          deliverableUrl: a.deliverableUrl,
          deliverableName: a.deliverableName,
          deliverableType: a.deliverableType
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
// PROJECT REPORT (PDF Download)
// =============================================================================

/**
 * GET /api/projects/:id/report
 * Generate and download project approval history report as PDF
 */
router.get(
  '/:id/report',
  requireProjectAccess,
  async (req: any, res: any) => {
    try {
      const { id } = req.params
      const { organizationId, user } = req
      
      // Get full project data with all approvals
      const project = await prisma.project.findFirst({
        where: { id, organizationId },
        include: {
          client: true,
          organization: {
            select: {
              name: true
            }
          },
          approvals: {
            orderBy: { createdAt: 'asc' },
            include: {
              sentBy: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      })
      
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' })
      }
      
      // Log report generation
      logAudit({
        action: 'project.report_generated',
        entityType: 'project',
        entityId: id,
        userId: user?.id,
        organizationId: organizationId,
        ipAddress: getClientIp(req),
        metadata: {
          approvalsCount: project.approvals.length
        }
      })
      
      logger.info({
        projectId: id,
        userId: user?.id,
        approvalsCount: project.approvals.length
      }, 'Project report generated')
    
    // Helper function to format dates
    const formatDate = (date: Date | string | null): string => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const formatShortDate = (date: Date | string | null): string => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
    
    // Create PDF and collect into buffer
    const chunks: Buffer[] = []
    
    await new Promise<void>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4',
          margin: 50,
          autoFirstPage: true
        })
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve())
        doc.on('error', (err: Error) => reject(err))
        
        // =========================================================================
        // HEADER
        // =========================================================================
        
        doc.fontSize(22).text('PROJECT APPROVAL REPORT', { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(10).text('Generated: ' + formatDate(new Date()), { align: 'center' })
        doc.fontSize(9).text('Report ID: RPT-' + Date.now().toString(36).toUpperCase(), { align: 'center' })
        doc.moveDown(2)
        
        // =========================================================================
        // PROJECT DETAILS
        // =========================================================================
        
        doc.fontSize(14).text('PROJECT DETAILS')
        doc.fontSize(10).text('─'.repeat(60))
        doc.moveDown(0.5)
        
        doc.text('Project Name: ' + project.name)
        doc.text('Reference: ' + project.reference)
        doc.text('Status: ' + project.status)
        doc.text('Current Stage: ' + (project.currentStage || 'Not set'))
        doc.text('Start Date: ' + formatShortDate(project.startDate))
        doc.text('Target Completion: ' + formatShortDate(project.targetCompletionDate))
        if (project.address) {
          doc.text('Address: ' + project.address)
        }
        doc.moveDown(1.5)
        
        // =========================================================================
        // CLIENT DETAILS
        // =========================================================================
        
        doc.fontSize(14).text('CLIENT INFORMATION')
        doc.fontSize(10).text('─'.repeat(60))
        doc.moveDown(0.5)
        
        doc.text('Name: ' + project.client.firstName + ' ' + project.client.lastName)
        doc.text('Email: ' + project.client.email)
        if (project.client.company) {
          doc.text('Company: ' + project.client.company)
        }
        if (project.client.phone) {
          doc.text('Phone: ' + project.client.phone)
        }
        doc.moveDown(1.5)
        
        // =========================================================================
        // APPROVAL SUMMARY
        // =========================================================================
        
        doc.fontSize(14).text('APPROVAL SUMMARY')
        doc.fontSize(10).text('─'.repeat(60))
        doc.moveDown(0.5)
        
        const totalApprovals = project.approvals.length
        const approved = project.approvals.filter(a => a.status === 'APPROVED').length
        const changesRequested = project.approvals.filter(a => a.status === 'CHANGES_REQUESTED').length
        const pending = project.approvals.filter(a => a.status === 'PENDING').length
        const expired = project.approvals.filter(a => a.status === 'EXPIRED').length
        
        doc.fontSize(10)
        doc.text('Total Approvals: ' + totalApprovals)
        doc.text('Approved: ' + approved)
        doc.text('Changes Requested: ' + changesRequested)
        doc.text('Pending: ' + pending)
        doc.text('Expired: ' + expired)
        doc.moveDown(1)
        
        // =========================================================================
        // APPROVAL HISTORY
        // =========================================================================
        
        doc.fontSize(14).text('APPROVAL HISTORY')
        doc.moveDown(0.3)
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
        doc.moveDown(0.5)
        
        if (project.approvals.length === 0) {
          doc.fontSize(10).text('No approvals have been created for this project.')
        } else {
          project.approvals.forEach((approval, index) => {
            if (doc.y > 700) {
              doc.addPage()
            }
            
            doc.fontSize(11).text((index + 1) + '. ' + approval.stageLabel)
            doc.moveDown(0.2)
            
            doc.fontSize(9)
            doc.text('   Status: ' + approval.status.replace('_', ' '))
            doc.text('   Sent: ' + formatDate(approval.createdAt))
            
            if (approval.sentBy) {
              doc.text('   Sent by: ' + approval.sentBy.firstName + ' ' + approval.sentBy.lastName)
            }
            
            if (approval.expiresAt) {
              doc.text('   Expires: ' + formatDate(approval.expiresAt))
            }
            
            if (approval.respondedAt) {
              doc.text('   Responded: ' + formatDate(approval.respondedAt))
            }
            
            if (approval.responseTimeHours) {
              doc.text('   Response Time: ' + approval.responseTimeHours.toFixed(1) + ' hours')
            }
            
            doc.text('   Views: ' + (approval.viewCount || 0) + ' | Reminders: ' + (approval.reminderCount || 0))
            
            if (approval.responseNotes) {
              doc.moveDown(0.2)
              doc.fontSize(9).text('   Client Feedback: "' + approval.responseNotes + '"')
            }
            
            doc.moveDown(0.5)
          })
        }
        
        // =========================================================================
        // DECLARATION
        // =========================================================================
        
        doc.addPage()
        
        doc.fontSize(14).text('DECLARATION')
        doc.moveDown(0.3)
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
        doc.moveDown(0.5)
        
        doc.fontSize(10)
        doc.text('This report contains a complete record of all approval requests and client responses for the above project.')
        doc.moveDown(0.5)
        doc.text('This document may be used as evidence of client approvals and feedback in the event of any disputes.')
        doc.moveDown(2)
        
        doc.text('_________________________________')
        doc.text('Signature (if required)')
        doc.moveDown(1)
        doc.text('_________________________________')
        doc.text('Date')
        doc.moveDown(3)
        
        doc.fontSize(8).text('Generated by Approv - https://approv.co.uk', { align: 'center' })
        
        // End document
        doc.end()
      } catch (err) {
        reject(err)
      }
    })
    
    // Combine chunks into single buffer
    const pdfBuffer = Buffer.concat(chunks)
    
    // Send response
    const filename = project.reference + '-report-' + new Date().toISOString().split('T')[0] + '.pdf'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBuffer.length)
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
    return res.send(pdfBuffer)
    
    } catch (error) {
      logger.error({ error }, 'Failed to generate PDF report')
      return res.status(500).json({ success: false, error: 'Failed to generate report' })
    }
  }
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
