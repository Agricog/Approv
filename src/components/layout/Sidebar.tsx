/**
 * Sidebar Component
 * Dashboard sidebar navigation
 */
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FolderKanban, 
  BarChart3, 
  Settings,
  Bell,
  Users,
  UserCircle,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface SidebarProps {
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  pendingApprovals?: number
}

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  badge?: number
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Sidebar({
  isCollapsed = false,
  onCollapsedChange,
  pendingApprovals = 0
}: SidebarProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(isCollapsed)

  const handleCollapse = () => {
    const newValue = !collapsed
    setCollapsed(newValue)
    onCollapsedChange?.(newValue)
  }

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />
    },
    {
      name: 'Projects',
      href: '/dashboard/projects',
      icon: <FolderKanban size={20} />
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: <UserCircle size={20} />
    },
    {
      name: 'Approvals',
      href: '/dashboard/approvals',
      icon: <CheckCircle size={20} />,
      badge: pendingApprovals > 0 ? pendingApprovals : undefined
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart3 size={20} />
    },
    {
      name: 'Team',
      href: '/dashboard/team',
      icon: <Users size={20} />
    },
    {
      name: 'Activity',
      href: '/dashboard/activity',
      icon: <Clock size={20} />
    }
  ]

  const secondaryNavigation: NavItem[] = [
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: <Bell size={20} />
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: <Settings size={20} />
    }
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <aside 
      className={`
        bg-white border-r border-gray-200 flex flex-col h-full
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo area */}
      <div className={`
        flex items-center h-16 px-4 border-b border-gray-200
        ${collapsed ? 'justify-center' : 'justify-between'}
      `}>
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Approv</span>
          </Link>
        )}
        
        {collapsed && (
          <Link to="/dashboard">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={isActive(item.href)}
            isCollapsed={collapsed}
          />
        ))}
      </nav>

      {/* Secondary navigation */}
      <div className="px-2 py-4 border-t border-gray-200 space-y-1">
        {secondaryNavigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={isActive(item.href)}
            isCollapsed={collapsed}
          />
        ))}
      </div>

      {/* Collapse button */}
      <div className="px-2 py-3 border-t border-gray-200">
        <button
          onClick={handleCollapse}
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2
            text-gray-500 hover:text-gray-700 hover:bg-gray-100
            rounded-lg transition-colors
          `}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <>
              <ChevronLeft size={20} />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

// =============================================================================
// NAV LINK COMPONENT
// =============================================================================

interface NavLinkProps {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
}

function NavLink({ item, isActive, isCollapsed }: NavLinkProps) {
  return (
    <Link
      to={item.href}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg
        transition-colors group
        ${isActive 
          ? 'bg-green-50 text-green-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
        ${isCollapsed ? 'justify-center' : ''}
      `}
      title={isCollapsed ? item.name : undefined}
    >
      <span className={isActive ? 'text-green-600' : ''}>
        {item.icon}
      </span>
      
      {!isCollapsed && (
        <span className="font-medium text-sm">{item.name}</span>
      )}

      {/* Badge */}
      {item.badge !== undefined && item.badge > 0 && (
        <span 
          className={`
            absolute bg-red-500 text-white text-xs font-medium rounded-full
            flex items-center justify-center
            ${isCollapsed 
              ? 'top-0 right-0 w-5 h-5' 
              : 'right-2 w-5 h-5'
            }
          `}
        >
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="
          absolute left-full ml-2 px-2 py-1 
          bg-gray-900 text-white text-sm rounded
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-opacity whitespace-nowrap z-50
        ">
          {item.name}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="ml-1 text-red-300">({item.badge})</span>
          )}
        </div>
      )}
    </Link>
  )
}

// =============================================================================
// MOBILE SIDEBAR
// =============================================================================

export interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  pendingApprovals?: number
}

export function MobileSidebar({
  isOpen,
  onClose,
  pendingApprovals = 0
}: MobileSidebarProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
        <div className="w-64 h-full">
          <Sidebar pendingApprovals={pendingApprovals} />
        </div>
      </div>
    </>
  )
}

export default Sidebar
