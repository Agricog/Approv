/**
 * CreateProjectPage
 * Page wrapper for Create Project form with SEO
 * AUTAIMATE BUILD STANDARD v2
 */

import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft } from 'lucide-react'
import CreateProjectForm from '../components/forms/CreateProjectForm'

export default function CreateProjectPage() {
  const navigate = useNavigate()

  return (
    <>
      <Helmet>
        <title>Create New Project | Approv</title>
        <meta name="description" content="Create a new project and start tracking client approvals" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <CreateProjectForm
            onSuccess={(project) => {
              // Redirect to project page after creation
              navigate(`/projects/${project.id}`)
            }}
            onCancel={() => navigate('/projects')}
          />
        </main>
      </div>
    </>
  )
}
