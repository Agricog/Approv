/**
 * Form Types
 * TypeScript interfaces for form data
 */

// =============================================================================
// PROJECT TYPES
// =============================================================================

export interface CreateProjectFormData {
  name: string
  reference: string
  clientId: string
  description?: string
  budget?: number
  startDate?: string
  targetCompletionDate?: string
  [key: string]: any // Add index signature for TypeScript strict mode
}

export interface Project {
  id: string
  name: string
  reference: string
  clientId: string
  organizationId: string
  description: string | null
  budget: number | null
  status: ProjectStatus
  startDate: string | null
  targetCompletionDate: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

// =============================================================================
// APPROVAL TYPES
// =============================================================================

export interface CreateApprovalFormData {
  projectId: string
  stage: string
  stageLabel: string
  deliverableUrl?: string
  deliverableName?: string
  deliverableType?: 'pdf' | 'image' | 'link'
  expiryDays?: number
  [key: string]: any // Add index signature for TypeScript strict mode
}

export interface ApprovalCreatedResponse {
  id: string
  token: string
  approvalUrl: string
  expiresAt: string
}

// =============================================================================
// COMMON TYPES
// =============================================================================

export interface FormError {
  field: string
  message: string
}

export interface FormState<T> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  submitError: string | null
  isSuccess: boolean
}
