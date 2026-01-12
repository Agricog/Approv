/**
 * AnalyticsDashboard Page
 * Analytics and reporting for approval metrics
 */

import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { 
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart
} from 'lucide-react'
import { 
  DashboardLayout, 
  PageHeader, 
  ContentCard 
} from '../../components/layout'
import { 
  LoadingSpinner, 
  ErrorMessage,
  Button,
  SkeletonCard
} from '../../components/common'
import { useApi } from '../../hooks'
import { 
  formatNumber, 
  formatPercentage, 
  formatHours,
  formatDate
} from '../../utils/formatters'
import { trackDateRangeChanged, trackReportExported } from '../../utils/analytics'
import type { 
  TimePeriod, 
  DateRange, 
  DashboardMetrics, 
  TimelineDataPoint, 
  StageBreakdown 
} from '../../types'

// =============================================================================
// TYPES
// =============================================================================

interface AnalyticsData {
  metrics: DashboardMetrics
  timeline: TimelineDataPoint[]
  byStage: StageBreakdown[]
  dateRange: DateRange
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('month')
  const { data, isLoading, error, execute } = useApi<AnalyticsData>()

  useEffect(() => {
    execute(`/api/dashboard/analytics?period=${period}`)
  }, [execute, period])

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod)
    trackDateRangeChanged(newPeriod)
  }

  const handleExport = (format: 'pdf' | 'csv') => {
    trackReportExported(format)
    // Export logic would go here
    window.alert(`Export to ${format.toUpperCase()} coming soon!`)
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Analytics | Approv</title>
      </Helmet>

      <PageHeader
        title="Analytics"
        description="Track approval performance and identify bottlenecks"
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              leftIcon={<Download size={16} />}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              leftIcon={<Download size={16} />}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Period selector */}
      <div className="mb-6 flex items-center gap-2">
        <Calendar size={18} className="text-gray-400" />
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['week', 'month', 'quarter', 'year'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === p 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        
        {data?.dateRange && (
          <span className="text-sm text-gray-500 ml-4">
            {formatDate(data.dateRange.start)} - {formatDate(data.dateRange.end)}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {error && (
        <ErrorMessage
          title="Failed to load analytics"
          message={error.message}
          variant="error"
          onRetry={() => execute(`/api/dashboard/analytics?period=${period}`)}
        />
      )}

      {/* Content */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Approvals"
              value={formatNumber(data.metrics.approvalStats.total)}
              icon={<BarChart3 size={20} />}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <MetricCard
              label="Approval Rate"
              value={formatPercentage(data.metrics.approvalStats.approvalRate)}
              icon={<CheckCircle size={20} />}
              trend={data.metrics.trends.approvalsChange}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <MetricCard
              label="Avg Response Time"
              value={formatHours(data.metrics.approvalStats.avgResponseTimeHours)}
              icon={<Clock size={20} />}
              trend={-data.metrics.trends.responseTimeChange}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <MetricCard
              label="Changes Requested"
              value={formatNumber(data.metrics.approvalStats.changesRequested)}
              icon={<AlertTriangle size={20} />}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Timeline chart */}
            <ContentCard title="Approval Timeline" padding="none">
              <div className="p-6">
                <TimelineChart data={data.timeline} />
              </div>
            </ContentCard>

            {/* Stage breakdown */}
            <ContentCard title="By Stage" padding="none">
              <div className="p-6">
                <StageBreakdownChart data={data.byStage} />
              </div>
            </ContentCard>
          </div>

          {/* Detailed stage table */}
          <ContentCard title="Stage Performance" padding="none">
            <StageTable data={data.byStage} />
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
  value: string
  icon: React.ReactNode
  trend?: number
  iconBg: string
  iconColor: string
}

function MetricCard({ label, value, icon, trend, iconBg, iconColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

interface TimelineChartProps {
  data: TimelineDataPoint[]
}

function TimelineChart({ data }: TimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available for this period
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.total))

  return (
    <div className="h-64">
      {/* Simple bar chart visualization */}
      <div className="flex items-end justify-between h-48 gap-1">
        {data.map((point, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            {/* Stacked bar */}
            <div 
              className="w-full bg-gray-100 rounded-t relative"
              style={{ height: `${(point.total / maxValue) * 100}%`, minHeight: '4px' }}
            >
              <div 
                className="absolute bottom-0 w-full bg-green-500 rounded-t"
                style={{ height: `${point.total > 0 ? (point.approved / point.total) * 100 : 0}%` }}
              />
              <div 
                className="absolute bottom-0 w-full bg-red-400 rounded-t"
                style={{ 
                  height: `${point.total > 0 ? (point.changesRequested / point.total) * 100 : 0}%`,
                  bottom: `${point.total > 0 ? (point.approved / point.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-gray-600">Approved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span className="text-gray-600">Changes Requested</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded" />
          <span className="text-gray-600">Pending</span>
        </div>
      </div>
    </div>
  )
}

interface StageBreakdownChartProps {
  data: StageBreakdown[]
}

function StageBreakdownChart({ data }: StageBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    )
  }

  const total = data.reduce((sum, stage) => sum + stage.total, 0)

  return (
    <div className="space-y-4">
      {data.map(stage => (
        <div key={stage.stage}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              {stage.stageLabel}
            </span>
            <span className="text-sm text-gray-500">
              {stage.total} ({total > 0 ? Math.round((stage.total / total) * 100) : 0}%)
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${total > 0 ? (stage.total / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface StageTableProps {
  data: StageBreakdown[]
}

function StageTable({ data }: StageTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Stage</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Total</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Approved</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Changes</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Pending</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Approval Rate</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Avg Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map(stage => (
            <tr key={stage.stage} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {stage.stageLabel}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                {formatNumber(stage.total)}
              </td>
              <td className="px-6 py-4 text-sm text-green-600 text-right">
                {formatNumber(stage.approved)}
              </td>
              <td className="px-6 py-4 text-sm text-red-600 text-right">
                {formatNumber(stage.changesRequested)}
              </td>
              <td className="px-6 py-4 text-sm text-amber-600 text-right">
                {formatNumber(stage.pending)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                {formatPercentage(stage.approvalRate)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                {formatHours(stage.avgResponseTimeHours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AnalyticsDashboard
