/**
 * PortalLayout Component
 * Layout wrapper for client portal pages
 */

import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { SimpleFooter } from './Footer'
import { useOfflineBanner } from '../../hooks'

// =============================================================================
// TYPES
// =============================================================================

export interface PortalLayoutProps {
  children?: React.ReactNode
  clientName?: string
  clientEmail?: string
  companyName?: string
  companyLogo?: string
  onLogout?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PortalLayout({
  children,
  clientName,
  clientEmail,
  companyName,
  companyLogo,
  onLogout
}: PortalLayoutProps) {
  const { showOfflineBanner, showReconnectedBanner, dismissReconnected } = useOfflineBanner()

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

      {/* Header */}
      <Header
        variant="portal"
        userName={clientName}
        userEmail={clientEmail}
        companyName={companyName}
        companyLogo={companyLogo}
        onLogout={onLogout}
      />

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children || <Outlet />}
        </div>
      </main>

      {/* Footer */}
      <SimpleFooter className="border-t border-gray-200 bg-white" />
    </div>
  )
}

// =============================================================================
// PORTAL PAGE HEADER
// =============================================================================

export interface PortalPageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PortalPageHeader({
  title,
  subtitle,
  actions
}: PortalPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
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
// PORTAL CARD
// =============================================================================

export interface PortalCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  href?: string
  hoverable?: boolean
}

export function PortalCard({
  children,
  className = '',
  onClick,
  href,
  hoverable = false
}: PortalCardProps) {
  const baseClasses = `
    bg-white rounded-lg border border-gray-200 p-6
    ${hoverable ? 'hover:border-green-300 hover:shadow-md transition-all cursor-pointer' : ''}
    ${className}
  `

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {children}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} text-left w-full`}>
        {children}
      </button>
    )
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  )
}

// =============================================================================
// PORTAL EMPTY STATE
// =============================================================================

export interface PortalEmptyStateProps {
  icon?: React.ReactNode
  title: string
  message: string
}

export function PortalEmptyState({
  icon,
  title,
  message
}: PortalEmptyStateProps) {
  return (
    <div className="text-center py-16">
      {icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mx-auto">{message}</p>
    </div>
  )
}

// =============================================================================
// WELCOME BANNER
// =============================================================================

export interface WelcomeBannerProps {
  clientName?: string
  pendingCount?: number
  onViewPending?: () => void
}

export function WelcomeBanner({
  clientName,
  pendingCount = 0,
  onViewPending
}: WelcomeBannerProps) {
  return (
    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white mb-8">
      <h2 className="text-xl font-semibold mb-2">
        Welcome back{clientName ? `, ${clientName}` : ''}!
      </h2>
      
      {pendingCount > 0 ? (
        <p className="text-green-100">
          You have <strong>{pendingCount}</strong> {pendingCount === 1 ? 'approval' : 'approvals'} awaiting your response.
        </p>
      ) : (
        <p className="text-green-100">
          You're all caught up! No pending approvals at the moment.
        </p>
      )}

      {pendingCount > 0 && onViewPending && (
        <button
          onClick={onViewPending}
          className="mt-4 inline-flex items-center px-4 py-2 bg-white text-green-700 font-medium rounded-lg hover:bg-green-50 transition-colors"
        >
          View Pending Approvals
        </button>
      )}
    </div>
  )
}

export default PortalLayout
