/**
 * ProjectDetail Page
 * Client view of a specific project with approval history
 */

import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  ArrowLeft, 
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  FileText
} from 'lucide-react'
import { PortalLayout, PortalPageHeader } from '../../components/layout'
import { 
  StatusBadge, 
  LoadingSpinner, 
  ErrorMessage,
  Button,
  EmptyState 
} from '../../components/common'
import { useApi } from '../../hooks'
import { formatDate, formatRelativeTime } from '../../utils/formatters'
import { PROJECT_STAGE_LABELS } from '../../types'
import type { ProjectWithApprovals, ApprovalStatus } from '../../types'

// =============================================================================
// COMPONENT
// =============================================================================

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, error, execute } = useApi<ProjectWithApprovals>()

  useEffect(() => {
    if (projectId) {
      execute(`/api/portal/projects/${projectId}`)
    }
  }, [projectId, execute])

  return (
    <PortalLayout>
      <Helmet>
        <title>{project?.name || 'Project'} | Approv</title>
      </Helmet>

      {/* Back link */}
      <Link 
        to="/portal" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={18} />
        Back to Projects
      </Link>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading project..." />
        </div>
      )}

      {/* Error */}
      {error && (
        <ErrorMessage
          title="Failed to load project"
          message={error.message}
          variant="error"
          onRetry={() => execute(`/api/portal/projects/${projectId}`)}
        />
      )}

      {/* Content */}
      {project && !isLoading && (
        <>
          {/* Header */}
          <PortalPageHeader
            title={project.name}
            subtitle={project.reference}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pending approvals */}
              {project.pendingApprovalsCount > 0 && (
                <PendingApprovalsSection 
                  approvals={project.approvals.filter(a => a.status === 'pending')} 
                />
              )}

              {/* Approval history */}
              <ApprovalHistorySection approvals={project.approvals} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Project info card */}
              <ProjectInfoCard project={project} />

              {/* Stage progress */}
              <StageProgress 
                currentStage={project.currentStage} 
                approvals={project.approvals}
              />
            </div>
          </div>
        </>
      )}
    </PortalLayout>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PendingApprovalsSectionProps {
  approvals: ProjectWithApprovals['approvals']
}

function PendingApprovalsSection({ approvals }: PendingApprovalsSectionProps) {
  return (
    <section className="bg-amber-50 border border-amber-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <AlertCircle size={20} />
        Action Required
      </h2>
      
      <div className="space-y-3">
        {approvals.map(approval => (
          <Link
            key={approval.id}
            to={`/approve/${approval.id}`}
            className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all"
          >
            <div>
              <p className="font-medium text-gray-900">{approval.stage}</p>
              <p className="text-sm text-gray-500">
                Sent {formatRelativeTime(approval.createdAt)}
              </p>
            </div>
            <Button variant="primary" size="sm" rightIcon={<ExternalLink size={16} />}>
              Review
            </Button>
          </Link>
        ))}
      </div>
    </section>
  )
}

interface ApprovalHistorySectionProps {
  approvals: ProjectWithApprovals['approvals']
}

function ApprovalHistorySection({ approvals }: ApprovalHistorySectionProps) {
  const sortedApprovals = [...approvals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Approval History
      </h2>

      {sortedApprovals.length > 0 ? (
        <div className="space-y-4">
          {sortedApprovals.map(approval => (
            <ApprovalHistoryItem key={approval.id} approval={approval} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText size={32} />}
          title="No approvals yet"
          message="Approval requests will appear here as the project progresses."
        />
      )}
    </section>
  )
}

interface ApprovalHistoryItemProps {
  approval: ProjectWithApprovals['approvals'][0]
}

function ApprovalHistoryItem({ approval }: ApprovalHistoryItemProps) {
  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={18} className="text-green-600" />
      case 'changes_requested':
        return <AlertCircle size={18} className="text-red-600" />
      case 'pending':
        return <Clock size={18} className="text-amber-600" />
      default:
        return <Clock size={18} className="text-gray-400" />
    }
  }

  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
      <div className="mt-0.5">{getStatusIcon(approval.status)}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-gray-900">{approval.stage}</p>
          <StatusBadge status={approval.status} size="sm" showIcon={false} />
        </div>
        
        <p className="text-sm text-gray-500">
          {approval.status === 'pending' 
            ? `Sent ${formatDate(approval.createdAt)}`
            : `Responded ${formatDate(approval.respondedAt || approval.createdAt)}`
          }
        </p>
      </div>

      {approval.status === 'pending' && (
        <Link to={`/approve/${approval.id}`}>
          <Button variant="outline" size="sm">Review</Button>
        </Link>
      )}
    </div>
  )
}

interface ProjectInfoCardProps {
  project: ProjectWithApprovals
}

function ProjectInfoCard({ project }: ProjectInfoCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <User size={18} className="text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">Client</p>
            <p className="text-gray-900">{project.clientName}</p>
          </div>
        </div>

        {project.address && (
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="text-gray-900">{project.address}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar size={18} className="text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">Started</p>
            <p className="text-gray-900">{formatDate(project.startDate)}</p>
          </div>
        </div>

        {project.targetCompletionDate && (
          <div className="flex items-start gap-3">
            <Calendar size={18} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Target Completion</p>
              <p className="text-gray-900">{formatDate(project.targetCompletionDate)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface StageProgressProps {
  currentStage: string
  approvals: ProjectWithApprovals['approvals']
}

function StageProgress({ currentStage, approvals }: StageProgressProps) {
  const stages = Object.entries(PROJECT_STAGE_LABELS)
  const currentIndex = stages.findIndex(([key]) => key === currentStage)

  const getStageStatus = (stageKey: string, index: number) => {
    const approval = approvals.find(a => a.stage.toLowerCase().includes(stageKey.replace('_', ' ')))
    
    if (approval?.status === 'approved') return 'complete'
    if (approval?.status === 'pending') return 'pending'
    if (index < currentIndex) return 'complete'
    if (index === currentIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Project Progress</h3>
      
      <div className="space-y-3">
        {stages.map(([key, label], index) => {
          const status = getStageStatus(key, index)
          
          return (
            <div key={key} className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                ${status === 'complete' ? 'bg-green-100' : ''}
                ${status === 'current' ? 'bg-green-600' : ''}
                ${status === 'pending' ? 'bg-amber-100' : ''}
                ${status === 'upcoming' ? 'bg-gray-100' : ''}
              `}>
                {status === 'complete' && <CheckCircle size={14} className="text-green-600" />}
                {status === 'current' && <div className="w-2 h-2 bg-white rounded-full" />}
                {status === 'pending' && <Clock size={14} className="text-amber-600" />}
                {status === 'upcoming' && <div className="w-2 h-2 bg-gray-300 rounded-full" />}
              </div>
              
              <span className={`text-sm ${
                status === 'current' ? 'font-medium text-gray-900' : 
                status === 'complete' ? 'text-gray-600' : 
                'text-gray-400'
              }`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectDetail
