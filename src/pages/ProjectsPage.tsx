/**
 * ProjectsPage Component
 * Lists all projects for the organization
 * AUTAIMATE BUILD STANDARD v2
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Plus, Search, Briefcase, Calendar, AlertCircle, Loader2, Filter } from 'lucide-react'
import * as Sentry from '@sentry/react'
import { useApi } from '../hooks/useApi'
import type { Project } from '../types/formTypes'

// =============================================================================
// TYPES
// =============================================================================

interface ProjectsResponse {
  items: Project[]
  total: number
}

type ProjectStatusFilter = 'ALL' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProjectsPage() {
  const navigate = useNavigate()
  const api = useApi<ProjectsResponse>()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('ALL')

  // Load projects
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.execute('/api/projects', {
        method: 'GET'
      })
      if (result?.items) {
        setProjects(result.items)
      } else if (Array.isArray(result)) {
        // Handle if API returns array directly
        setProjects(result as unknown as Project[])
      } else {
        setProjects([])
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { component: 'ProjectsPage', action: 'load' }
      })
      setError('Failed to load projects. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.reference.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'ALL' || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <Helmet>
        <title>Projects | Approv</title>
        <meta name="description" content="Manage all your projects and approvals" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage all your projects and approvals
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/projects/new')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProjectStatusFilter)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading projects...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-900">Failed to load projects</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={loadProjects}
                className="mt-4 bg-red-100 text-red-900 px-4 py-2 rounded-lg hover:bg-red-200 transition font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && projects.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6">Create your first project to start tracking approvals</p>
              <button
                onClick={() => navigate('/dashboard/projects/new')}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus className="w-5 h-5" />
                Create First Project
              </button>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Projects Grid */}
          {!loading && !error && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition cursor-pointer"
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="text-xs font-mono text-gray-500">
                      {project.reference}
                    </span>
                  </div>

                  {/* Project Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {project.name}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 text-sm text-gray-500">
                    {project.startDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Started: {formatDate(project.startDate)}</span>
                      </div>
                    )}
                    {project.budget && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Budget:</span>
                        <span>£{project.budget.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/dashboard/projects/${project.id}/approvals/new`)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Create Approval
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Count */}
          {!loading && !error && filteredProjects.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-500">
              Showing {filteredProjects.length} of {projects.length} projects
            </div>
          )}
        </main>
      </div>
    </>
  )
}
