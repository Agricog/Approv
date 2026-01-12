/**
 * Analytics Types
 * Types for dashboard analytics and reporting
 */

// =============================================================================
// TIME PERIODS
// =============================================================================

export type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

export type GroupBy = 'day' | 'week' | 'month'

// =============================================================================
// DASHBOARD METRICS
// =============================================================================

export interface DashboardMetrics {
  // Overview counts
  totalProjects: number
  activeProjects: number
  pendingApprovals: number
  
  // Approval stats
  approvalStats: {
    total: number
    approved: number
    changesRequested: number
    expired: number
    avgResponseTimeHours: number
    approvalRate: number
  }
  
  // Trend comparison (vs previous period)
  trends: {
    projectsChange: number
    approvalsChange: number
    responseTimeChange: number
  }
  
  // Last updated
  lastUpdatedAt: string
}

export interface MetricCard {
  id: string
  label: string
  value: number | string
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  format?: 'number' | 'percentage' | 'duration' | 'currency'
}

// =============================================================================
// CHARTS DATA
// =============================================================================

export interface TimelineDataPoint {
  date: string
  approved: number
  changesRequested: number
  pending: number
  total: number
}

export interface StageBreakdown {
  stage: string
  stageLabel: string
  total: number
  approved: number
  changesRequested: number
  pending: number
  avgResponseTimeHours: number
  approvalRate: number
}

export interface ResponseTimeDistribution {
  range: string
  count: number
  percentage: number
}

export interface ClientActivityData {
  clientId: string
  clientName: string
  projectCount: number
  pendingApprovals: number
  avgResponseTimeHours: number
  lastActivityAt: string
}

// =============================================================================
// BOTTLENECK ANALYSIS
// =============================================================================

export interface Bottleneck {
  id: string
  type: 'approval' | 'project'
  
  // Approval specific
  approvalId?: string
  
  // Project info
  projectId: string
  projectName: string
  projectReference: string
  
  // Client info
  clientId: string
  clientName: string
  clientEmail: string
  
  // Bottleneck details
  stage: string
  stageLabel: string
  daysPending: number
  remindersSent: number
  lastReminderAt: string | null
  
  // Urgency
  urgency: 'low' | 'medium' | 'high' | 'critical'
  
  createdAt: string
}

export interface BottleneckFilters {
  minDaysPending?: number
  urgency?: ('low' | 'medium' | 'high' | 'critical')[]
  stage?: string[]
  clientId?: string
}

export function calculateUrgency(daysPending: number): Bottleneck['urgency'] {
  if (daysPending >= 14) return 'critical'
  if (daysPending >= 10) return 'high'
  if (daysPending >= 7) return 'medium'
  return 'low'
}

// =============================================================================
// TEAM PERFORMANCE
// =============================================================================

export interface TeamMemberPerformance {
  memberId: string
  memberName: string
  memberEmail: string
  
  // Projects
  activeProjects: number
  completedProjects: number
  
  // Approvals
  approvalsManaged: number
  avgTurnaroundHours: number
  
  // Bottlenecks
  currentBottlenecks: number
}

// =============================================================================
// EXPORT/REPORTING
// =============================================================================

export interface ReportConfig {
  title: string
  dateRange: DateRange
  includeMetrics: boolean
  includeTimeline: boolean
  includeStageBreakdown: boolean
  includeBottlenecks: boolean
  includeClientActivity: boolean
  format: 'pdf' | 'csv' | 'xlsx'
}

export interface ExportData {
  generatedAt: string
  dateRange: DateRange
  metrics?: DashboardMetrics
  timeline?: TimelineDataPoint[]
  stageBreakdown?: StageBreakdown[]
  bottlenecks?: Bottleneck[]
  clientActivity?: ClientActivityData[]
}
