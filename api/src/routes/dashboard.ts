/**
 * Dashboard Routes
 * Metrics, analytics, and overview data
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validate, dashboardSchemas } from '../middleware/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const logger = createLogger('dashboard')

// All dashboard routes require authentication
router.use(requireAuth)

// =============================================================================
// OVERVIEW
// =============================================================================

/**
 * GET /api/dashboard
 * Main dashboard data
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    
    // Get metrics in parallel
    const [
      activeProjects,
      pendingApprovals,
      approvalStats,
      recentActivity,
      bottlenecks
    ] = await Promise.all([
      // Active projects count
      prisma.project.count({
        where: { organizationId, status: 'ACTIVE' }
      }),
      
      // Pending approvals count
      prisma.approval.count({
        where: {
          project: { organizationId },
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      }),
      
      // Approval stats (last 30 days)
      getApprovalStats(organizationId!, 30),
      
      // Recent activity
      getRecentActivity(organizationId!, 10),
      
      // Bottlenecks (approvals pending > 3 days)
      getBottlenecks(organizationId!, 5)
    ])
    
    // Calculate trends (compare to previous period)
    const previousStats = await getApprovalStats(organizationId!, 30, 30)
    
    const trends = {
      projectsChange: 0, // Would need historical data
      approvalsChange: previousStats.total > 0 
        ? ((approvalStats.total - previousStats.total) / previousStats.total) * 100 
        : 0,
      responseTimeChange: previousStats.avgResponseTimeHours > 0
        ? ((approvalStats.avgResponseTimeHours - previousStats.avgResponseTimeHours) / previousStats.avgResponseTimeHours) * 100
        : 0
    }
    
    res.json({
      success: true,
      data: {
        metrics: {
          activeProjects,
          pendingApprovals,
          approvalStats,
          trends
        },
        recentActivity,
        bottlenecks
      }
    })
  })
)

/**
 * GET /api/dashboard/metrics
 * Just the metrics
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    
    const [activeProjects, pendingApprovals, approvalStats] = await Promise.all([
      prisma.project.count({
        where: { organizationId, status: 'ACTIVE' }
      }),
      prisma.approval.count({
        where: {
          project: { organizationId },
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      }),
      getApprovalStats(organizationId!, 30)
    ])
    
    const previousStats = await getApprovalStats(organizationId!, 30, 30)
    
    res.json({
      success: true,
      data: {
        activeProjects,
        pendingApprovals,
        approvalStats,
        trends: {
          projectsChange: 0,
          approvalsChange: previousStats.total > 0 
            ? ((approvalStats.total - previousStats.total) / previousStats.total) * 100 
            : 0,
          responseTimeChange: previousStats.avgResponseTimeHours > 0
            ? ((approvalStats.avgResponseTimeHours - previousStats.avgResponseTimeHours) / previousStats.avgResponseTimeHours) * 100
            : 0
        }
      }
    })
  })
)

/**
 * GET /api/dashboard/analytics
 * Detailed analytics with timeline
 */
router.get(
  '/analytics',
  validate(dashboardSchemas.analytics),
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const { period = 'month' } = req.query as any
    
    // Calculate date range
    const { startDate, endDate } = getDateRange(period)
    
    // Get timeline data
    const timeline = await getTimeline(organizationId!, startDate, endDate, period)
    
    // Get by stage breakdown
    const byStage = await getByStageBreakdown(organizationId!, startDate, endDate)
    
    // Get overall stats
    const stats = await getApprovalStats(organizationId!, getDaysFromPeriod(period))
    
    res.json({
      success: true,
      data: {
        metrics: {
          activeProjects: await prisma.project.count({
            where: { organizationId, status: 'ACTIVE' }
          }),
          pendingApprovals: await prisma.approval.count({
            where: {
              project: { organizationId },
              status: 'PENDING',
              expiresAt: { gt: new Date() }
            }
          }),
          approvalStats: stats,
          trends: { projectsChange: 0, approvalsChange: 0, responseTimeChange: 0 }
        },
        timeline,
        byStage,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    })
  })
)

/**
 * GET /api/dashboard/activity
 * Recent activity log
 */
router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const activity = await getRecentActivity(organizationId!, 20)
    
    res.json({
      success: true,
      data: activity
    })
  })
)

/**
 * GET /api/dashboard/bottlenecks
 * Approvals that need attention
 */
router.get(
  '/bottlenecks',
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const bottlenecks = await getBottlenecks(organizationId!, 10)
    
    res.json({
      success: true,
      data: bottlenecks
    })
  })
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getApprovalStats(organizationId: string, days: number, offsetDays = 0) {
  const endDate = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  
  const approvals = await prisma.approval.findMany({
    where: {
      project: { organizationId },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      status: true,
      responseTimeHours: true
    }
  })
  
  const total = approvals.length
  const approved = approvals.filter(a => a.status === 'APPROVED').length
  const changesRequested = approvals.filter(a => a.status === 'CHANGES_REQUESTED').length
  
  const responseTimes = approvals
    .filter(a => a.responseTimeHours !== null)
    .map(a => a.responseTimeHours!)
  
  const avgResponseTimeHours = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0
  
  return {
    total,
    approved,
    changesRequested,
    pending: total - approved - changesRequested,
    approvalRate: total > 0 ? (approved / (approved + changesRequested)) * 100 : 0,
    avgResponseTimeHours
  }
}

