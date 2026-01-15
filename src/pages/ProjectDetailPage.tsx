/**
 * ProjectDetailPage Component
 * Shows project details and associated approvals
 * AUTAIMATE BUILD STANDARD v2
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  User, 
  Building2, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  ExternalLink
} from 'lucide-react'
import * as Sentry from '@sentry/react'
import { useApi } from '../hooks/useApi'

// =============================================================================
// TYPES
// =============================================================================

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string | null
}

interface Approval {
  id: string
  stage: string
  stageLabel: string
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXPIRED'
  createdAt: string
  expiresAt: string
  respondedAt: string | null
  viewCount: number
  reminderCount: number
  token: string
}

interface Project {
  id: string
  name: string
  reference: string
  description: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  startDate: string | null
  endDate: string | null
  budget: number | null
  client: Client
  approvals: Approval[]
  createdAt: string
  updatedAt: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const api = useApi<{ data: Project }>()
  
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
      const result = await api.execute(`/api/projects/${projectId}`)
      
      if (result?.data) {
        setProject(result.data)
      } else if (result && !result.data) {
        // Handle if API returns project directly without data wrapper
        setProject(result as unknown as Project)
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

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format datetime
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
      ON_HOLD: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
    }
    return config[status] || config.ACTIVE
  }

  // Get approval status badge
  const getApprovalStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Awaiting Response' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      CHANGES_REQUESTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Changes Requested' },
      EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' }
    }
    return config[status] || config.PENDING
  }

  // Loading state
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

  // Error state
  if (error || !project) {
    return (
      <>
        <Helmet>
          <title>Project Not Found | Approv</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load project'}</p>
            <button
              onClick={() => navigate('/dashboard/projects')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </>
    )
  }

  const statusBadge = getStatusBadge(project.status)
  const StatusIcon = statusBadge.icon

  return (
    <>
      <Helmet>
        <title>{project.name} | Approv</title>
        <meta name="description" content={`Project details for ${project.name}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate('/dashboard/projects')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-mono">{project.reference}</p>
                {project.description && (
                  <p className="text-gray-600 mt-2 max-w-2xl">{project.description}</p>
                )}
              </div>

              <button
                onClick={() => navigate(`/dashboard/projects/${projectId}/approvals/new`)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                <Plus className="w-4 h-4" />
                New Approval
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Project Details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Client Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  Client
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {project.client.firstName} {project.client.lastName}
                    </p>
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

              {/* Project Info Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  Project Details
                </h2>
                <div className="space-y-4">
                  {project.startDate && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(project.startDate)}</p>
                    </div>
                  )}
                  {project.endDate && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">End Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(project.endDate)}</p>
                    </div>
                  )}
                  {project.budget && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Budget</p>
                      <p className="text-sm font-medium text-gray-900">£{project.budget.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(project.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Approvals */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Approvals</h2>
                  <span className="text-sm text-gray-500">
                    {project.approvals?.length || 0} total
                  </span>
                </div>

                {!project.approvals || project.approvals.length === 0 ? (
                  <div className="p-12 text-center">
                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No approvals yet</h3>
                    <p className="text-gray-500 mb-6">Create your first approval request for this project</p>
                    <button
                      onClick={() => navigate(`/dashboard/projects/${projectId}/approvals/new`)}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Create Approval
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {project.approvals.map((approval) => {
                      const statusBadge = getApprovalStatusBadge(approval.status)
                      const isPending = approval.status === 'PENDING'
                      
                      return (
                        <div key={approval.id} className="p-6 hover:bg-gray-50 transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-medium text-gray-900">{approval.stageLabel}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                  {statusBadge.label}
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

                              {isPending && (
                                <p className="text-sm text-amber-600 mt-1">
                                  Expires: {formatDate(approval.expiresAt)}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending && (
                                <a
                                  href={`https://approv.co.uk/approve/${approval.token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                  View Link
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
