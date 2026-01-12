/**
 * Common Components Index
 * Barrel export for all common/shared components
 */

// Button components
export { Button, IconButton } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps } from './Button'

// Input components
export { Input, PasswordInput, Textarea } from './Input'
export type { InputProps, TextareaProps } from './Input'

// Status badge components
export { 
  StatusBadge, 
  ApprovalStatusBadge, 
  ProjectStatusBadge,
  UrgencyBadge 
} from './StatusBadge'
export type { 
  StatusBadgeProps, 
  BadgeVariant, 
  BadgeSize,
  ApprovalStatusBadgeProps,
  ProjectStatusBadgeProps,
  UrgencyBadgeProps,
  UrgencyLevel
} from './StatusBadge'

// Loading components
export { 
  LoadingSpinner, 
  FullPageLoading, 
  InlineLoading,
  LoadingOverlay,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable
} from './LoadingSpinner'
export type { 
  LoadingSpinnerProps, 
  SpinnerSize, 
  SpinnerVariant,
  FullPageLoadingProps,
  LoadingOverlayProps,
  SkeletonProps
} from './LoadingSpinner'

// Error and alert components
export { 
  ErrorMessage, 
  ErrorText,
  FullPageError,
  InlineError,
  EmptyState,
  Toast
} from './ErrorMessage'
export type { 
  ErrorMessageProps, 
  AlertVariant,
  ErrorTextProps,
  FullPageErrorProps,
  InlineErrorProps,
  EmptyStateProps,
  ToastProps
} from './ErrorMessage'
