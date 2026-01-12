/**
 * Layout Components Index
 * Barrel export for layout components
 */

// Header
export { Header } from './Header'
export type { HeaderProps } from './Header'

// Footer
export { Footer, SimpleFooter } from './Footer'
export type { FooterProps, SimpleFooterProps } from './Footer'

// Sidebar
export { Sidebar, MobileSidebar } from './Sidebar'
export type { SidebarProps, MobileSidebarProps } from './Sidebar'

// Dashboard layout
export { DashboardLayout, PageHeader, ContentCard } from './DashboardLayout'
export type { 
  DashboardLayoutProps, 
  PageHeaderProps, 
  ContentCardProps 
} from './DashboardLayout'

// Portal layout
export { 
  PortalLayout, 
  PortalPageHeader, 
  PortalCard, 
  PortalEmptyState,
  WelcomeBanner 
} from './PortalLayout'
export type { 
  PortalLayoutProps, 
  PortalPageHeaderProps, 
  PortalCardProps,
  PortalEmptyStateProps,
  WelcomeBannerProps
} from './PortalLayout'
