/**
 * App Component
 * Main application router with all routes
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'

// Pages
import { 
  PortalHome, 
  ProjectDetail,
  DashboardHome, 
  ProjectList, 
  AnalyticsDashboard,
  Settings
} from './pages'

// New Pages
import ProjectsPage from './pages/ProjectsPage'
import CreateProjectPage from './pages/CreateProjectPage'
import CreateApprovalPage from './pages/CreateApprovalPage'

// Approval components
import { ApprovalPage } from './components/approval'

// Layouts
import { DashboardLayout } from './components/layout'

// Analytics
import { usePageTracking } from './hooks/useAnalytics'

// API
import { setAuthTokenGetter } from './services/api'

// =============================================================================
// SENTRY WRAPPED ROUTES
// =============================================================================

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)

// =============================================================================
// AUTH TOKEN PROVIDER
// =============================================================================

function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  
  useEffect(() => {
    setAuthTokenGetter(getToken)
  }, [getToken])
  
  return <>{children}</>
}

// =============================================================================
// PAGE TRACKER COMPONENT
// =============================================================================

function PageTracker({ children }: { children: React.ReactNode }) {
  usePageTracking()
  return <>{children}</>
}

// =============================================================================
// PROTECTED ROUTE WRAPPER
// =============================================================================

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Sign in to Approv</h1>
              <p className="text-gray-600 mt-1">Access your approval dashboard</p>
            </div>
            <SignIn routing="hash" />
          </div>
        </div>
      </SignedOut>
    </>
  )
}

// =============================================================================
// PLACEHOLDER PAGES
// =============================================================================

function TeamPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Team</h1>
        <p className="text-gray-600">Team management coming soon.</p>
      </div>
    </DashboardLayout>
  )
}

function ActivityPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Activity</h1>
        <p className="text-gray-600">Activity log coming soon.</p>
      </div>
    </DashboardLayout>
  )
}

function ApprovalsPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Approvals</h1>
        <p className="text-gray-600">Approvals management coming soon.</p>
      </div>
    </DashboardLayout>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
        <a 
          href="/"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Approv
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Professional client approval workflows for architecture and design practices. 
          Get project sign-offs faster.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </a>
          <a 
            href="/portal"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-green-600 font-medium rounded-lg border-2 border-green-600 hover:bg-green-50 transition-colors"
          >
            Client Portal
          </a>
        </div>

        <p className="mt-12 text-sm text-gray-500">
          © {new Date().getFullYear()} Approv. Part of the Autaimate family.
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN APP
// =============================================================================

export default function App() {
  return (
    <BrowserRouter>
      {/* Skip navigation link for accessibility */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      
      <AuthTokenProvider>
        <PageTracker>
          <main id="main-content">
            <SentryRoutes>
              {/* Home */}
              <Route path="/" element={<HomePage />} />

              {/* Approval flow (public, token-based) */}
              <Route path="/approve/:token" element={<ApprovalPage />} />
              <Route path="/approve/:token/confirmed" element={<ApprovalPage />} />
              <Route path="/approve/:token/changes" element={<ApprovalPage />} />

              {/* Client portal */}
              <Route path="/portal" element={<PortalHome />} />
              <Route path="/portal/project/:projectId" element={<ProjectDetail />} />

              {/* Projects - New routes for create forms */}
              <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
              <Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
              <Route path="/projects/:projectId/approvals/new" element={<ProtectedRoute><CreateApprovalPage /></ProtectedRoute>} />

              {/* Dashboard (protected) */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
              <Route path="/dashboard/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
              <Route path="/dashboard/projects/:projectId" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
              <Route path="/dashboard/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
              <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
              <Route path="/dashboard/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
              <Route path="/dashboard/notifications" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/settings/dropbox/callback" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/settings/monday/callback" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* Redirects */}
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </SentryRoutes>
          </main>
        </PageTracker>
      </AuthTokenProvider>
    </BrowserRouter>
  )
}
