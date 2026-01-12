/**
 * App Component
 * Main application router with all routes
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'

// Pages
import { 
  PortalHome, 
  ProjectDetail,
  DashboardHome, 
  ProjectList, 
  AnalyticsDashboard 
} from './pages'

// Approval components
import { ApprovalPage } from './components/approval'

// Layouts
import { DashboardLayout } from './components/layout'

// Analytics
import { usePageTracking } from './hooks/useAnalytics'

// =============================================================================
// SENTRY WRAPPED ROUTES
// =============================================================================

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)

// =============================================================================
// PAGE TRACKER COMPONENT
// =============================================================================

function PageTracker({ children }: { children: React.ReactNode }) {
  usePageTracking()
  return <>{children}</>
}

// =============================================================================
// PLACEHOLDER PAGES
// =============================================================================

function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Settings page coming soon.</p>
      </div>
    </DashboardLayout>
  )
}

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

            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/projects" element={<ProjectList />} />
            <Route path="/dashboard/projects/:projectId" element={<ProjectList />} />
            <Route path="/dashboard/approvals" element={<ApprovalsPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsDashboard />} />
            <Route path="/dashboard/team" element={<TeamPage />} />
            <Route path="/dashboard/activity" element={<ActivityPage />} />
            <Route path="/dashboard/notifications" element={<ActivityPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />

            {/* Redirects */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </SentryRoutes>
        </main>
      </PageTracker>
    </BrowserRouter>
  )
}
