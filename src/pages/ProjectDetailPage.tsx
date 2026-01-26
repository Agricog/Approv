/**
 * ProjectDetailPage Component
 * Shows project details and associated approvals
 * Includes resubmit functionality for changes requested
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  User, 
  Building2, 
  AlertCircle,
  Loader2,
  Send,
  Eye,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Upload,
  X,
  FileText,
  Image,
  Link as LinkIcon,
  CheckCircle,
  Mail,
  Download,
  Clock,
  BarChart3
} from 'lucide-react'
import * as Sentry from '@sentry/react'
import { useApi } from '../hooks/useApi'

interface Client {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
}

interface Approval {
  id: string
  token: string
  stage: string
  stageLabel: string
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXPIRED'
  createdAt: string
  expiresAt: string | null
  respondedAt: string | null
  responseNotes: string | null
  viewCount: number
  reminderCount: number
  deliverableUrl?: string | null
  deliverableName?: string | null
  deliverableType?: string | null
}

interface Project {
  id: string
  name: string
  reference: string
  description: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  startDate: string | null
  targetCompletionDate: string | null
  client: Client
  approvals: Approval[]
  createdAt: string
  updatedAt: string
}

function ApprovalLink(props: { token: string }) {
  const url = 'https://approv.co.uk/approve/' + props.token
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
    >
      View Link
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

// =============================================================================
// STAGE PROGRESS GRAPH COMPONENT
// =============================================================================

interface StageProgressGraphProps {
  approvals: Approval[]
}

// Approv Stage definitions (matching the dropdown options)
const APPROV_STAGES = [
  { id: 'initial_concept', label: 'Initial Concept Drawings' },
  { id: 'detailed_design', label: 'Detailed Design' },
  { id: 'planning_pack', label: 'Planning Pack' },
  { id: 'final_approval', label: 'Final Approval' },
]

function StageProgressGraph({ approvals }: StageProgressGraphProps) {
  // Group approvals by stageLabel (the human-readable name)
  const stageMap = new Map<string, Approval[]>()
  
  approvals.forEach(approval => {
    const stageLabel = approval.stageLabel
    if (!stageMap.has(stageLabel)) {
      stageMap.set(stageLabel, [])
    }
    stageMap.get(stageLabel)!.push(approval)
  })

  // Get unique stages that have been used, in order they appear in APPROV_STAGES
  const usedStageLabels = new Set(approvals.map(a => a.stageLabel))
  
  // Build display stages: show stages that have approvals, maintaining logical order
  const displayStages = APPROV_STAGES.filter(stage => 
    usedStageLabels.has(stage.label)
  )
  
  // If none match predefined stages, just show the unique stages from approvals
  const finalStages = displayStages.length > 0 
    ? displayStages.map(s => s.label)
    : Array.from(usedStageLabels)

  // Determine stage status
  const getStageStatus = (stageLabel: string): 'not_started' | 'pending' | 'changes_requested' | 'approved' => {
    const stageApprovals = stageMap.get(stageLabel)
    if (!stageApprovals || stageApprovals.length === 0) return 'not_started'
    
    // Get the latest approval for this stage
    const latestApproval = stageApprovals.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
    
    if (latestApproval.status === 'APPROVED') return 'approved'
    if (latestApproval.status === 'CHANGES_REQUESTED') return 'changes_requested'
    if (latestApproval.status === 'PENDING') return 'pending'
    return 'not_started'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500'
      case 'pending': return 'bg-blue-500'
      case 'changes_requested': return 'bg-amber-500'
      default: return 'bg-gray-200'
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'approved': return 'border-green-500'
      case 'pending': return 'border-blue-500'
      case 'changes_requested': return 'border-amber-500'
      default: return 'border-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'pending': return 'Pending'
      case 'changes_requested': return 'Changes Requested'
      default: return 'Not Started'
    }
  }

  if (finalStages.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-gray-400" />
        Stage Progress
      </h2>
      
      <div className="space-y-3">
        {finalStages.map((stageLabel, index) => {
          const status = getStageStatus(stageLabel)
          const stageApprovals = stageMap.get(stageLabel) || []
          const latestApproval = stageApprovals.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
          
          return (
            <div key={stageLabel} className="relative">
              {/* Connector line */}
              {index < finalStages.length - 1 && (
                <div className={`absolute left-3 top-7 w-0.5 h-6 ${
                  status === 'approved' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
              
              <div className="flex items-start gap-3">
                {/* Status indicator */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  getStatusBorderColor(status)
                } ${status !== 'not_started' ? getStatusColor(status) : 'bg-white'}`}>
                  {status === 'approved' && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                  {status === 'pending' && (
                    <Clock className="w-3 h-3 text-white" />
                  )}
                  {status === 'changes_requested' && (
                    <RefreshCw className="w-3 h-3 text-white" />
                  )}
                </div>
                
                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${
                      status !== 'not_started' ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {stageLabel}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      status === 'approved' ? 'bg-green-100 text-green-700' :
                      status === 'pending' ? 'bg-blue-100 text-blue-700' :
                      status === 'changes_requested' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>
                  {latestApproval && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {latestApproval.respondedAt 
                        ? `Responded ${new Date(latestApproval.respondedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                        : `Sent ${new Date(latestApproval.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      }
                      {stageApprovals.length > 1 && ` (${stageApprovals.length} submissions)`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-600">Changes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// RESUBMIT MODAL COMPONENT
// =============================================================================

interface ResubmitModalProps {
  approval: Approval
  projectId: string
  clientName: string
  onClose: () => void
  onSuccess: () => void
}

function ResubmitModal({ approval, projectId, clientName, onClose, onSuccess }: ResubmitModalProps) {
  const presignApi = useApi<{ key: string; uploadUrl: string }>()
  const confirmApi = useApi<{ key: string; downloadUrl: string }>()
  const resubmitApi = useApi<{ id: string; token: string; status: string }>()
  
  const [deliverableType, setDeliverableType] = useState<'PDF' | 'IMAGE' | 'LINK' | null>(
    approval.deliverableType as 'PDF' | 'IMAGE' | 'LINK' | null
  )
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // NEW: Editable message for the client email
  const [customMessage, setCustomMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const uploadFile = async (): Promise<{ url: string; name: string } | null> => {
    if (!file) return null
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      // Get presigned upload URL
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
      
      setUploadProgress(30)
      
      // Upload to R2
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
      
      setUploadProgress(80)
      
      // Confirm upload
      const confirmResult = await confirmApi.execute('/api/uploads/confirm', {
        method: 'POST',
        body: { key: presignResult.key }
      })
      
      if (!confirmResult) {
        throw new Error('Failed to confirm upload')
      }
      
      setUploadProgress(100)
      
      // Return R2 key with prefix
      return {
        url: 'r2:' + presignResult.key,
        name: file.name
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'ResubmitModal', action: 'upload' }
      })
      throw err
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    
    // Validation: require either a new file/link OR a custom message
    const hasNewFile = deliverableType && deliverableType !== 'LINK' && file
    const hasNewLink = deliverableType === 'LINK' && externalUrl.trim().length > 0
    const hasMessage = customMessage.trim().length > 0
    
    if (!hasNewFile && !hasNewLink && !hasMessage) {
      setError('Please either upload a revised file, provide a link, or add a message to the client explaining the changes.')
      return
    }
    
    setSubmitting(true)
    
    try {
      let finalUrl: string | null = null
      let finalName: string | null = null
      let finalType: string | null = deliverableType
      
      // Handle file upload
      if (deliverableType && deliverableType !== 'LINK' && file) {
        const uploadResult = await uploadFile()
        if (uploadResult) {
          finalUrl = uploadResult.url
          finalName = uploadResult.name
        }
      } else if (deliverableType === 'LINK' && externalUrl) {
        finalUrl = externalUrl
        finalName = 'External Link'
      }
      
      // Call resubmit API with custom message
      const result = await resubmitApi.execute('/api/approvals/' + approval.id + '/resubmit', {
        method: 'POST',
        body: {
          deliverableUrl: finalUrl,
          deliverableName: finalName,
          deliverableType: finalType,
          expiryDays: 14,
          customMessage: customMessage.trim() || undefined
        }
      })
      
      if (!result) {
        throw new Error(resubmitApi.error?.message || 'Failed to resubmit approval')
      }
      
      setSuccess(true)
      
      // Wait a moment to show success, then close
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
      
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'ResubmitModal', action: 'submit' }
      })
      setError(err instanceof Error ? err.message : 'Failed to resubmit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Success state */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Resubmitted Successfully
              </h3>
              <p className="text-gray-600">
                {clientName} will receive an email with the updated plans.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                  Resubmit for Approval
                </h2>
                <p className="text-gray-600 mt-1">
                  {approval.stageLabel}
                </p>
              </div>

              {/* REVISED VERSION NOTICE */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will send a new email to {clientName} clearly marked as an 
                  <strong> updated/revised version</strong> of the plans. You must either upload a new file/link 
                  <strong> or </strong> add a message explaining the changes.
                </p>
              </div>
              
              {/* Previous feedback */}
              {approval.responseNotes && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Client Feedback
                  </div>
                  <p className="text-sm text-orange-700">{approval.responseNotes}</p>
                </div>
              )}

              {/* EDITABLE EMAIL MESSAGE */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Message to Client
                  <span className="text-xs text-gray-500 font-normal">(required if no new file attached)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add a note explaining the changes you've made. This will be included in the email.
                </p>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g., I've updated the window specifications as requested and revised the east elevation drawings..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {customMessage.length}/1000 characters
                </p>
              </div>
              
              {/* Deliverable type selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Upload Revised Deliverable
                  <span className="text-xs text-gray-500 font-normal ml-2">(required if no message added)</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliverableType('PDF')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition ${
                      deliverableType === 'PDF'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-xs font-medium">PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliverableType('IMAGE')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition ${
                      deliverableType === 'IMAGE'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Image className="w-6 h-6" />
                    <span className="text-xs font-medium">Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliverableType('LINK')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition ${
                      deliverableType === 'LINK'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <LinkIcon className="w-6 h-6" />
                    <span className="text-xs font-medium">Link</span>
                  </button>
                </div>
              </div>
              
              {/* File upload or URL input */}
              {deliverableType && deliverableType !== 'LINK' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept={deliverableType === 'PDF' ? '.pdf' : 'image/*'}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">{file.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {deliverableType === 'PDF' ? 'PDF up to 10MB' : 'PNG, JPG up to 10MB'}
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                  {uploading && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}
              
              {deliverableType === 'LINK' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    External URL
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}
              
              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || uploading}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resubmitting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resubmit
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const api = useApi<Project>()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Resubmit modal state
  const [resubmitApproval, setResubmitApproval] = useState<Approval | null>(null)

  const loadProject = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.execute('/api/projects/' + projectId)
      if (result) {
        setProject(result)
      } else {
        setError('Project not found')
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'ProjectDetailPage', action: 'load' }
      })
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!projectId) {
      setError('No project ID provided')
      setLoading(false)
      return
    }
    
    loadProject()
  }, [projectId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'CHANGES_REQUESTED': return 'bg-orange-100 text-orange-800'
      case 'EXPIRED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApprovalStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Awaiting Response'
      case 'APPROVED': return 'Approved'
      case 'CHANGES_REQUESTED': return 'Changes Requested'
      case 'EXPIRED': return 'Expired'
      default: return status
    }
  }

  const goToCreateApproval = () => {
    navigate('/dashboard/projects/' + projectId + '/approvals/new')
  }

  const goBackToProjects = () => {
    navigate('/dashboard/projects')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load project'}</p>
          <button
            onClick={goBackToProjects}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <button
            onClick={goBackToProjects}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <span className={'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ' + getStatusColor(project.status)}>
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-mono">{project.reference}</p>
              {project.description && (
                <p className="text-gray-600 mt-2 max-w-2xl">{project.description}</p>
              )}
            </div>
            <button
              onClick={goToCreateApproval}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              New Approval
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Client
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">{project.client.name}</p>
                  <p className="text-sm text-gray-500">{project.client.email}</p>
                </div>
                {project.client.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    {project.client.company}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                Project Details
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(project.startDate)}</p>
                </div>
                {project.targetCompletionDate && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Target Completion</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(project.targetCompletionDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(project.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Stage Progress Graph */}
            {project.approvals && project.approvals.length > 0 && (
              <StageProgressGraph approvals={project.approvals} />
            )}

            {/* Download Report */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Project Report
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Download a complete PDF report of all approvals, client feedback, and audit history for this project.
              </p>
              <a
                href={`/api/projects/${project.id}/report`}
                download
                className="inline-flex items-center gap-2 w-full justify-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-sm border border-gray-300"
              >
                <Download className="w-4 h-4" />
                Download Report (PDF)
              </a>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Useful for records or dispute resolution
              </p>
            </div>
          </div>

          {/* Approvals list */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Approvals</h2>
                <span className="text-sm text-gray-500">
                  {project.approvals ? project.approvals.length : 0} total
                </span>
              </div>

              {!project.approvals || project.approvals.length === 0 ? (
                <div className="p-12 text-center">
                  <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No approvals yet</h3>
                  <p className="text-gray-500 mb-6">Create your first approval request for this project</p>
                  <button
                    onClick={goToCreateApproval}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create Approval
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {project.approvals.map((approval) => (
                    <div key={approval.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{approval.stageLabel}</h3>
                            <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + getApprovalStatusColor(approval.status)}>
                              {getApprovalStatusLabel(approval.status)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Sent: {formatDateTime(approval.createdAt)}</span>
                            {approval.viewCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {approval.viewCount} views
                              </span>
                            )}
                          </div>

                          {approval.respondedAt && (
                            <p className="text-sm text-gray-500 mt-1">
                              Responded: {formatDateTime(approval.respondedAt)}
                            </p>
                          )}

                          {approval.responseNotes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <MessageSquare className="w-4 h-4" />
                                Client Feedback
                              </div>
                              <p className="text-sm text-gray-600">{approval.responseNotes}</p>
                            </div>
                          )}

                          {approval.status === 'PENDING' && approval.expiresAt && (
                            <p className="text-sm text-amber-600 mt-2">
                              Expires: {formatDate(approval.expiresAt)}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          {/* View Link - always show when token exists */}
                          {approval.token && (
                            <ApprovalLink token={approval.token} />
                          )}
                          
                          {/* Resubmit button for CHANGES_REQUESTED */}
                          {approval.status === 'CHANGES_REQUESTED' && (
                            <button
                              onClick={() => setResubmitApproval(approval)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Resubmit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Resubmit Modal */}
      {resubmitApproval && projectId && project && (
        <ResubmitModal
          approval={resubmitApproval}
          projectId={projectId}
          clientName={project.client.name}
          onClose={() => setResubmitApproval(null)}
          onSuccess={loadProject}
        />
      )}
    </div>
  )
}
