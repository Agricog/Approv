/**
 * useApproval Hook
 * Manages approval fetching and submission state
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useApi } from './useApi'
import { captureApprovalError, addActionBreadcrumb } from '../utils/errorTracking'
import { trackApprovalViewed, trackApprovalSubmitted } from '../utils/analytics'
import { getDaysPending } from '../utils/formatters'
import type { ApprovalStatus } from '../types'

// =============================================================================
// TYPES
// =============================================================================

interface ApiApprovalResponse {
  id: string
  projectName: string
  projectReference: string
  clientName: string
  clientCompany: string | null
  stage: string
  stageLabel: string
  status: string // Uppercase from API: PENDING, APPROVED, CHANGES_REQUESTED
  deliverableUrl: string | null
  deliverableType: 'pdf' | 'image' | 'link' | null
  deliverableName: string | null
  createdAt: string
  expiresAt: string
  respondedAt: string | null
  responseNotes: string | null
  organization: {
    name: string
    logo: string | null
    primaryColor: string
  }
}

export interface ApprovalData {
  id: string
  projectName: string
  projectReference: string
  clientName: string
  clientCompany: string | null
  stage: string
  stageLabel: string
  approvalStage: string // Mapped from stageLabel for component compatibility
  status: ApprovalStatus
  deliverableUrl: string | null
  deliverableType: 'pdf' | 'image' | 'link' | null
  deliverableName: string | null
  createdAt: string
  expiresAt: string
  respondedAt: string | null
  responseNotes: string | null
  organization: {
    name: string
    logo: string | null
    primaryColor: string
  }
}

export interface ApprovalState {
  approval: ApprovalData | null
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  submitError: string | null
  isExpired: boolean
  isAlreadyResponded: boolean
}

export interface UseApprovalReturn extends ApprovalState {
  fetchApproval: (token: string) => Promise<void>
  submitApproval: (action: 'approve' | 'request_changes', notes?: string) => Promise<boolean>
  reset: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds
const NON_RETRYABLE_ERRORS = ['NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED', 'HTTP_404', 'HTTP_403', 'HTTP_401', 'HTTP_507']

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: ApprovalState = {
  approval: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  submitError: null,
  isExpired: false,
  isAlreadyResponded: false
}

// =============================================================================
// HOOK
// =============================================================================

export function useApproval(token?: string): UseApprovalReturn {
  const [state, setState] = useState<ApprovalState>(initialState)
  const api = useApi<ApiApprovalResponse>()
  const submitApi = useApi<{ success: boolean; action: string }>()
  
  // Track retry attempts
  const retryCountRef = useRef(0)
  const hasAttemptedFetchRef = useRef(false)

  // Reset state
  const reset = useCallback(() => {
    setState(initialState)
    api.reset()
    submitApi.reset()
    retryCountRef.current = 0
    hasAttemptedFetchRef.current = false
  }, [api, submitApi])

  // Get CSRF token from cookie
  const getCsrfTokenFromCookie = useCallback((): string | null => {
    const cookies = document.cookie.split('; ')
    const csrfCookie = cookies.find(row => 
      row.startsWith('XSRF-TOKEN=') || 
      row.startsWith('csrf-token=') ||
      row.startsWith('_csrf=')
    )
    return csrfCookie ? csrfCookie.split('=')[1] : null
  }, [])

  // Fetch approval by token
  const fetchApproval = useCallback(async (approvalToken: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await api.execute(`/api/approvals/${approvalToken}`)

      if (!result) {
        const errorCode = api.error?.code
        const errorMessage = api.error?.message || 'Approval not found'
        
        // Check if error is non-retryable
        if (errorCode && NON_RETRYABLE_ERRORS.includes(errorCode)) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage
          }))
          retryCountRef.current = 0 // Reset for future attempts
          return
        }

        // Check if we've hit retry limit
        if (retryCountRef.current >= MAX_RETRIES) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Unable to load approval after multiple attempts. Please refresh the page.'
          }))
          retryCountRef.current = 0 // Reset for future attempts
          return
        }

        // Retry on network/server errors
        retryCountRef.current++
        setTimeout(() => fetchApproval(approvalToken), RETRY_DELAY)
        return
      }

      // Success - reset retry counter
      retryCountRef.current = 0

      // Map API response to component format
      const approval: ApprovalData = {
        ...result,
        approvalStage: result.stageLabel || result.stage,
        clientName: result.clientName,
        status: result.status.toLowerCase() as ApprovalStatus
      }
      
      const now = new Date()
      const expiresAt = new Date(approval.expiresAt)
      const isExpired = now > expiresAt
      const isAlreadyResponded = approval.status !== 'pending'

      setState({
        approval,
        isLoading: false,
        isSubmitting: false,
        error: null,
        submitError: null,
        isExpired,
        isAlreadyResponded
      })

      // Track view if pending
      if (!isExpired && !isAlreadyResponded) {
        trackApprovalViewed(approval.approvalStage, !!approval.deliverableUrl)
        addActionBreadcrumb('Approval viewed', 'approval', {
          stage: approval.approvalStage,
          hasDeliverable: !!approval.deliverableUrl
        })
      }

    } catch (err) {
      captureApprovalError(err, 'fetchApproval', undefined)
      
      // Check retry limit for caught errors
      if (retryCountRef.current >= MAX_RETRIES) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Unable to load approval. Please refresh the page.'
        }))
        retryCountRef.current = 0
        return
      }

      // Retry
      retryCountRef.current++
      setTimeout(() => fetchApproval(approvalToken), RETRY_DELAY)
    }
  }, [api])

  // Submit approval response
  const submitApproval = useCallback(async (
    action: 'approve' | 'request_changes',
    notes?: string
  ): Promise<boolean> => {
    if (!state.approval || !token) {
      setState(prev => ({
        ...prev,
        submitError: 'No approval loaded'
      }))
      return false
    }

    if (state.isExpired) {
      setState(prev => ({
        ...prev,
        submitError: 'This approval has expired'
      }))
      return false
    }

    if (state.isAlreadyResponded) {
      setState(prev => ({
        ...prev,
        submitError: 'This approval has already been responded to'
      }))
      return false
    }

    setState(prev => ({ ...prev, isSubmitting: true, submitError: null }))

    try {
      // Get CSRF token from cookie
      const csrfToken = getCsrfTokenFromCookie()
      
      // Build headers with CSRF token
      const headers: Record<string, string> = {}
      if (csrfToken) {
        // Try common CSRF header names
        headers['X-CSRF-Token'] = csrfToken
        headers['X-XSRF-TOKEN'] = csrfToken
      }

      const result = await submitApi.execute(`/api/approvals/${token}/respond`, {
        method: 'POST',
        body: {
          action,
          notes: notes || undefined
        },
        headers,
        skipAuth: true
      })

      if (!result || !result.success) {
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          submitError: submitApi.error?.message || 'Failed to submit approval'
        }))
        return false
      }

      // Calculate response time for analytics
      const responseTimeHours = getDaysPending(state.approval.createdAt) * 24

      // Track successful submission (map action to analytics type)
      const analyticsAction = action === 'approve' ? 'approved' : 'changes_requested'
      trackApprovalSubmitted(state.approval.approvalStage, analyticsAction, responseTimeHours)
      addActionBreadcrumb(`Approval ${action}`, 'approval', {
        stage: state.approval.approvalStage,
        responseTimeHours
      })

      // Update local state
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isAlreadyResponded: true,
        approval: prev.approval ? {
          ...prev.approval,
          status: action === 'approve' ? 'approved' : 'changes_requested',
          respondedAt: new Date().toISOString()
        } : null
      }))

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit approval'
      captureApprovalError(err, 'submitApproval', state.approval.id)
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: errorMessage
      }))
      return false
    }
  }, [state.approval, state.isExpired, state.isAlreadyResponded, token, submitApi])

  // Auto-fetch if token provided (FIXED: removed fetchApproval from deps)
  useEffect(() => {
    if (token && !hasAttemptedFetchRef.current) {
      hasAttemptedFetchRef.current = true
      fetchApproval(token)
    }
  }, [token]) // ✅ Only re-run when token changes

  return {
    ...state,
    fetchApproval,
    submitApproval,
    reset
  }
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook to get approval status display info
 */
export function useApprovalStatus(status: ApprovalStatus | undefined) {
  if (!status) {
    return {
      label: 'Unknown',
      color: 'gray',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-800',
      borderClass: 'border-gray-200'
    }
  }

  const statusConfig: Record<ApprovalStatus, {
    label: string
    color: string
    bgClass: string
    textClass: string
    borderClass: string
  }> = {
    pending: {
      label: 'Awaiting Approval',
      color: 'amber',
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-200'
    },
    approved: {
      label: 'Approved',
      color: 'green',
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
      borderClass: 'border-green-200'
    },
    changes_requested: {
      label: 'Changes Requested',
      color: 'red',
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
      borderClass: 'border-red-200'
    },
    expired: {
      label: 'Expired',
      color: 'gray',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-800',
      borderClass: 'border-gray-200'
    }
  }

  return statusConfig[status]
}
