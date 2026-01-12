/**
 * API Types
 * Types for API requests, responses, and error handling
 */

// =============================================================================
// GENERIC API TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: never
}

export interface ApiError {
  success: false
  data?: never
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

// =============================================================================
// WEBHOOK TYPES (Monday.com)
// =============================================================================

export interface MondayWebhookPayload {
  event: {
    type: string
    triggerTime: string
    subscriptionId: number
    userId: number
    originalTriggerUuid: string | null
    boardId: number
    groupId: string
    pulseId: number
    pulseName: string
    columnId: string
    columnType: string
    columnTitle: string
    value: MondayColumnValue
    previousValue: MondayColumnValue | null
    changedAt: number
    isTopGroup: boolean
    triggerUuid: string
  }
  challenge?: string
}

export interface MondayColumnValue {
  label?: {
    index: number
    text: string
    style: {
      color: string
      border: string
      var_name: string
    }
  }
  post_id?: string | null
}

export interface MondayItem {
  id: string
  name: string
  column_values: MondayColumnValueItem[]
}

export interface MondayColumnValueItem {
  id: string
  text: string
  value: string | null
}

// =============================================================================
// APPROVAL API TYPES
// =============================================================================

export interface GetApprovalRequest {
  token: string
}

export interface GetApprovalResponse {
  approval: {
    id: string
    projectName: string
    clientName: string
    approvalStage: string
    deliverableUrl: string | null
    deliverableType: 'pdf' | 'image' | 'link' | null
    status: string
    createdAt: string
    expiresAt: string
  }
}

export interface SubmitApprovalRequest {
  token: string
  action: 'approve' | 'request_changes'
  notes?: string
}

export interface SubmitApprovalResponse {
  success: boolean
  action: 'approve' | 'request_changes'
  approvalId: string
  timestamp: string
}

// =============================================================================
// PROJECT API TYPES
// =============================================================================

export interface GetProjectsRequest extends PaginationParams {
  status?: string[]
  stage?: string[]
  clientId?: string
  search?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

export interface GetProjectsResponse extends PaginatedResponse<{
  id: string
  name: string
  reference: string
  clientName: string
  status: string
  currentStage: string
  pendingApprovals: number
  lastActivityAt: string
}> {}

// =============================================================================
// ANALYTICS API TYPES
// =============================================================================

export interface GetAnalyticsRequest {
  startDate: string
  endDate: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface GetAnalyticsResponse {
  summary: {
    totalApprovals: number
    approvedCount: number
    changesRequestedCount: number
    avgResponseTimeHours: number
    approvalRate: number
  }
  timeline: {
    date: string
    approved: number
    changesRequested: number
    pending: number
  }[]
  byStage: {
    stage: string
    total: number
    approved: number
    changesRequested: number
    avgResponseTimeHours: number
  }[]
  bottlenecks: {
    projectId: string
    projectName: string
    stage: string
    daysPending: number
    clientName: string
  }[]
}

// =============================================================================
// NOTIFICATION API TYPES
// =============================================================================

export interface SendReminderRequest {
  approvalId: string
  reminderType: 'first' | 'second' | 'escalation'
}

export interface SendReminderResponse {
  success: boolean
  sentVia: ('email' | 'sms')[]
  timestamp: string
}

export interface SendSlackNotificationRequest {
  channel?: string
  message: string
  approvalId?: string
  projectId?: string
}

export interface SendSlackNotificationResponse {
  success: boolean
  timestamp: string
}
