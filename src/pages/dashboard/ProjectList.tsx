/**
 * ProjectList Page
 * Dashboard view of all projects with filtering and search
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  Plus, 
  Search, 
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  MoreVertical
} from 'lucide-react'
import { 
  DashboardLayout, 
  PageHeader, 
  ContentCard 
} from '../../components/layout'
import { 
  StatusBadge, 
  LoadingSpinner, 
  ErrorMessage,
  Button,
  Input,
  EmptyState,
  SkeletonTable
} from '../../components/common'
import { useApi, useDebouncedInput } from '../../hooks'
import { formatDate, formatRelativeTime } from '../../utils/formatters'
import { PROJECT_STAGE_LABELS, PROJECT_STATUS_LABELS } from '../../types'
import type { ProjectListItem, ProjectStatus, ProjectStage, PaginatedResponse } from '../../types'

// =============================================================================
// TYPES
// =============================================================================

interface Filters {
  status: ProjectStatus | 'all'
  stage: ProjectStage | 'all'
  hasPendingApprovals: boolean | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProjectList() {
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    stage: 'all',
    hasPendingApprovals: null
  })
  const [showFilters, setShowFilters] = useState(false)

  const search = useDebouncedInput({
    delay: 300,
    minLength: 2
  })

  const { data, isLoading, error, execute } = useApi<PaginatedResponse<ProjectListItem>>()

  useEffect(() => {
    const params = new URLSearchParams()
    if (search.debouncedValue) params.set('search', search.debouncedValue)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.stage !== 'all') params.set('stage', filters.stage)
    if (filters.hasPendingApprovals !== null) {
      params.set('hasPendingApprovals', String(filters.hasPendingApprovals))
    }
    
    execute(`/api/dashboard/projects?${params.toString()}`)
  }, [execute, search.debouncedValue, filters])

  const handleFilterChange = (key: keyof Filters, value: string | boolean | null) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      stage: 'all',
      hasPendingApprovals: null
    })
    search.onClear()
  }

  const hasActiveFilters = 
    filters.status !== 'all' || 
    filters.stage !== 'all' || 
    filters.hasPendingApprovals !== null ||
    search.value.length > 0

  return (
    <DashboardLayout>
      <Helmet>
        <title>Projects | Approv</title>
      </Helmet>

      <PageHeader
        title="Projects"
        description="Manage all your projects and approvals"
        actions={
          <Button variant="primary" leftIcon={<Plus size={18} />}>
            New Project
          </Button>
        }
      />

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search projects..."
              value={search.value}
              onChange={search.onChange}
              leftIcon={<Search size={18} />}
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter size={18} />}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Statuses</option>
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage
              </label>
              <select
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Stages</option>
                {Object.entries(PROJECT_STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approvals
              </label>
              <select
                value={filters.hasPendingApprovals === null ? 'all' : String(filters.hasPendingApprovals)}
                onChange={(e) => handleFilterChange(
                  'hasPendingApprovals', 
                  e.target.value === 'all' ? null : e.target.value === 'true'
                )}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All</option>
                <option value="true">Has Pending</option>
                <option value="false">Up to Date</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <ContentCard>
          <SkeletonTable rows={5} />
        </ContentCard>
      )}

      {/* Error */}
      {error && (
        <ErrorMessage
          title="Failed to load projects"
          message={error.message}
          variant="error"
          onRetry={() => execute('/api/dashboard/projects')}
        />
      )}

      {/* Content */}
      {data && !isLoading && (
        <ContentCard padding="none">
          {data.items.length > 0 ? (
            <>
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                <div className="col-span-4">Project</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Stage</div>
                <div className="col-span-2">Approvals</div>
                <div className="col-span-2">Last Activity</div>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-gray-200">
                {data.items.map(project => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>

              {/* Pagination info */}
              {data.totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                  Showing {data.items.length} of {data.total} projects
                </div>
              )}
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No projects found"
                message={hasActiveFilters 
                  ? "No projects match your current filters. Try adjusting your search."
                  : "Get started by creating your first project."
                }
                action={!hasActiveFilters ? {
                  label: "Create Project",
                  onClick: () => {}
                } : undefined}
              />
            </div>
          )}
        </ContentCard>
      )}
    </DashboardLayout>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ProjectRowProps {
  project: ProjectListItem
}

function ProjectRow({ project }: ProjectRowProps) {
  return (
    <Link
      to={`/dashboard/projects/${project.id}`}
      className="block hover:bg-gray-50 transition-colors"
    >
      {/* Mobile view */}
      <div className="md:hidden px-6 py-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium text-gray-900">{project.name}</p>
            <p className="text-sm text-gray-500">{project.reference}</p>
          </div>
          <StatusBadge status={project.status} size="sm" showIcon={false} />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{PROJECT_STAGE_LABELS[project.currentStage as keyof typeof PROJECT_STAGE_LABELS]}</span>
          <span>•</span>
          {project.pendingApprovals > 0 ? (
            <span className="text-amber-600">{project.pendingApprovals} pending</span>
          ) : (
            <span className="text-green-600">Up to date</span>
          )}
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
        <div className="col-span-4">
          <p className="font-medium text-gray-900">{project.name}</p>
          <p className="text-sm text-gray-500">{project.reference} • {project.clientName}</p>
        </div>
        
        <div className="col-span-2">
          <StatusBadge status={project.status} size="sm" showIcon={false} />
        </div>
        
        <div className="col-span-2 text-sm text-gray-600">
          {PROJECT_STAGE_LABELS[project.currentStage as keyof typeof PROJECT_STAGE_LABELS]}
        </div>
        
        <div className="col-span-2">
          {project.pendingApprovals > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm text-amber-600">
              <Clock size={14} />
              {project.pendingApprovals} pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle size={14} />
              Up to date
            </span>
          )}
        </div>
        
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {formatRelativeTime(project.lastActivityAt)}
          </span>
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </div>
    </Link>
  )
}

export default ProjectList
