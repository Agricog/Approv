/**
 * Approval Types
 * Core types for the approval workflow system
 */

export type ApprovalStatus = 'pending' | 'approved' | 'changes_requested' | 'expired'

export interface Approval {
  id: string
  token: string
  
  // Monday.com references
  mondayItemId: string
  mondayBoardId: string
  
  // Project info
  projectId: string
  projectName: string
  clientEmail: string
  clientName: string
  approvalStage: string
  deliverableUrl: string | null
  deliverableType: 'pdf' | 'image' | 'link' | null
  
  // Status
  status: ApprovalStatus
  createdAt: string
  expiresAt: string
  
  // Response data
  respondedAt: string | null
  clientIp: string | null
  clientNotes: string | null
  
  // Reminder tracking
  reminderCount: number
  lastReminderAt: string | null
}

export interface ApprovalCreateInput {
  mondayItemId: string
  mondayBoardId: string
  projectId: string
  projectName: string
  clientEmail: string
  clientName: string
  approvalStage: string
  deliverableUrl?: string
  deliverableType?: 'pdf' | 'image' | 'link'
  expiresInDays?: number
}

export interface ApprovalResponse {
  action: 'approve' | 'request_changes'
  notes?: string
}

export interface ApprovalWithAudit extends Approval {
  auditLog: ApprovalAuditEntry[]
}

export interface ApprovalAuditEntry {
  id: string
  approvalId: string
  action: string
  timestamp: string
  metadata: Record<string, unknown>
}

export interface ApprovalStats {
  total: number
  pending: number
  approved: number
  changesRequested: number
  expired: number
  avgResponseTimeHours: number
}

export interface ApprovalStageConfig {
  id: string
  name: string
  description: string
  order: number
  reminderDays: number[]
  expiresInDays: number
}

export const DEFAULT_APPROVAL_STAGES: ApprovalStageConfig[] = [
  {
    id: 'initial_drawings',
    name: 'Initial Drawings',
    description: 'Initial concept drawings for client review',
    order: 1,
    reminderDays: [3, 7, 10],
    expiresInDays: 30
  },
  {
    id: 'detailed_design',
    name: 'Detailed Design',
    description: 'Detailed design documents',
    order: 2,
    reminderDays: [3, 7, 10],
    expiresInDays: 30
  },
  {
    id: 'planning_pack',
    name: 'Planning Pack',
    description: 'Planning application documents',
    order: 3,
    reminderDays: [3, 7, 10],
    expiresInDays: 30
  },
  {
    id: 'final_approval',
    name: 'Final Approval',
    description: 'Final sign-off before construction',
    order: 4,
    reminderDays: [3, 7, 10],
    expiresInDays: 30
  }
]
