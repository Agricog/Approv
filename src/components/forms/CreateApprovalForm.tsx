/**
 * CreateApprovalForm Component
 * Enterprise-grade form for creating approval requests
 * AUTAIMATE BUILD STANDARD v2 - OWASP 2024 Compliant
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Link as LinkIcon, Image, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import * as Sentry from '@sentry/react'
import { useApi } from '../../hooks/useApi'
import { validateForm, APPROVAL_VALIDATION, sanitizeUrl } from '../../utils/formValidation'
import type { CreateApprovalFormData, ApprovalCreatedResponse } from '../../types/formTypes'

// =============================================================================
// TYPES
// =============================================================================

interface CreateApprovalFormProps {
  projectId: string
  projectName: string
  onSuccess?: (approval: ApprovalCreatedResponse) => void
  onCancel?: () => void
}

interface FormState {
  data: CreateApprovalFormData
  errors: Record<string, string>
  isSubmitting: boolean
  submitError: string | null
  isSuccess: boolean
  createdApproval: ApprovalCreatedResponse | null
}

// =============================================================================
// CONSTANTS
// =============================================================================

const APPROVAL_STAGES = [
  { value: 'INITIAL_DRAWINGS', label: 'Initial Concept Drawings' },
  { value: 'DETAILED_DESIGN', label: 'Detailed Design' },
  { value: 'PLANNING_PACK', label: 'Planning Pack' },
  { value: 'FINAL_APPROVAL', label: 'Final Approval' },
  { value: 'CUSTOM', label: 'Custom Stage' }
] as const

const DELIVERABLE_TYPES = [
  { value: 'PDF', label: 'PDF Document', icon: FileText },
  { value: 'IMAGE', label: 'Image/Render', icon: Image },
  { value: 'LINK', label: 'External Link', icon: LinkIcon }
] as const

// =============================================================================
// COMPONENT
// =============================================================================

export default function CreateApprovalForm({
  projectId,
  projectName,
  onSuccess,
  onCancel
}: CreateApprovalFormProps) {
  const navigate = useNavigate()
  const api = useApi<ApprovalCreatedResponse>()

  const [state, setState] = useState<FormState>({
    data: {
      projectId,
      stage: '',
      stageLabel: '',
      deliverableUrl: '',
      deliverableName: '',
      deliverableType: undefined,
      expiryDays: 14
    },
    errors: {},
    isSubmitting: false,
    submitError: null,
    isSuccess: false,
    createdApproval: null
  })

  const [showCustomStage, setShowCustomStage] = useState(false)

  // Handle stage selection
  const handleStageChange = useCallback((value: string) => {
    const selectedStage = APPROVAL_STAGES.find(s => s.value === value)
    
    if (value === 'CUSTOM') {
      setShowCustomStage(true)
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          stage: '',
          stageLabel: ''
        },
        errors: {
          ...prev.errors,
          stage: '',
          stageLabel: ''
        }
      }))
    } else {
      setShowCustomStage(false)
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          stage: value,
          stageLabel: selectedStage?.label || ''
        },
        errors: {
          ...prev.errors,
          stage: '',
          stageLabel: ''
        }
      }))
    }
  }, [])

  // Handle input change
  const handleInputChange = useCallback((field: keyof CreateApprovalFormData, value: any) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      },
      errors: {
        ...prev.errors,
        [field]: ''
      },
      submitError: null
    }))
  }, [])

  // Validate and submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    const validation = validateForm(state.data, APPROVAL_VALIDATION)
    
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        errors: validation.errors
      }))
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true, submitError: null }))

    try {
      // Prepare sanitized data
      const submitData: CreateApprovalFormData = {
        projectId: state.data.projectId,
        stage: validation.sanitized.stage,
        stageLabel: validation.sanitized.stageLabel,
        expiryDays: state.data.expiryDays || 14
      }

      // Add deliverable info if provided
      if (state.data.deliverableUrl) {
        const sanitizedUrl = sanitizeUrl(state.data.deliverableUrl)
        if (sanitizedUrl) {
          submitData.deliverableUrl = sanitizedUrl
          submitData.deliverableName = validation.sanitized.deliverableName || 'Deliverable'
          submitData.deliverableType = state.data.deliverableType || 'LINK'
        }
      }

      // Submit to API
      const result = await api.execute('/api/approvals', {
        method: 'POST',
        body: submitData
      })

      if (!result) {
        throw new Error(api.error?.message || 'Failed to create approval')
      }

      // Track success
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'approval_created', {
          project_id: projectId,
          stage: submitData.stage,
          has_deliverable: !!submitData.deliverableUrl
        })
      }

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        createdApproval: result
      }))

      // Call success callback
      if (onSuccess) {
        onSuccess(result)
      }

    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'CreateApprovalForm', action: 'submit' }
      })

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: err instanceof Error ? err.message : 'Failed to create approval. Please try again.'
      }))
    }
  }, [state.data, api, projectId, onSuccess])

  // Success state
  if (state.isSuccess && state.createdApproval) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Approval Created!</h3>
            <p className="text-sm text-gray-600">Client will receive approval request via email</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Approval URL:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(state.createdApproval!.approvalUrl)
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'approval_url_copied', {
                    approval_id: state.createdApproval!.id
                  })
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Copy Link
            </button>
          </div>
          <div className="bg-white rounded border border-gray-200 p-2">
            <code className="text-xs text-gray-600 break-all">
              {state.createdApproval.approvalUrl}
            </code>
          </div>
          <p className="text-xs text-gray-500">
            Expires: {new Date(state.createdApproval.expiresAt).toLocaleDateString()}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            View Project
          </button>
          <button
            onClick={() => {
              setState({
                data: {
                  projectId,
                  stage: '',
                  stageLabel: '',
                  deliverableUrl: '',
                  deliverableName: '',
                  deliverableType: undefined,
                  expiryDays: 14
                },
                errors: {},
                isSubmitting: false,
                submitError: null,
                isSuccess: false,
                createdApproval: null
              })
              setShowCustomStage(false)
            }}
            className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Create Approval Request</h2>
        <p className="text-sm text-gray-600">For: {projectName}</p>
      </div>

      {/* Submit Error */}
      {state.submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">Failed to create approval</h4>
            <p className="text-sm text-red-700 mt-1">{state.submitError}</p>
          </div>
        </div>
      )}

      {/* Stage Selection */}
      <div>
        <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-2">
          Approval Stage <span className="text-red-500">*</span>
        </label>
        <select
          id="stage"
          value={showCustomStage ? 'CUSTOM' : state.data.stage}
          onChange={(e) => handleStageChange(e.target.value)}
          className={`w-full px-4 py-2 rounded-lg border ${
            state.errors.stage ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-invalid={!!state.errors.stage}
          aria-describedby={state.errors.stage ? 'stage-error' : undefined}
          required
        >
          <option value="">Select a stage...</option>
          {APPROVAL_STAGES.map(stage => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
        {state.errors.stage && (
          <p id="stage-error" className="text-sm text-red-600 mt-1" role="alert">
            {state.errors.stage}
          </p>
        )}
      </div>

      {/* Custom Stage Inputs */}
      {showCustomStage && (
        <>
          <div>
            <label htmlFor="stageCode" className="block text-sm font-medium text-gray-700 mb-2">
              Stage Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stageCode"
              value={state.data.stage}
              onChange={(e) => handleInputChange('stage', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g., CUSTOM_STAGE"
              maxLength={50}
              className={`w-full px-4 py-2 rounded-lg border ${
                state.errors.stage ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Use uppercase letters, numbers, and underscores only</p>
          </div>

          <div>
            <label htmlFor="stageLabel" className="block text-sm font-medium text-gray-700 mb-2">
              Stage Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="stageLabel"
              value={state.data.stageLabel}
              onChange={(e) => handleInputChange('stageLabel', e.target.value)}
              placeholder="e.g., Custom Design Review"
              maxLength={100}
              className={`w-full px-4 py-2 rounded-lg border ${
                state.errors.stageLabel ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              required
            />
          </div>
        </>
      )}

      {/* Deliverable Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deliverable Type (Optional)
        </label>
        <div className="grid grid-cols-3 gap-3">
          {DELIVERABLE_TYPES.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleInputChange('deliverableType', type.value)}
                className={`p-3 rounded-lg border-2 transition ${
                  state.data.deliverableType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1 ${
                  state.data.deliverableType === type.value ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className="text-xs font-medium text-gray-700">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Deliverable URL */}
      {state.data.deliverableType && (
        <>
          <div>
            <label htmlFor="deliverableUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Deliverable URL
            </label>
            <input
              type="url"
              id="deliverableUrl"
              value={state.data.deliverableUrl}
              onChange={(e) => handleInputChange('deliverableUrl', e.target.value)}
              placeholder="https://example.com/document.pdf"
              maxLength={500}
              className={`w-full px-4 py-2 rounded-lg border ${
                state.errors.deliverableUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {state.errors.deliverableUrl && (
              <p className="text-sm text-red-600 mt-1" role="alert">
                {state.errors.deliverableUrl}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="deliverableName" className="block text-sm font-medium text-gray-700 mb-2">
              Deliverable Name
            </label>
            <input
              type="text"
              id="deliverableName"
              value={state.data.deliverableName}
              onChange={(e) => handleInputChange('deliverableName', e.target.value)}
              placeholder="e.g., Initial Concept Drawings"
              maxLength={100}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </>
      )}

      {/* Expiry Days */}
      <div>
        <label htmlFor="expiryDays" className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Approval Expires In (Days)
        </label>
        <input
          type="number"
          id="expiryDays"
          value={state.data.expiryDays}
          onChange={(e) => handleInputChange('expiryDays', parseInt(e.target.value) || 14)}
          min={1}
          max={90}
          className={`w-full px-4 py-2 rounded-lg border ${
            state.errors.expiryDays ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
        <p className="text-xs text-gray-500 mt-1">Client will have {state.data.expiryDays} days to respond</p>
        {state.errors.expiryDays && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {state.errors.expiryDays}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={state.isSubmitting}
            className="flex-1 px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={state.isSubmitting}
          className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {state.isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Approval Request'
          )}
        </button>
      </div>
    </form>
  )
}













