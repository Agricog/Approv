import { BrowserRouter, Routes, Route } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { CheckCircle } from 'lucide-react'

// =============================================================================
// PLACEHOLDER COMPONENTS - Will be replaced in subsequent batches
// =============================================================================

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Approv</h1>
        <p className="text-gray-600">Client approvals made simple</p>
        <p className="text-sm text-gray-400 mt-4">Build in progress...</p>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl" role="img" aria-label="Search">🔍</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a 
          href="/" 
          className="btn-primary inline-block"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}

// =============================================================================
// SENTRY ROUTING WRAPPER
// =============================================================================

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export default function App() {
  return (
    <BrowserRouter>
      {/* Skip navigation link for accessibility */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      
      <main id="main-content">
        <SentryRoutes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          
          {/* Client approval routes */}
          <Route path="/approve/:token" element={<Home />} />
          <Route path="/approve/:token/confirmed" element={<Home />} />
          <Route path="/approve/:token/changes" element={<Home />} />
          
          {/* Client portal routes */}
          <Route path="/portal" element={<Home />} />
          <Route path="/portal/project/:projectId" element={<Home />} />
          
          {/* Team dashboard routes */}
          <Route path="/dashboard" element={<Home />} />
          <Route path="/dashboard/analytics" element={<Home />} />
          <Route path="/dashboard/projects" element={<Home />} />
          <Route path="/dashboard/settings" element={<Home />} />
          
          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </SentryRoutes>
      </main>
    </BrowserRouter>
  )
}
