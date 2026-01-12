/**
 * Project Types
 * Types for project management and client portal
 */

export type ProjectStatus = 
  | 'active' 
  | 'on_hold' 
  | 'completed' 
  | 'cancelled'

export type ProjectStage =
  | 'briefing'
  | 'initial_design'
  | 'detailed_design'
  | 'planning'
  | 'construction'
  | 'completion'

export interface Project {
  id: string
  mondayItemId: string
  mondayBoardId: string
  
  // Basic info
  name: string
  reference: string
  description: string | null
  address: string | null
  
  // Client info
  clientId: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  
  // Status
  status: ProjectStatus
  currentStage: ProjectStage
  
  // Dates
  startDate: string
  targetCompletionDate: string | null
  actualCompletionDate: string | null
  createdAt: string
  updatedAt: string
  
  // Team
  projectManagerId: string | null
  projectManagerName: string | null
  
  // Metadata
  metadata: Record<string, unknown>
}

export interface ProjectWithApprovals extends Project {
  approvals: ProjectApprovalSummary[]
  pendingApprovalsCount: number
  completedApprovalsCount: number
}

export interface ProjectApprovalSummary {
  id: string
  stage: string
  status: 'pending' | 'approved' | 'changes_requested' | 'expired'
  createdAt: string
  respondedAt: string | null
}

export interface ProjectListItem {
  id: string
  name: string
  reference: string
  clientName: string
  status: ProjectStatus
  currentStage: ProjectStage
  pendingApprovals: number
  lastActivityAt: string
}

export interface ProjectCreateInput {
  mondayItemId: string
  mondayBoardId: string
  name: string
  reference: string
  description?: string
  address?: string
  clientId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  startDate: string
  targetCompletionDate?: string
  projectManagerId?: string
  projectManagerName?: string
}

export interface ProjectUpdateInput {
  name?: string
  description?: string
  address?: string
  status?: ProjectStatus
  currentStage?: ProjectStage
  targetCompletionDate?: string
  projectManagerId?: string
  projectManagerName?: string
}

export interface ProjectFilter {
  status?: ProjectStatus[]
  stage?: ProjectStage[]
  clientId?: string
  projectManagerId?: string
  hasPendingApprovals?: boolean
  search?: string
}

export interface ProjectSortOptions {
  field: 'name' | 'createdAt' | 'updatedAt' | 'targetCompletionDate' | 'clientName'
  direction: 'asc' | 'desc'
}

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  briefing: 'Briefing',
  initial_design: 'Initial Design',
  detailed_design: 'Detailed Design',
  planning: 'Planning',
  construction: 'Construction',
  completion: 'Completion'
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled'
}
