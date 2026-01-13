/**
 * Portal Routes
 * Client-facing portal endpoints
 * Authenticated via portal token
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js'
import { clientPortalAuth } from '../middleware/auth.js'

const router = Router()
const logger = createLogger('portal')

// All portal routes use client portal auth
router.use(clientPortalAuth)

// =============================================================================
// PORTAL HOME
// =============================================================================

/**
 * GET /api/portal
 * Get client's portal data
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const client = (req as any).client
    
    // Get client's projects with approvals
    const projects = await prisma.project.findMany({
      where: {
        clientId: client.id,
        status: { in: ['ACTIVE', 'ON_HOLD'] }
      },
      include: {
        approvals: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            stage: true,
            stageLabel: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            respondedAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    // Calculate pending counts
    const pendingCount = projects.reduce((count, p) => {
      return count + p.approvals.filter(a => 
        a.status === 'PENDING' && a.expiresAt > new Date()
      ).length
    }, 0)
    
    res.json({
      success: true,
      data: {
        clientName: `${client.firstName} ${client.lastName}`,
        pendingCount,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          reference: p.reference,
          status: p.status,
          currentStage: p.currentStage,
          pendingApprovalsCount: p.approvals.filter(a => 
            a.status === 'PENDING' && a.expiresAt > new Date()
          ).length,
          completedApprovalsCount: p.approvals.filter(a => 
            a.status === 'APPROVED' || a.status === 'CHANGES_REQUESTED'
          ).length,
          approvals: p.approvals.map(a => ({
            id: a.id,
            stage: a.stage,
            stageLabel: a.stageLabel,
            status: a.expiresAt < new Date() && a.status === 'PENDING' 
              ? 'EXPIRED' 
              : a.status,
            createdAt: a.createdAt.toISOString(),
            expiresAt: a.expiresAt.toISOString(),
            respondedAt: a.respondedAt?.toISOString() || null
          }))
        }))
      }
    })
  })
)

/**
 * GET /api/portal/projects/:projectId
 * Get single project details for client
 */
router.get(
  '/projects/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params
    const client = (req as any).client
    
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        clientId: client.id
      },
      include: {
        approvals: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            stage: true,
            stageLabel: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            respondedAt: true,
            responseNotes: true,
            deliverableUrl: true,
            deliverableType: true,
            deliverableName: true
          }
        },
        organization: {
          select: {
            name: true,
            logo: true,
            primaryColor: true
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
        clientName: `${client.firstName} ${client.lastName}`,
        address: project.address,
        status: project.status,
        currentStage: project.currentStage,
        startDate: project.startDate.toISOString(),
        targetCompletionDate: project.targetCompletionDate?.toISOString() || null,
        pendingApprovalsCount: project.approvals.filter(a => 
          a.status === 'PENDING' && a.expiresAt > new Date()
        ).length,
        completedApprovalsCount: project.approvals.filter(a => 
          a.status === 'APPROVED' || a.status === 'CHANGES_REQUESTED'
        ).length,
        approvals: project.approvals.map(a => ({
          id: a.id,
          stage: a.stage,
          stageLabel: a.stageLabel,
          status: a.expiresAt < new Date() && a.status === 'PENDING' 
            ? 'EXPIRED' 
            : a.status,
          createdAt: a.createdAt.toISOString(),
          expiresAt: a.expiresAt.toISOString(),
          respondedAt: a.respondedAt?.toISOString() || null,
          responseNotes: a.status !== 'PENDING' ? a.responseNotes : null,
          hasDeliverable: !!a.deliverableUrl
        })),
        organization: {
          name: project.organization.name,
          logo: project.organization.logo,
          primaryColor: project.organization.primaryColor
        }
      }
    })
  })
)

export { router as portalRoutes }
