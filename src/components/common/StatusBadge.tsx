/**
 * StatusBadge Component
 * Displays approval and project status with consistent styling
 * Accessible with proper color contrast ratios
 */

import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Loader2,
  Pause,
  Ban
} from 'lucide-react'
import type { ApprovalStatus, ProjectStatus } from '../../types'

// =============================================================================
// TYPES
// =============================================================================

export type BadgeVariant = 'pending' | 'approved' | 'changes' | 'expired' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'info' | 'warning' | 'error' | 'success'
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface StatusBadgeProps {
  status: BadgeVariant | ApprovalStatus | ProjectStatus
  label?: string
  size?: BadgeSize
  showIcon?: boolean
  className?: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

interface BadgeConfig {
  label: string
  icon: React.ReactNode
  bgClass: string
  textClass: string
  borderClass: string
}

const badgeConfigs: Record<string, BadgeConfig> = {
  // Approval statuses
  pending: {
    label: 'Awaiting Approval',
    icon: <Clock size={14} />,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200'
  },
  approved: {
    label: 'Approved',
    icon: <CheckCircle size={14} />,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200'
  },
  changes_requested: {
    label: 'Changes Requested',
    icon: <AlertCircle size={14} />,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  },
  changes: {
    label: 'Changes Requested',
    icon: <AlertCircle size={14} />,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  },
  expired: {
    label: 'Expired',
    icon: <XCircle size={14} />,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
    borderClass: 'border-gray-200'
  },

  // Project statuses
  active: {
    label: 'Active',
    icon: <Loader2 size={14} className="animate-spin" />,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200'
  },
  on_hold: {
    label: 'On Hold',
    icon: <Pause size={14} />,
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-200'
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle size={14} />,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200'
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Ban size={14} />,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
    borderClass: 'border-gray-200'
  },

  // Generic variants
  info: {
    label: 'Info',
    icon: <AlertCircle size={14} />,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200'
  },
  warning: {
    label: 'Warning',
    icon: <AlertCircle size={14} />,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200'
  },
  error: {
    label: 'Error',
    icon: <XCircle size={14} />,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  },
  success: {
    label: 'Success',
    icon: <CheckCircle size={14} />,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200'
  }
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2'
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true,
  className = ''
}: StatusBadgeProps) {
  const config = badgeConfigs[status] || badgeConfigs.info
  const displayLabel = label || config.label

  const classes = [
    'inline-flex items-center font-medium rounded-full border',
    config.bgClass,
    config.textClass,
    config.borderClass,
    sizeClasses[size],
    className
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (
    <span className={classes} role="status">
      {showIcon && (
        <span aria-hidden="true" className="flex-shrink-0">
          {config.icon}
        </span>
      )}
      <span>{displayLabel}</span>
    </span>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * ApprovalStatusBadge - Type-safe approval status badge
 */
export interface ApprovalStatusBadgeProps {
  status: ApprovalStatus
  size?: BadgeSize
  showIcon?: boolean
  className?: string
}

export function ApprovalStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}: ApprovalStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      size={size}
      showIcon={showIcon}
      className={className}
    />
  )
}

/**
 * ProjectStatusBadge - Type-safe project status badge
 */
export interface ProjectStatusBadgeProps {
  status: ProjectStatus
  size?: BadgeSize
  showIcon?: boolean
  className?: string
}

export function ProjectStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}: ProjectStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      size={size}
      showIcon={showIcon}
      className={className}
    />
  )
}

// =============================================================================
// URGENCY BADGE
// =============================================================================

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'

export interface UrgencyBadgeProps {
  urgency: UrgencyLevel
  daysPending?: number
  size?: BadgeSize
  className?: string
}

const urgencyConfigs: Record<UrgencyLevel, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  low: {
    label: 'Low',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
    borderClass: 'border-gray-200'
  },
  medium: {
    label: 'Medium',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-200'
  },
  high: {
    label: 'High',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200'
  },
  critical: {
    label: 'Critical',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  }
}

export function UrgencyBadge({
  urgency,
  daysPending,
  size = 'md',
  className = ''
}: UrgencyBadgeProps) {
  const config = urgencyConfigs[urgency]
  const label = daysPending !== undefined 
    ? `${config.label} (${daysPending}d)`
    : config.label

  const classes = [
    'inline-flex items-center font-medium rounded-full border',
    config.bgClass,
    config.textClass,
    config.borderClass,
    sizeClasses[size],
    className
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (
    <span className={classes} role="status">
      {label}
    </span>
  )
}

export default StatusBadge
