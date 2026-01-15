/**
 * Activity Routes
 * Audit log endpoints (authenticated)
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

/**
 * GET /api/activity
 * Get activity log for organization
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const { 
      page = 1, 
      pageSize = 50,
      entityType,
      action
    } = req.query as any

    const where: any = { organizationId }
    
    if (entityType) where.entityType = entityType
    if (action) where.action = { contains: action }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          project: {
            select: {
              name: true,
              reference: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    res.json({
      success: true,
      data: {
        items: logs.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata: log.metadata,
          createdAt: log.createdAt.toISOString(),
          user: log.user ? {
            name: log.user.firstName + ' ' + log.user.lastName,
            email: log.user.email
          } : null,
          project: log.project ? {
            name: log.project.name,
            reference: log.project.reference
          } : null
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize))
      }
    })
  })
)

export { router as activityRoutes }
