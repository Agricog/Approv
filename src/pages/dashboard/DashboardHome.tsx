/**
 * DashboardHome Page
 * Main dashboard overview with metrics and recent activity
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  FolderKanban, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3
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
  SkeletonCard
} from '../../components/common'
import { useApi } from '../../hooks'
import { formatRelativeTime, formatNumber, formatPercentage } from '../../utils/formatters'
import type { DashboardMetrics, Bottleneck } from '../../types'

// =============================================================================
// TYPES
// =============================================================================

interface DashboardData {
  metrics: DashboardMetrics
  recentActivity: ActivityItem[]
  bottlenecks: Bottleneck[]
}

interface ActivityItem {
  id: string
  type: 'approval' | 'project' | 'reminder'
  message: string
  projectName: string
  timestamp: string
  status?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DashboardHome() {
  const { data, isLoading, error, execute } = useApi<DashboardData>()

  useEffect(() => {
    execute('/api/dashboard')
  }, [execute])

  return (
    <DashboardLayout>
      <Helmet>
        <title>Dashboard | Approv</title>
      </Helmet>

      <PageHeader
        title="Dashboard"
        description="Overview of your approval workflow"
        actions={
          <Link to="/dashboard/analytics">
            <Button variant="secondary" leftIcon={<BarChart3 size={18} />}>
              View Analytics
            </Button>
          </Link>
        }
      />

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <ErrorMessage
          title="Failed to load dashboard"
          message={error.message}
          variant="error"
          onRetry={() => execute('/api/dashboard')}
        />
      )}

      {/* Content */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Metrics cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Active Projects"
              value={data.metrics.activeProjects}
              icon={<FolderKanban size={20} />}
              trend={data.metrics.trends.projectsChange}
              trendLabel="vs last month"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <MetricCard
              label="Pending Approvals"
              value={data.metrics.pendingApprovals}
              icon={<Clock size={20} />}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              highlight={data.metrics.pendingApprovals > 5}
            />
            <MetricCard
              label="Approval Rate"
              value={formatPercentage(data.metrics.approvalStats.approvalRate)}
              icon={<CheckCircle size={20} />}
              trend={data.metrics.trends.approvalsChange}
              trendLabel="vs last month"
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <MetricCard
              label="Avg Response Time"
              value={`${data.metrics.approvalStats.avgResponseTimeHours.toFixed(1)}h`}
              icon={<TrendingUp size={20} />}
              trend={-data.metrics.trends.responseTimeChange}
              trendLabel="vs last month"
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          </div>

          {/* Main content grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent activity */}
            <ContentCard
              title="Recent Activity"
              actions={
                <Link to="/dashboard/activity" className="text-sm text-green-600 hover:text-green-700">
                  View all
                </Link>
              }
            >
              {data.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {data.recentActivity.slice(0, 5).map(item => (
                    <ActivityItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No recent activity
                </p>
              )}
            </ContentCard>

            {/* Bottlenecks */}
            <ContentCard
              title="Attention Needed"
              description="Approvals waiting longest"
              actions={
                <Link to="/dashboard/approvals" className="text-sm text-green-600 hover:text-green-700">
                  View all
                </Link>
              }
            >
              {data.bottlenecks.length > 0 ? (
                <div className="space-y-3">
                  {data.bottlenecks.slice(0, 5).map(bottleneck => (
                    <BottleneckItem key={bottleneck.id} bottleneck={bottleneck} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                  <p className="text-gray-600">All caught up!</p>
                  <p className="text-sm text-gray-500">No bottlenecks detected</p>
                </div>
              )}
            </ContentCard>
          </div>

          {/* Quick actions */}
          <ContentCard title="Quick Actions" padding="sm">
            <div className="flex flex-wrap gap-3 p-2">
              <Link to="/dashboard/projects">
                <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
                  View Projects
                </Button>
              </Link>
              <Link to="/dashboard/approvals">
                <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
                  Manage Approvals
                </Button>
              </Link>
              <Link to="/dashboard/analytics">
                <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
                  View Reports
                </Button>
              </Link>
            </div>
          </ContentCard>
        </div>
      )}
    </DashboardLayout>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface MetricCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  iconBg: string
  iconColor: string
  highlight?: boolean
}

function MetricCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  iconBg,
  iconColor,
  highlight = false
}: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend > 0
  const isNegativeTrend = trend !== undefined && trend < 0

  return (
    <div className={`
      bg-white rounded-lg border p-6
      ${highlight ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            isPositiveTrend ? 'text-green-600' : isNegativeTrend ? 'text-red-600' : 'text-gray-500'
          }`}>
            {isPositiveTrend && <TrendingUp size={14} />}
            {isNegativeTrend && <TrendingDown size={14} />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      
      <p className="text-sm text-gray-500">{label}</p>
      
      {trendLabel && trend !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>
      )}
    </div>
  )
}

interface ActivityItemProps {
  item: ActivityItem
}

function ActivityItem({ item }: ActivityItemProps) {
  const getIcon = () => {
    switch (item.type) {
      case 'approval':
        return item.status === 'approved' 
          ? <CheckCircle size={16} className="text-green-600" />
          : <AlertTriangle size={16} className="text-amber-600" />
      case 'reminder':
        return <Clock size={16} className="text-blue-600" />
      default:
        return <FolderKanban size={16} className="text-gray-600" />
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{item.message}</p>
        <p className="text-xs text-gray-500">
          {item.projectName} • {formatRelativeTime(item.timestamp)}
        </p>
      </div>
    </div>
  )
}

interface BottleneckItemProps {
  bottleneck: Bottleneck
}

function BottleneckItem({ bottleneck }: BottleneckItemProps) {
  return (
    <Link 
      to={`/dashboard/projects/${bottleneck.projectId}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {bottleneck.projectName}
        </p>
        <p className="text-xs text-gray-500">
          {bottleneck.stageLabel} • {bottleneck.clientName}
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-medium ${
          bottleneck.urgency === 'critical' ? 'text-red-600' :
          bottleneck.urgency === 'high' ? 'text-orange-600' :
          bottleneck.urgency === 'medium' ? 'text-amber-600' :
          'text-gray-600'
        }`}>
          {bottleneck.daysPending}d
        </span>
        <StatusBadge 
          status={bottleneck.urgency as 'warning' | 'error'} 
          label={bottleneck.urgency}
          size="sm" 
          showIcon={false}
        />
      </div>
    </Link>
  )
}

export default DashboardHome
