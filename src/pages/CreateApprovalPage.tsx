/**
 * CreateApprovalPage
 * Page wrapper for Create Approval form with SEO
 * AUTAIMATE BUILD STANDARD v2
 */

import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft } from 'lucide-react'
import CreateApprovalForm from '../components/forms/CreateApprovalForm'
import { useApi } from '../hooks/useApi'
import { useEffect, useState } from 'react'
import type { Project } from '../types/formTypes'

export default function CreateApprovalPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const api = useApi<Project>()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setError('No project ID provided')
      setLoading(false)
      return
    }

    api.execute(`/api/projects/${projectId}`)
      .then(result => {
        if (result) {
          setProject(result)
        } else {
          setError('Project not found')
        }
      })
      .catch(() => {
        setError('Failed to load project')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <>
        <Helmet>
          <title>Project Not Found | Approv</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load project'}</p>
            <button
              onClick={() => navigate('/projects')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Create Approval Request - {project.name} | Approv</title>
        <meta name="description" content={`Create a new approval request for ${project.name}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create Approval Request</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <CreateApprovalForm
            projectId={project.id}
            projectName={project.name}
            onSuccess={(approval) => {
              // Redirect to project page after success
              setTimeout(() => {
                navigate(`/projects/${projectId}`)
              }, 3000)
            }}
            onCancel={() => navigate(`/projects/${projectId}`)}
          />
        </main>
      </div>
    </>
  )
}
