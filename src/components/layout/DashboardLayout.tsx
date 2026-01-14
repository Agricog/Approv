/**
 * DashboardLayout Component
 * Main layout wrapper for dashboard pages
 */

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { Header } from './Header'
import { Sidebar, MobileSidebar } from './Sidebar'
import { Footer } from './Footer'
import { useOfflineBanner } from '../../hooks'

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardLayoutProps {
  children?: React.ReactNode
  companyName?: string
  companyLogo?: string
  pendingApprovals?: number
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DashboardLayout({
  children,
  companyName,
  companyLogo,
  pendingApprovals = 0
}: DashboardLayoutProps) {
  // Get user info from Clerk
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { showOfflineBanner, showReconnectedBanner, dismissReconnected } = useOfflineBanner()

  // Derive user info from Clerk
  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User'
  const userEmail = user?.primaryEmailAddress?.emailAddress || ''

  // Handle sign out
  const handleLogout = () => {
    signOut({ redirectUrl: '/' })
  }

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true')
    }
  }, [])

  // Save sidebar state to localStorage
  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Offline banner */}
      {showOfflineBanner && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
          You're offline. Some features may be unavailable.
        </div>
      )}

      {/* Reconnected banner */}
      {showReconnectedBanner && (
        <div className="bg-green-600 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <span>You're back online!</span>
          <button 
            onClick={dismissReconnected}
            className="underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          <span className="font-bold text-lg text-gray-900">
            {companyName || 'Approv'}
          </span>

          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        pendingApprovals={pendingApprovals}
      />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="hidden lg:block flex-shrink-0">
          <div className="sticky top-0 h-screen">
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onCollapsedChange={handleSidebarCollapse}
              pendingApprovals={pendingApprovals}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop header */}
          <div className="hidden lg:block">
            <Header
              variant="dashboard"
              userName={userName}
              userEmail={userEmail}
              companyName={companyName}
              companyLogo={companyLogo}
              onLogout={handleLogout}
            />
          </div>

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children || <Outlet />}
          </main>

          {/* Footer */}
          <Footer variant="minimal" companyName={companyName} />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {crumb.href ? (
                  <a 
                    href={crumb.href}
                    className="hover:text-gray-700"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-900">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// CONTENT CARD COMPONENT
// =============================================================================

export interface ContentCardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ContentCard({
  title,
  description,
  actions,
  children,
  className = '',
  padding = 'md'
}: ContentCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout
