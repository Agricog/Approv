/**
 * ClientsPage Component
 * List and manage clients
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, UserCircle, Mail, Building2, Phone, MoreVertical, Loader2, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useApi } from '../hooks/useApi'

// =============================================================================
// TYPES
// =============================================================================

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  createdAt: string
  _count?: {
    projects: number
    approvals: number
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ClientsPage() {
  const navigate = useNavigate()
  const api = useApi<Client[]>()
  const deleteApi = useApi<{ deleted: number }>()
  
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const result = await api.execute('/api/clients')
      if (result && typeof result === 'object' && 'items' in result) {
        setClients((result as { items: Client[] }).items)
      } else if (Array.isArray(result)) {
        setClients(result)
      }
    } catch (err) {
      console.error('Failed to load clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAllClients = async () => {
    setDeleting(true)
    try {
      await deleteApi.execute('/api/clients/delete-all', {
        method: 'DELETE'
      })
      setClients([])
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Failed to delete clients:', err)
    } finally {
      setDeleting(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase()
    return (
      client.firstName.toLowerCase().includes(query) ||
      client.lastName.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.company && client.company.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage your client contacts</p>
        </div>
        <div className="flex items-center gap-3">
          {clients.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-medium"
            >
              <Trash2 size={20} />
              Delete All
            </button>
          )}
          <Link
            to="/dashboard/clients/new"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
          >
            <Plus size={20} />
            Add Client
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Clients List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery 
              ? 'Try adjusting your search query'
              : 'Add your first client to get started'
            }
          </p>
          {!searchQuery && (
            <Link
              to="/dashboard/clients/new"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              <Plus size={20} />
              Add Client
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-700 font-medium">
                            {client.firstName[0]}{client.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <Link 
                            to={'/dashboard/clients/' + client.id}
                            className="font-medium text-gray-900 hover:text-green-600"
                          >
                            {client.firstName} {client.lastName}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} />
                          <a href={'mailto:' + client.email} className="hover:text-green-600">
                            {client.email}
                          </a>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} />
                            <a href={'tel:' + client.phone} className="hover:text-green-600">
                              {client.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {client.company ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 size={14} />
                          {client.company}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {client._count?.projects || 0} projects
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={'/dashboard/clients/' + client.id}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical size={20} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete All Clients</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all {clients.length} clients? This will also remove them from any associated projects.
            </p>
            
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllClients}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
