/**
 * CreateApprovalForm Component
 * Enterprise-grade form for creating approval requests with file upload
 * AUTAIMATE BUILD STANDARD v2 - OWASP 2024 Compliant
 */
import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Link as LinkIcon, 
  Image, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Upload,
  X,
  File
} from 'lucide-react'
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

interface UploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
  uploadedKey: string | null
  uploadedUrl: string | null
}

interface PresignResponse {
  key: string
  uploadUrl: string
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
  { value: 'pdf', label: 'PDF Document', icon: FileText },
  { value: 'image', label: 'Image/Render', icon: Image },
  { value: 'link', label: 'External Link', icon: LinkIcon }
] as const

const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp']
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
  const presignApi = useApi<PresignResponse>()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    uploadedKey: null,
    uploadedUrl: null
  })

  const [showCustomStage, setShowCustomStage] = useState(false)
  const [useFileUpload, setUseFileUpload] = useState(true)

  // Handle stage selection
  const handleStageChange = useCallback((value: string) => {
    const selectedStage = APPROVAL_STAGES.find(s => s.value === value)
    
    if (value === 'CUSTOM') {
      setShowCustomStage(true)
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          stage: 'CUSTOM_STAGE', // Provide default valid value
          stageLabel: ''
        },
        errors: {}, // Clear all errors when switching to custom
        submitError: null
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
        errors: {}, // Clear all errors when selecting preset
        submitError: null
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

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = state.data.deliverableType 
      ? ALLOWED_FILE_TYPES[state.data.deliverableType] || []
      : [...ALLOWED_FILE_TYPES.pdf, ...ALLOWED_FILE_TYPES.image]

    if (!allowedTypes.includes(file.type)) {
      setUploadState(prev => ({
        ...prev,
        error: 'File type not allowed. Please upload a PDF or image file.'
      }))
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadState(prev => ({
        ...prev,
        error: 'File too large. Maximum size is 10MB.'
      }))
      return
    }

    setUploadState({
      file,
      uploading: true,
      progress: 0,
      error: null,
      uploadedKey: null,
      uploadedUrl: null
    })

    try {
      // Get presigned URL
      const presignResult = await presignApi.execute('/api/uploads/presign', {
        method: 'POST',
        body: {
          filename: file.name,
          contentType: file.type,
          type: 'deliverable',
          projectId
        }
      })

      if (!presignResult) {
        throw new Error(presignApi.error?.message || 'Failed to get upload URL')
      }

      setUploadState(prev => ({ ...prev, progress: 30 }))

      // Upload file to R2
      const uploadResponse = await fetch(presignResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      setUploadState(prev => ({ ...prev, progress: 80 }))

      // Confirm upload and get download URL
      const confirmResult = await api.execute('/api/uploads/confirm', {
        method: 'POST',
        body: { key: presignResult.key }
      }) as any

      if (!confirmResult?.downloadUrl) {
        throw new Error('Failed to confirm upload')
      }

      setUploadState({
        file,
        uploading: false,
        progress: 100,
        error: null,
        uploadedKey: presignResult.key,
        uploadedUrl: confirmResult.downloadUrl
      })

    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'CreateApprovalForm', action: 'fileUpload' }
      })
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed'
      }))
    }
  }, [state.data.deliverableType, projectId, presignApi, api])

  // Remove uploaded file
  const handleRemoveFile = useCallback(() => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      uploadedKey: null,
      uploadedUrl: null
    })
    handleInputChange('deliverableUrl', '')
    handleInputChange('deliverableName', '')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleInputChange])

  // Validate and submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // For custom stage, ensure both fields are filled
    if (showCustomStage) {
      const customErrors: Record<string, string> = {}
      if (!state.data.stage || state.data.stage.length < 2) {
        customErrors.stage = 'Stage code is required (min 2 characters)'
      }
      if (!state.data.stageLabel || state.data.stageLabel.length < 2) {
        customErrors.stageLabel = 'Stage display name is required (min 2 characters)'
      }
      if (Object.keys(customErrors).length > 0) {
        setState(prev => ({
          ...prev,
          errors: customErrors
        }))
        return
      }
    }

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
      if (uploadState.uploadedKey) {
        // For uploaded files, store the R2 key (prefixed with r2:)
        submitData.deliverableUrl = 'r2:' + uploadState.uploadedKey
        submitData.deliverableName = uploadState.file?.name || 'Deliverable'
        submitData.deliverableType = (state.data.deliverableType || 'pdf').toUpperCase() as any
      } else if (state.data.deliverableUrl) {
        // For external links, store the URL directly
        const sanitizedUrl = sanitizeUrl(state.data.deliverableUrl)
        if (sanitizedUrl) {
          submitData.deliverableUrl = sanitizedUrl
          submitData.deliverableName = validation.sanitized.deliverableName || 'Deliverable'
          submitData.deliverableType = (state.data.deliverableType || 'link').toUpperCase() as any
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
          has_deliverable: !!submitData.deliverableUrl,
          deliverable_type: submitData.deliverableType
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
  }, [state.data, uploadState, api, projectId, onSuccess, showCustomStage])

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
              }}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
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
            onClick={() => navigate('/dashboard/projects/' + projectId)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
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
              setUploadState({
                file: null,
                uploading: false,
                progress: 0,
                error: null,
                uploadedKey: null,
                uploadedUrl: null
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
          className={'w-full px-4 py-2 rounded-lg border ' + (
            state.errors.stage && !showCustomStage ? 'border-red-300 bg-red-50' : 'border-gray-300'
          ) + ' focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'}
          aria-invalid={!!state.errors.stage && !showCustomStage}
          aria-describedby={state.errors.stage && !showCustomStage ? 'stage-error' : undefined}
        >
          <option value="">Select a stage...</option>
          {APPROVAL_STAGES.map(stage => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
        {state.errors.stage && !showCustomStage && (
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
              placeholder="e.g., CUSTOM_REVIEW"
              maxLength={50}
              className={'w-full px-4 py-2 rounded-lg border ' + (
                state.errors.stage ? 'border-red-300 bg-red-50' : 'border-gray-300'
              ) + ' focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'}
            />
            <p className="text-xs text-gray-500 mt-1">Use uppercase letters, numbers, and underscores only</p>
            {state.errors.stage && (
              <p className="text-sm text-red-600 mt-1" role="alert">
                {state.errors.stage}
              </p>
            )}
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
              className={'w-full px-4 py-2 rounded-lg border ' + (
                state.errors.stageLabel ? 'border-red-300 bg-red-50' : 'border-gray-300'
              ) + ' focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'}
            />
            {state.errors.stageLabel && (
              <p className="text-sm text-red-600 mt-1" role="alert">
                {state.errors.stageLabel}
              </p>
            )}
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
                onClick={() => {
                  handleInputChange('deliverableType', type.value)
                  setUseFileUpload(type.value !== 'link')
                  // Reset upload state when changing type
                  if (type.value === 'link') {
                    handleRemoveFile()
                  }
                }}
                className={'p-3 rounded-lg border-2 transition ' + (
                  state.data.deliverableType === type.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Icon className={'w-5 h-5 mx-auto mb-1 ' + (
                  state.data.deliverableType === type.value ? 'text-green-600' : 'text-gray-400'
                )} />
                <span className="text-xs font-medium text-gray-700">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* File Upload or URL Input */}
      {state.data.deliverableType && (
        <>
          {state.data.deliverableType !== 'link' && useFileUpload ? (
            /* File Upload Section */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File
              </label>
              
              {uploadState.uploadedKey ? (
                /* Uploaded file preview */
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <File className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uploadState.file?.name}</p>
                        <p className="text-xs text-gray-500">
                          {uploadState.file && (uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 text-gray-400 hover:text-red-600 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Uploaded successfully</span>
                  </div>
                </div>
              ) : uploadState.uploading ? (
                /* Upload progress */
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                    <span className="text-sm text-gray-600">Uploading {uploadState.file?.name}...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: uploadState.progress + '%' }}
                    />
                  </div>
                </div>
              ) : (
                /* Upload dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ' + (
                    uploadState.error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={state.data.deliverableType === 'pdf' ? '.pdf' : '.jpg,.jpeg,.png,.webp'}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {state.data.deliverableType === 'pdf' ? 'PDF up to 10MB' : 'JPG, PNG, WebP up to 10MB'}
                  </p>
                </div>
              )}
              
              {uploadState.error && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {uploadState.error}
                </p>
              )}

              {/* Option to use URL instead */}
              <button
                type="button"
                onClick={() => setUseFileUpload(false)}
                className="text-xs text-gray-500 hover:text-green-600 mt-2"
              >
                Or enter a URL instead
              </button>
            </div>
          ) : (
            /* URL Input */
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
                  className={'w-full px-4 py-2 rounded-lg border ' + (
                    state.errors.deliverableUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  ) + ' focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'}
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Option to upload file instead */}
              {state.data.deliverableType !== 'link' && (
                <button
                  type="button"
                  onClick={() => setUseFileUpload(true)}
                  className="text-xs text-gray-500 hover:text-green-600"
                >
                  Or upload a file instead
                </button>
              )}
            </>
          )}
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
          className={'w-full px-4 py-2 rounded-lg border ' + (
            state.errors.expiryDays ? 'border-red-300 bg-red-50' : 'border-gray-300'
          ) + ' focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'}
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
            disabled={state.isSubmitting || uploadState.uploading}
            className="flex-1 px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={state.isSubmitting || uploadState.uploading}
          className="flex-1 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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



















