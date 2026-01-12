/**
 * PortalHome Page
 * Client portal landing page showing all projects and pending approvals
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  FolderKanban, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react'
import { 
  PortalLayout, 
  PortalPageHeader, 
  PortalCard,
  PortalEmptyState,
  WelcomeBanner 
} from '../../components/layout'
import { 
  StatusBadge, 
  LoadingSpinner, 
  ErrorMessage
} from '../../components/common'
import { useApi } from '../../hooks'
import { formatRelativeTime } from '../../utils/formatters'
import type { ProjectWithApprovals } from '../../types'

// =============================================================================
// TYPES
// =============================================================================

interface PortalData {
  clientName: string
  projects: ProjectWithApprovals[]
  pendingCount: number
}

type FilterType = 'all' | 'pending' | 'completed'

// =============================================================================
// COMPONENT
// =============================================================================

export function PortalHome() {
  const [filter, setFilter] = useState<FilterType>('all')
  const { data, isLoading, error, execute } = useApi<PortalData>()

  useEffect(() => {
    execute('/api/portal')
  }, [execute])

  const filteredProjects = data?.projects.filter(project => {
    if (filter === 'pending') return project.pendingApprovalsCount > 0
    if (filter === 'completed') return project.pendingApprovalsCount === 0
    return true
  }) || []

  const pendingProjects = data?.projects.filter(p => p.pendingApprovalsCount > 0) || []

  return (
    <PortalLayout clientName={data?.clientName}>
      <Helmet>
        <title>My Projects | Approv</title>
        <meta name="description" content="View and manage your project approvals" />
      </Helmet>

      {/* Welcome banner */}
      {data && (
        <WelcomeBanner
          clientName={data.clientName}
          pendingCount={data.pendingCount}
        />
      )}

      {/* Page header */}
      <PortalPageHeader
        title="My Projects"
        subtitle={data ? `${data.projects.length} active projects` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Projects</option>
              <option value="pending">Needs Approval</option>
              <option value="completed">Up to Date</option>
            </select>
          </div>
        }
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading projects..." />
        </div>
      )}

      {/* Error state */}
      {error && (
        <ErrorMessage
          title="Failed to load projects"
          message={error.message}
          variant="error"
          onRetry={() => execute('/api/portal')}
        />
      )}

      {/* Content */}
      {data && !isLoading && (
        <>
          {/* Pending approvals section */}
          {filter === 'all' && pendingProjects.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-amber-500" />
                Awaiting Your Approval
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pendingProjects.map(project => (
                  <PendingApprovalCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {/* All projects */}
          <section>
            {filter !== 'all' && (
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {filter === 'pending' ? 'Projects Needing Approval' : 'Up to Date Projects'}
              </h2>
            )}
            
            {filteredProjects.length > 0 ? (
              <div className="grid gap-4">
                {filteredProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <PortalEmptyState
                icon={<FolderKanban size={32} />}
                title={filter === 'pending' ? 'No pending approvals' : 'No projects found'}
                message={
                  filter === 'pending' 
                    ? "You're all caught up! No approvals are waiting for your response."
                    : "No projects match your current filter."
                }
              />
            )}
          </section>
        </>
      )}
    </PortalLayout>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ProjectCardProps {
  project: ProjectWithApprovals
}

function ProjectCard({ project }: ProjectCardProps) {
  const hasPending = project.pendingApprovalsCount > 0
  
  return (
    <Link to={`/portal/project/${project.id}`}>
      <PortalCard hoverable>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
              <StatusBadge 
                status={project.status} 
                size="sm" 
                showIcon={false}
              />
            </div>
            
            <p className="text-sm text-gray-500 mb-3">
              {project.reference} • {project.currentStage}
            </p>

            <div className="flex items-center gap-4 text-sm">
              {hasPending ? (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Clock size={16} />
                  {project.pendingApprovalsCount} pending
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={16} />
                  Up to date
                </span>
              )}
              
              <span className="text-gray-400">
                {project.completedApprovalsCount} approved
              </span>
            </div>
          </div>

          <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
        </div>
      </PortalCard>
    </Link>
  )
}

function PendingApprovalCard({ project }: ProjectCardProps) {
  const latestPending = project.approvals.find(a => a.status === 'pending')
  
  return (
    <Link to={`/portal/project/${project.id}`}>
      <PortalCard hoverable className="border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-amber-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate mb-1">
              {project.name}
            </h3>
            
            {latestPending && (
              <p className="text-sm text-amber-700 mb-2">
                {latestPending.stage} needs approval
              </p>
            )}
            
            <p className="text-xs text-gray-500">
              Sent {latestPending ? formatRelativeTime(latestPending.createdAt) : 'recently'}
            </p>
          </div>

          <ChevronRight size={20} className="text-amber-400 flex-shrink-0" />
        </div>
      </PortalCard>
    </Link>
  )
}

export default PortalHome
