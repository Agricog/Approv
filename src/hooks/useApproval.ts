/**
 * useApproval Hook
 * Manages approval fetching and submission state
 */

import { useState, useCallback, useEffect } from 'react'
import { useApi } from './useApi'
import { captureApprovalError, addActionBreadcrumb } from '../utils/errorTracking'
import { trackApprovalViewed, trackApprovalSubmitted } from '../utils/analytics'
import { getDaysPending } from '../utils/formatters'
import type { ApprovalStatus } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export interface ApprovalData {
  id: string
  projectName: string
  clientName: string
  approvalStage: string
  deliverableUrl: string | null
  deliverableType: 'pdf' | 'image' | 'link' | null
  status: ApprovalStatus
  createdAt: string
  expiresAt: string
  respondedAt: string | null
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
  const api = useApi<{ approval: ApprovalData }>()
  const submitApi = useApi<{ success: boolean; action: string }>()

  // Reset state
  const reset = useCallback(() => {
    setState(initialState)
    api.reset()
    submitApi.reset()
  }, [api, submitApi])

  // Fetch approval by token
  const fetchApproval = useCallback(async (approvalToken: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await api.execute(`/api/approvals/${approvalToken}`)

      if (!result || !result.approval) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: api.error?.message || 'Approval not found'
        }))
        return
      }

      const approval = result.approval
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load approval'
      captureApprovalError(err, 'fetchApproval', undefined)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
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
      const result = await submitApi.execute(`/api/approvals/${token}`, {
        method: 'POST',
        body: {
          action,
          notes: notes || undefined
        }
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

      // Track successful submission
      trackApprovalSubmitted(state.approval.approvalStage, action, responseTimeHours)
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

  // Auto-fetch if token provided
  useEffect(() => {
    if (token) {
      fetchApproval(token)
    }
  }, [token, fetchApproval])

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
