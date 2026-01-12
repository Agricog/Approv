/**
 * Header Component
 * Main navigation header for dashboard and portal
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Bell, 
  Settings, 
  LogOut,
  User,
  ChevronDown,
  CheckCircle
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface HeaderProps {
  variant?: 'dashboard' | 'portal'
  userName?: string
  userEmail?: string
  companyName?: string
  companyLogo?: string
  notificationCount?: number
  onLogout?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Header({
  variant = 'dashboard',
  userName,
  userEmail,
  companyName = 'Approv',
  companyLogo,
  notificationCount = 0,
  onLogout
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const location = useLocation()

  const isDashboard = variant === 'dashboard'

  const navigation = isDashboard
    ? [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Projects', href: '/dashboard/projects' },
        { name: 'Analytics', href: '/dashboard/analytics' },
        { name: 'Settings', href: '/dashboard/settings' }
      ]
    : [
        { name: 'My Projects', href: '/portal' }
      ]

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/portal') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link 
              to={isDashboard ? '/dashboard' : '/portal'} 
              className="flex items-center gap-2"
            >
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt={companyName} 
                  className="h-8 w-auto"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-xl text-gray-900">
                    {companyName}
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications (dashboard only) */}
            {isDashboard && (
              <button
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            )}

            {/* User menu */}
            {userName && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User size={16} className="text-green-700" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium">
                    {userName}
                  </span>
                  <ChevronDown size={16} className="hidden sm:block" />
                </button>

                {/* User dropdown */}
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{userName}</p>
                        {userEmail && (
                          <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                        )}
                      </div>

                      {isDashboard && (
                        <Link
                          to="/dashboard/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings size={16} />
                          Settings
                        </Link>
                      )}

                      {onLogout && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            onLogout()
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                        >
                          <LogOut size={16} />
                          Sign out
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 rounded-lg text-base font-medium ${
                    isActive(item.href)
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header