async function getRecentActivity(organizationId: string, limit: number) {
  const logs = await prisma.auditLog.findMany({
    where: { 
      organizationId,
      entityType: { in: ['approval', 'project'] }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      project: {
        select: { name: true }
      }
    }
  })
  
  return logs.map(log => ({
    id: log.id,
    type: log.entityType as 'approval' | 'project',
    message: formatAuditMessage(log.action, log.user, log.project),
    projectName: log.project?.name || 'Unknown',
    timestamp: log.createdAt.toISOString(),
    status: extractStatus(log.newState)
  }))
}

function formatAuditMessage(
  action: string, 
  user: { firstName: string; lastName: string } | null,
  project: { name: string } | null
): string {
  const userName = user ? `${user.firstName} ${user.lastName}` : 'System'
  
  switch (action) {
    case 'approval.created':
      return `${userName} sent an approval request`
    case 'approval.approve':
      return 'Client approved the deliverable'
    case 'approval.request_changes':
      return 'Client requested changes'
    case 'project.created':
      return `${userName} created a new project`
    case 'project.updated':
      return `${userName} updated the project`
    default:
      return `${action} by ${userName}`
  }
}

function extractStatus(state: any): string | undefined {
  if (state && typeof state === 'object' && 'status' in state) {
    return String(state.status)
  }
  return undefined
}

async function getBottlenecks(organizationId: string, limit: number) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  
  const approvals = await prisma.approval.findMany({
    where: {
      project: { organizationId },
      status: 'PENDING',
      createdAt: { lt: threeDaysAgo },
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      project: {
        select: { id: true, name: true }
      },
      client: {
        select: { firstName: true, lastName: true }
      }
    }
  })
  
  return approvals.map(a => {
    const daysPending = Math.floor((Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      id: a.id,
      projectId: a.project.id,
      projectName: a.project.name,
      stageLabel: a.stageLabel,
      clientName: `${a.client.firstName} ${a.client.lastName}`,
      daysPending,
      urgency: daysPending > 10 ? 'critical' : daysPending > 7 ? 'high' : daysPending > 5 ? 'medium' : 'low'
    }
  })
}

function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  let startDate: Date
  
  switch (period) {
    case 'week':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      break
    default: // month
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
  
  return { startDate, endDate }
}

function getDaysFromPeriod(period: string): number {
  switch (period) {
    case 'week': return 7
    case 'quarter': return 90
    case 'year': return 365
    default: return 30
  }
}

async function getTimeline(
  organizationId: string, 
  startDate: Date, 
  endDate: Date,
  period: string
) {
  const approvals = await prisma.approval.findMany({
    where: {
      project: { organizationId },
      createdAt: { gte: startDate, lte: endDate }
    },
    select: {
      status: true,
      createdAt: true
    }
  })
  
  // Group by date
  const grouped = new Map<string, { approved: number; changesRequested: number; pending: number; total: number }>()
  
  for (const approval of approvals) {
    const dateKey = approval.createdAt.toISOString().split('T')[0]!
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { approved: 0, changesRequested: 0, pending: 0, total: 0 })
    }
    
    const entry = grouped.get(dateKey)!
    entry.total++
    
    if (approval.status === 'APPROVED') entry.approved++
    else if (approval.status === 'CHANGES_REQUESTED') entry.changesRequested++
    else entry.pending++
  }
  
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }))
}

async function getByStageBreakdown(organizationId: string, startDate: Date, endDate: Date) {
  const stages = ['INITIAL_DRAWINGS', 'DETAILED_DESIGN', 'PLANNING_PACK', 'FINAL_APPROVAL']
  const stageLabels: Record<string, string> = {
    'INITIAL_DRAWINGS': 'Initial Drawings',
    'DETAILED_DESIGN': 'Detailed Design',
    'PLANNING_PACK': 'Planning Pack',
    'FINAL_APPROVAL': 'Final Approval'
  }
  
  const results = await Promise.all(
    stages.map(async stage => {
      const approvals = await prisma.approval.findMany({
        where: {
          project: { organizationId },
          stage: stage as 'INITIAL_DRAWINGS' | 'DETAILED_DESIGN' | 'PLANNING_PACK' | 'FINAL_APPROVAL',
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          status: true,
          responseTimeHours: true
        }
      })
      
      const total = approvals.length
      const approved = approvals.filter(a => a.status === 'APPROVED').length
      const changesRequested = approvals.filter(a => a.status === 'CHANGES_REQUESTED').length
      const pending = approvals.filter(a => a.status === 'PENDING').length
      
      const responseTimes = approvals
        .filter(a => a.responseTimeHours !== null)
        .map(a => a.responseTimeHours!)
      
      return {
        stage,
        stageLabel: stageLabels[stage] || stage,
        total,
        approved,
        changesRequested,
        pending,
        approvalRate: (approved + changesRequested) > 0 
          ? (approved / (approved + changesRequested)) * 100 
          : 0,
        avgResponseTimeHours: responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0
      }
    })
  )
  
  return results
}

export { router as dashboardRoutes }
