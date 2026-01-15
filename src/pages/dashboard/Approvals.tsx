/**
 * Approvals Page
 * Manage all approvals across projects
 */

import { useEffect, useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Eye,
  Bell,
  Loader2,
  ChevronDown,
  MoreHorizontal,
  FileText,
  User
} from 'lucide-react'
import { DashboardLayout, PageHeader, ContentCard } from '../../components/layout'
import { Button } from '../../components/common'
import { useApi } from '../../hooks'

// =============================================================================
// TYPES
// =============================================================================

interface Approval {
  id: string
  projectId: string
  projectName: string
  projectReference: string
  clientName: string
  clientCompany: string | null
  stage: string
  stageLabel: string
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXPIRED'
  createdAt: string
  expiresAt: string | null
  respondedAt: string | null
  viewCount: number
  reminderCount: number
  hasDeliverable: boolean
}

interface ApprovalsResponse {
  items: Approval[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'EXPIRED'
type SortField = 'createdAt' | 'status' | 'projectName'
type SortOrder = 'asc' | 'desc'

// =============================================================================
// COMPONENT
// =============================================================================

export function Approvals() {
  const { data, isLoading, error, execute } = useApi<ApprovalsResponse>()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  // Load approvals
  useEffect(() => {
    execute('/api/approvals')
  }, [execute])

  // Handle wrapped response
  const approvals = useMemo(() => {
    if (!data) return []
    // Handle both {items: [...]} and direct array
    if (Array.isArray(data)) return data
    if (data.items) return data.items
    return []
  }, [data])

  // Filter and sort approvals
  const filteredApprovals = useMemo(() => {
    let filtered = [...approvals]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.projectName.toLowerCase().includes(query) ||
        a.projectReference.toLowerCase().includes(query) ||
        a.clientName.toLowerCase().includes(query) ||
        (a.clientCompany?.toLowerCase().includes(query) ?? false) ||
        a.stageLabel.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'projectName':
          comparison = a.projectName.localeCompare(b.projectName)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [approvals, searchQuery, statusFilter, sortField, sortOrder])

  // Stats
  const stats = useMemo(() => {
    const pending = approvals.filter(a => a.status === 'PENDING').length
    const approved = approvals.filter(a => a.status === 'APPROVED').length
    const changesRequested = approvals.filter(a => a.status === 'CHANGES_REQUESTED').length
    const overdue = approvals.filter(a => {
      if (a.status !== 'PENDING') return false
      const daysSinceCreated = Math.floor((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreated > 7
    }).length
    
    return { pending, approved, changesRequested, overdue }
  }, [approvals])

  const handleSendReminder = async (approvalId: string) => {
    setSendingReminder(approvalId)
    try {
      const token = await getToken()
      const csrfToken = await getCsrfToken()
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/approvals/${approvalId}/remind`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken
          }
        }
      )

      if (response.ok) {
        // Refresh the list
        execute('/api/approvals')
      }
    } catch (err) {
      console.error('Failed to send reminder:', err)
    } finally {
      setSendingReminder(null)
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Approvals | Approv</title>
      </Helmet>

      <PageHeader
        title="Approvals"
        description="Manage all client approvals across your projects"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'all' : 'PENDING')}
          active={statusFilter === 'PENDING'}
        />
        <StatsCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'all' : 'APPROVED')}
          active={statusFilter === 'APPROVED'}
        />
        <StatsCard
          label="Changes Requested"
          value={stats.changesRequested}
          icon={<AlertCircle className="w-5 h-5" />}
          color="orange"
          onClick={() => setStatusFilter(statusFilter === 'CHANGES_REQUESTED' ? 'all' : 'CHANGES_REQUESTED')}
          active={statusFilter === 'CHANGES_REQUESTED'}
        />
        <StatsCard
          label="Overdue (7+ days)"
          value={stats.overdue}
          icon={<Bell className="w-5 h-5" />}
          color="red"
        />
      </div>

      <ContentCard>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project, client, stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 text-red-600">
            Failed to load approvals. Please refresh the page.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredApprovals.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No approvals found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first approval from a project page'}
            </p>
            <Link to="/dashboard/projects">
              <Button variant="primary">View Projects</Button>
            </Link>
          </div>
        )}

        {/* Approvals Table */}
        {!isLoading && !error && filteredApprovals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                    <button
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Status
                      {sortField === 'status' && (
                        <ChevronDown className={`w-4 h-4 transition ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Stage</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                    <button
                      onClick={() => toggleSort('projectName')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Project / Client
                      {sortField === 'projectName' && (
                        <ChevronDown className={`w-4 h-4 transition ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Created
                      {sortField === 'createdAt' && (
                        <ChevronDown className={`w-4 h-4 transition ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Response</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((approval) => (
                  <ApprovalRow
                    key={approval.id}
                    approval={approval}
                    onSendReminder={handleSendReminder}
                    sendingReminder={sendingReminder === approval.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredApprovals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredApprovals.length} of {approvals.length} approvals
          </div>
        )}
      </ContentCard>
    </DashboardLayout>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatsCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: 'yellow' | 'green' | 'orange' | 'red'
  onClick?: () => void
  active?: boolean
}

function StatsCard({ label, value, icon, color, onClick, active }: StatsCardProps) {
  const colorClasses = {
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  }

  const activeClasses = active ? 'ring-2 ring-offset-2 ring-green-500' : ''

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-4 rounded-lg border ${colorClasses[color]} ${activeClasses} ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition text-left w-full`}
    >
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

interface ApprovalRowProps {
  approval: Approval
  onSendReminder: (id: string) => void
  sendingReminder: boolean
}

function ApprovalRow({ approval, onSendReminder, sendingReminder }: ApprovalRowProps) {
  const [showActions, setShowActions] = useState(false)

  const statusConfig = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    CHANGES_REQUESTED: { label: 'Changes', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock }
  }

  const config = statusConfig[approval.status]
  const StatusIcon = config.icon

  const daysSinceCreated = Math.floor((Date.now() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = approval.status === 'PENDING' && daysSinceCreated > 7

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {/* Status */}
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </span>
      </td>

      {/* Stage */}
      <td className="py-3 px-4">
        <span className="text-sm text-gray-900">{approval.stageLabel}</span>
        {approval.hasDeliverable && (
          <span className="ml-2 inline-flex items-center text-xs text-gray-500">
            <FileText className="w-3 h-3 mr-1" />
            Has file
          </span>
        )}
      </td>

      {/* Project / Client */}
      <td className="py-3 px-4">
        <div>
          <Link 
            to={`/dashboard/projects/${approval.projectId}`}
            className="text-sm font-medium text-gray-900 hover:text-green-600"
          >
            {approval.projectName}
          </Link>
          <span className="ml-2 text-xs text-gray-400">{approval.projectReference}</span>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <User className="w-3.5 h-3.5" />
            {approval.clientName}
            {approval.clientCompany && (
              <span className="text-gray-400">• {approval.clientCompany}</span>
            )}
          </div>
        </div>
      </td>

      {/* Created Date */}
      <td className="py-3 px-4">
        <div>
          <div className="text-sm text-gray-900">
            {formatDate(approval.createdAt)}
          </div>
          {isOverdue && (
            <span className="text-xs text-red-600 font-medium">
              {daysSinceCreated} days ago
            </span>
          )}
          {!isOverdue && (
            <span className="text-xs text-gray-500">
              {daysSinceCreated === 0 ? 'Today' : `${daysSinceCreated} day${daysSinceCreated !== 1 ? 's' : ''} ago`}
            </span>
          )}
        </div>
      </td>

      {/* Response */}
      <td className="py-3 px-4">
        {approval.respondedAt ? (
          <div>
            <div className="text-sm text-gray-900">
              {formatDate(approval.respondedAt)}
            </div>
          </div>
        ) : approval.viewCount > 0 ? (
          <div>
            <span className="text-sm text-blue-600">Viewed</span>
            <div className="text-xs text-gray-500">{approval.viewCount} view{approval.viewCount !== 1 ? 's' : ''}</div>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Not viewed</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-2">
          {/* Send Reminder - only for pending */}
          {approval.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSendReminder(approval.id)}
              disabled={sendingReminder}
              title="Send reminder"
            >
              {sendingReminder ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]">
                  <Link
                    to={`/dashboard/projects/${approval.projectId}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowActions(false)}
                  >
                    <Eye className="w-4 h-4" />
                    View Project
                  </Link>
                  {approval.reminderCount > 0 && (
                    <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                      {approval.reminderCount} reminder{approval.reminderCount !== 1 ? 's' : ''} sent
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

async function getToken(): Promise<string> {
  // @ts-ignore - Clerk exposes this globally
  const clerk = window.Clerk
  if (clerk?.session) {
    return await clerk.session.getToken() || ''
  }
  return ''
}

async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/csrf-token`,
      {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      }
    )
    const data = await response.json()
    return data.token || ''
  } catch {
    return ''
  }
}

export default Approvals
