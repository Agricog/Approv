/**
 * ClientDetailPage Component
 * Shows client details and their projects
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  MapPin,
  FolderKanban,
  Plus,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { useApi } from '../hooks/useApi'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
  reference: string
  status: string
  createdAt: string
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const clientApi = useApi<Client>()
  const projectsApi = useApi<{ items: Project[] }>()
  
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClient()
  }, [clientId])

  const loadClient = async () => {
    if (!clientId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const clientData = await clientApi.execute('/api/clients/' + clientId)
      if (clientData) {
        setClient(clientData)
        
        // Load projects for this client
        const projectsData = await projectsApi.execute('/api/projects?clientId=' + clientId)
        if (projectsData?.items) {
          setProjects(projectsData.items)
        }
      } else {
        setError('Client not found')
      }
    } catch (err) {
      setError('Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!client) return
    
    const confirmed = window.confirm(
      'Are you sure you want to delete ' + client.firstName + ' ' + client.lastName + '? This cannot be undone.'
    )
    
    if (!confirmed) return
    
    try {
      const result = await clientApi.execute('/api/clients/' + clientId, {
        method: 'DELETE'
      })
      
      if (result) {
        navigate('/dashboard/clients')
      }
    } catch (err) {
      setError('Failed to delete client')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on_hold': return 'bg-amber-100 text-amber-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/dashboard/clients')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">
            {error || 'Client not found'}
          </h3>
          <p className="text-red-600">
            The client you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/dashboard/clients')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {client.firstName} {client.lastName}
          </h1>
          {client.company && (
            <p className="text-gray-600 mt-1">{client.company}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <Link
            to={'/dashboard/projects/new?clientId=' + clientId}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <a 
                href={'mailto:' + client.email}
                className="text-green-600 hover:underline"
              >
                {client.email}
              </a>
            </div>
            
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a 
                  href={'tel:' + client.phone}
                  className="text-gray-900 hover:text-green-600"
                >
                  {client.phone}
                </a>
              </div>
            )}
            
            {client.company && (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{client.company}</span>
              </div>
            )}
            
            {client.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <span className="text-gray-900">{client.address}</span>
              </div>
            )}
          </div>
          
          {client.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-600 text-sm">{client.notes}</p>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
            Client since {formatDate(client.createdAt)}
          </div>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <span className="text-sm text-gray-500">{projects.length} total</span>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-4">Create a project to start working with this client</p>
              <Link
                to={'/dashboard/projects/new?clientId=' + clientId}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <Link
                  key={project.id}
                  to={'/dashboard/projects/' + project.id}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.reference}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={'px-2 py-1 text-xs font-medium rounded-full ' + getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
