/**
 * CreateClientForm Component
 * Enterprise-grade form for creating new clients
 * AUTAIMATE BUILD STANDARD v2 - OWASP 2024 Compliant
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle, Mail, Phone, Building2, MapPin, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import * as Sentry from '@sentry/react'
import { useApi } from '../../hooks/useApi'

// =============================================================================
// TYPES
// =============================================================================

interface CreateClientFormProps {
  onSuccess?: (client: Client) => void
  onCancel?: () => void
}

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  createdAt: string
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
}

interface FormState {
  data: FormData
  errors: Record<string, string>
  isSubmitting: boolean
  submitError: string | null
  isSuccess: boolean
  createdClient: Client | null
}

// =============================================================================
// VALIDATION
// =============================================================================

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePhone = (phone: string): boolean => {
  if (!phone) return true // Optional
  const phoneRegex = /^[\d\s\-+()]{10,20}$/
  return phoneRegex.test(phone)
}

const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CreateClientForm({ onSuccess, onCancel }: CreateClientFormProps) {
  const navigate = useNavigate()
  const api = useApi<Client>()

  const [state, setState] = useState<FormState>({
    data: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: ''
    },
    errors: {},
    isSubmitting: false,
    submitError: null,
    isSuccess: false,
    createdClient: null
  })

  // Handle input change
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
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

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!state.data.firstName.trim()) {
      errors.firstName = 'First name is required'
    }

    if (!state.data.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }

    if (!state.data.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(state.data.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (state.data.phone && !validatePhone(state.data.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    setState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true, submitError: null }))

    try {
      // Prepare sanitized data
      const submitData = {
        firstName: sanitizeInput(state.data.firstName),
        lastName: sanitizeInput(state.data.lastName),
        email: sanitizeInput(state.data.email).toLowerCase(),
        phone: state.data.phone ? sanitizeInput(state.data.phone) : null,
        company: state.data.company ? sanitizeInput(state.data.company) : null,
        address: state.data.address ? sanitizeInput(state.data.address) : null,
        notes: state.data.notes ? sanitizeInput(state.data.notes) : null
      }

      // Submit to API
      const result = await api.execute('/api/clients', {
        method: 'POST',
        body: submitData
      })

      if (!result) {
        throw new Error(api.error?.message || 'Failed to create client')
      }

      // Track success
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'client_created', {
          has_company: !!submitData.company,
          has_phone: !!submitData.phone
        })
      }

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        createdClient: result
      }))

      // Call success callback
      if (onSuccess) {
        onSuccess(result)
      }

    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'CreateClientForm', action: 'submit' }
      })

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: err instanceof Error ? err.message : 'Failed to create client. Please try again.'
      }))
    }
  }, [state.data, api, onSuccess])

  // Success state
  if (state.isSuccess && state.createdClient) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Client Created!</h3>
            <p className="text-sm text-gray-600">
              {state.createdClient.firstName} {state.createdClient.lastName}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Email:</span>
            <span className="text-sm text-gray-900">{state.createdClient.email}</span>
          </div>
          {state.createdClient.company && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Company:</span>
              <span className="text-sm text-gray-900">{state.createdClient.company}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(`/dashboard/clients/${state.createdClient!.id}`)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            View Client
          </button>
          <button
            onClick={() => navigate('/dashboard/projects/new')}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
          >
            Create Project
          </button>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Add New Client</h2>
        <p className="text-sm text-gray-600">Enter the client's contact information</p>
      </div>

      {/* Submit Error */}
      {state.submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">Failed to create client</h4>
            <p className="text-sm text-red-700 mt-1">{state.submitError}</p>
          </div>
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            <UserCircle className="w-4 h-4 inline mr-1" />
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={state.data.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="John"
            maxLength={50}
            className={`w-full px-4 py-2 rounded-lg border ${
              state.errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
            required
          />
          {state.errors.firstName && (
            <p className="text-sm text-red-600 mt-1">{state.errors.firstName}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={state.data.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Smith"
            maxLength={50}
            className={`w-full px-4 py-2 rounded-lg border ${
              state.errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
            required
          />
          {state.errors.lastName && (
            <p className="text-sm text-red-600 mt-1">{state.errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          <Mail className="w-4 h-4 inline mr-1" />
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={state.data.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="john.smith@example.com"
          maxLength={100}
          className={`w-full px-4 py-2 rounded-lg border ${
            state.errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
          required
        />
        {state.errors.email && (
          <p className="text-sm text-red-600 mt-1">{state.errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          <Phone className="w-4 h-4 inline mr-1" />
          Phone Number (Optional)
        </label>
        <input
          type="tel"
          id="phone"
          value={state.data.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="+44 7700 900000"
          maxLength={20}
          className={`w-full px-4 py-2 rounded-lg border ${
            state.errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
        />
        {state.errors.phone && (
          <p className="text-sm text-red-600 mt-1">{state.errors.phone}</p>
        )}
      </div>

      {/* Company */}
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Company (Optional)
        </label>
        <input
          type="text"
          id="company"
          value={state.data.company}
          onChange={(e) => handleInputChange('company', e.target.value)}
          placeholder="Acme Corporation"
          maxLength={100}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Address (Optional)
        </label>
        <textarea
          id="address"
          value={state.data.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="123 Main Street, London, UK"
          rows={2}
          maxLength={200}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={state.data.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes about this client..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          {state.data.notes.length}/500 characters
        </p>
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
          className="flex-1 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {state.isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Client'
          )}
        </button>
      </div>
    </form>
  )
}
