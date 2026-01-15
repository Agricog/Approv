/**
 * ProjectDetailPage Component
 * Shows project details and associated approvals
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
  ExternalLink
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
  viewCount: number
  reminderCount: number
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

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const api = useApi<Project>()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setError('No project ID provided')
      setLoading(false)
      return
    }
    loadProject()
  }, [projectId])

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
      case 'CHANGES_REQUESTED': return 'bg-red-100 text-red-800'
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
          </div>

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

                          {approval.status === 'PENDING' && approval.expiresAt && (
                            <p className="text-sm text-amber-600 mt-1">
                              Expires: {formatDate(approval.expiresAt)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {approval.status === 'PENDING' && approval.token && (
                            <ApprovalLink token={approval.token} />
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
    </div>
  )
}

