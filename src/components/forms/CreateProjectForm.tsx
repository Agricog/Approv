/**
 * CreateProjectForm Component
 * Enterprise-grade form for creating new projects
 * AUTAIMATE BUILD STANDARD v2 - OWASP 2024 Compliant
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, User, Hash, FileText, DollarSign, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { validateForm, PROJECT_VALIDATION } from '../../utils/formValidation'
import { captureError } from '../../utils/errorTracking'
import type { CreateProjectFormData, Project } from '../../types/formTypes'

// =============================================================================
// TYPES
// =============================================================================

interface CreateProjectFormProps {
  onSuccess?: (project: Project) => void
  onCancel?: () => void
}

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string | null
}

interface FormState {
  data: CreateProjectFormData
  errors: Record<string, string>
  isSubmitting: boolean
  submitError: string | null
  isSuccess: boolean
  createdProject: Project | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CreateProjectForm({ onSuccess, onCancel }: CreateProjectFormProps) {
  const navigate = useNavigate()
  const api = useApi<Project>()
  const clientsApi = useApi<{ items: Client[] }>()

  const [state, setState] = useState<FormState>({
    data: {
      name: '',
      reference: '',
      clientId: '',
      description: '',
      budget: undefined,
      startDate: '',
      targetCompletionDate: ''
    },
    errors: {},
    isSubmitting: false,
    submitError: null,
    isSuccess: false,
    createdProject: null
  })

  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  // Load clients on mount
  useState(() => {
    clientsApi.execute('/api/clients')
      .then(result => {
        if (result?.items) {
          setClients(result.items)
        }
      })
      .finally(() => {
        setLoadingClients(false)
      })
  })

  // Handle input change
  const handleInputChange = useCallback((field: keyof CreateProjectFormData, value: any) => {
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

    // Auto-generate reference from name
    if (field === 'name' && typeof value === 'string') {
      const autoRef = value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.substring(0, 3))
        .join('')
        .substring(0, 10)
      
      if (autoRef && !state.data.reference) {
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            reference: autoRef
          }
        }))
      }
    }
  }, [state.data.reference])

  // Validate and submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    const validation = validateForm(state.data as Record<string, any>, PROJECT_VALIDATION)
    
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
      const submitData: CreateProjectFormData = {
        name: validation.sanitized.name,
        reference: validation.sanitized.reference,
        clientId: validation.sanitized.clientId,
        description: validation.sanitized.description || undefined,
        budget: state.data.budget,
        startDate: state.data.startDate || undefined,
        targetCompletionDate: state.data.targetCompletionDate || undefined
      }

      // Submit to API
      const result = await api.execute('/api/projects', {
        method: 'POST',
        body: submitData
      })

      if (!result) {
        throw new Error(api.error?.message || 'Failed to create project')
      }

      // Track success
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'project_created', {
          project_id: result.id,
          has_description: !!submitData.description,
          has_budget: !!submitData.budget
        })
      }

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        createdProject: result
      }))

      // Call success callback
      if (onSuccess) {
        onSuccess(result)
      }

    } catch (err) {
      if (err instanceof Error) {
        captureError(err)
      }
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: err instanceof Error ? err.message : 'Failed to create project. Please try again.'
      }))
    }
  }, [state.data, api, onSuccess])

  // Success state
  if (state.isSuccess && state.createdProject) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Project Created!</h3>
            <p className="text-sm text-gray-600">{state.createdProject.name}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Reference:</span>
            <span className="text-sm font-mono text-gray-900">{state.createdProject.reference}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className="text-sm text-gray-900">{state.createdProject.status}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(`/projects/${state.createdProject!.id}`)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            View Project
          </button>
          <button
            onClick={() => navigate(`/projects/${state.createdProject!.id}/approvals/new`)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
          >
            Create First Approval
          </button>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Create New Project</h2>
        <p className="text-sm text-gray-600">Add a new project to start tracking approvals</p>
      </div>

      {/* Submit Error */}
      {state.submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">Failed to create project</h4>
            <p className="text-sm text-red-700 mt-1">{state.submitError}</p>
          </div>
        </div>
      )}

      {/* Project Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          <Briefcase className="w-4 h-4 inline mr-1" />
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={state.data.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="e.g., Residential Extension Project"
          maxLength={100}
          className={`w-full px-4 py-2 rounded-lg border ${
            state.errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-invalid={!!state.errors.name}
          aria-describedby={state.errors.name ? 'name-error' : undefined}
          required
        />
        {state.errors.name && (
          <p id="name-error" className="text-sm text-red-600 mt-1" role="alert">
            {state.errors.name}
          </p>
        )}
      </div>

      {/* Reference */}
      <div>
        <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
          <Hash className="w-4 h-4 inline mr-1" />
          Project Reference <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="reference"
          value={state.data.reference}
          onChange={(e) => handleInputChange('reference', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="e.g., RESEXT001"
          maxLength={50}
          className={`w-full px-4 py-2 rounded-lg border ${
            state.errors.reference ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono`}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Unique alphanumeric identifier</p>
        {state.errors.reference && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {state.errors.reference}
          </p>
        )}
      </div>

      {/* Client Selection */}
      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-1" />
          Client <span className="text-red-500">*</span>
        </label>
        {loadingClients ? (
          <div className="text-sm text-gray-500">Loading clients...</div>
        ) : (
          <select
            id="clientId"
            value={state.data.clientId}
            onChange={(e) => handleInputChange('clientId', e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              state.errors.clientId ? 'border-red-300 bg-red-50' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
                {client.company && ` (${client.company})`}
              </option>
            ))}
          </select>
        )}
        {state.errors.clientId && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {state.errors.clientId}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={state.data.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Brief project description..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          {state.data.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Budget */}
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Budget (Optional)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">£</span>
          <input
            type="number"
            id="budget"
            value={state.data.budget || ''}
            onChange={(e) => handleInputChange('budget', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0.00"
            min={0}
            step={0.01}
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Date (Optional)
          </label>
          <input
            type="date"
            id="startDate"
            value={state.data.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="targetCompletionDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Target Completion (Optional)
          </label>
          <input
            type="date"
            id="targetCompletionDate"
            value={state.data.targetCompletionDate}
            onChange={(e) => handleInputChange('targetCompletionDate', e.target.value)}
            min={state.data.startDate || undefined}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
            'Create Project'
          )}
        </button>
      </div>
    </form>
  )
}













