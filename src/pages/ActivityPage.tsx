/**
 * ActivityPage Component
 * Shows audit log of all actions
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Activity, 
  User, 
  FileText, 
  Users, 
  CheckCircle,
  Send,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Filter
} from 'lucide-react'
import { useApi } from '../hooks/useApi'

interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: any
  createdAt: string
  user: {
    name: string
    email: string
  } | null
  project: {
    name: string
    reference: string
  } | null
}

interface ActivityResponse {
  items: ActivityLog[]
  total: number
  page: number
  totalPages: number
}

export default function ActivityPage() {
  const navigate = useNavigate()
  const api = useApi<ActivityResponse>()
  
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadActivity()
  }, [filter])

  const loadActivity = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? '?entityType=' + filter : ''
      const result = await api.execute('/api/activity' + params)
if (result?.data?.items) {
  setActivities(result.data.items)
  setTotal(result.data.total)
}
    } catch (err) {
      console.error('Failed to load activity:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <Send className="w-4 h-4 text-green-600" />
    if (action.includes('updated')) return <Edit className="w-4 h-4 text-blue-600" />
    if (action.includes('deleted')) return <Trash2 className="w-4 h-4 text-red-600" />
    if (action.includes('viewed')) return <Eye className="w-4 h-4 text-purple-600" />
    if (action.includes('approved') || action.includes('responded')) return <CheckCircle className="w-4 h-4 text-green-600" />
    return <Activity className="w-4 h-4 text-gray-600" />
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'project': return <FileText className="w-4 h-4" />
      case 'client': return <Users className="w-4 h-4" />
      case 'approval': return <CheckCircle className="w-4 h-4" />
      case 'user': return <User className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatAction = (action: string): string => {
    const parts = action.split('.')
    if (parts.length === 2) {
      const entity = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      const verb = parts[1].replace(/_/g, ' ')
      return entity + ' ' + verb
    }
    return action.replace(/[._]/g, ' ')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return diffMins + ' min ago'
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago'
    if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago'
    
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionColor = (action: string): string => {
    if (action.includes('created')) return 'bg-green-50 border-green-200'
    if (action.includes('updated')) return 'bg-blue-50 border-blue-200'
    if (action.includes('deleted')) return 'bg-red-50 border-red-200'
    if (action.includes('approved')) return 'bg-green-50 border-green-200'
    if (action.includes('changes_requested')) return 'bg-amber-50 border-amber-200'
    if (action.includes('viewed')) return 'bg-purple-50 border-purple-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-gray-600 mt-1">Track all actions and changes</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Activity</option>
            <option value="project">Projects</option>
            <option value="client">Clients</option>
            <option value="approval">Approvals</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
          <p className="text-gray-500">Actions will appear here as you use Approv</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={'bg-white rounded-lg border p-4 ' + getActionColor(activity.action)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                  {getActionIcon(activity.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {formatAction(activity.action)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {getEntityIcon(activity.entityType)}
                      {activity.entityType}
                    </span>
                  </div>
                  
                  <div className="mt-1 text-sm text-gray-600">
                    {activity.user && (
                      <span>By {activity.user.name}</span>
                    )}
                    {activity.project && (
                      <span className="ml-2">
                        • Project: {activity.project.name} ({activity.project.reference})
                      </span>
                    )}
                  </div>

                  {activity.metadata && typeof activity.metadata === 'object' && (
                    <div className="mt-2 text-xs text-gray-500">
                      {activity.metadata.stage && (
                        <span className="mr-3">Stage: {activity.metadata.stage}</span>
                      )}
                      {activity.metadata.status && (
                        <span className="mr-3">Status: {activity.metadata.status}</span>
                      )}
                      {activity.metadata.deletedCount !== undefined && (
                        <span>Deleted: {activity.metadata.deletedCount} items</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {formatDateTime(activity.createdAt)}
                </div>
              </div>
            </div>
          ))}
          
          <div className="text-center text-sm text-gray-500 py-4">
            Showing {activities.length} of {total} activities
          </div>
        </div>
      )}
    </div>
  )
}
