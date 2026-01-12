/**
 * ErrorMessage Component
 * Accessible error and alert displays with various variants
 */

import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X,
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'
import { Button } from './Button'

// =============================================================================
// TYPES
// =============================================================================

export type AlertVariant = 'error' | 'warning' | 'success' | 'info'

export interface ErrorMessageProps {
  message: string
  title?: string
  variant?: AlertVariant
  onRetry?: () => void
  onDismiss?: () => void
  dismissible?: boolean
  className?: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

interface AlertConfig {
  icon: React.ReactNode
  bgClass: string
  borderClass: string
  textClass: string
  iconClass: string
  titleClass: string
}

const alertConfigs: Record<AlertVariant, AlertConfig> = {
  error: {
    icon: <AlertCircle size={20} />,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-700',
    iconClass: 'text-red-500',
    titleClass: 'text-red-800'
  },
  warning: {
    icon: <AlertTriangle size={20} />,
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-800'
  },
  success: {
    icon: <CheckCircle size={20} />,
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-700',
    iconClass: 'text-green-500',
    titleClass: 'text-green-800'
  },
  info: {
    icon: <Info size={20} />,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-700',
    iconClass: 'text-blue-500',
    titleClass: 'text-blue-800'
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ErrorMessage({
  message,
  title,
  variant = 'error',
  onRetry,
  onDismiss,
  dismissible = false,
  className = ''
}: ErrorMessageProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const config = alertConfigs[variant]

  if (isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      className={`
        rounded-lg border p-4
        ${config.bgClass} ${config.borderClass}
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconClass}`} aria-hidden="true">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold mb-1 ${config.titleClass}`}>
              {title}
            </h3>
          )}
          <p className={config.textClass}>{message}</p>

          {/* Actions */}
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw size={16} />}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 p-1 rounded-lg
              hover:bg-black/5 transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2
              min-w-[44px] min-h-[44px] flex items-center justify-center -m-2
              ${config.iconClass}
            `}
            aria-label="Dismiss message"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// SIMPLE ERROR TEXT
// =============================================================================

export interface ErrorTextProps {
  error: string | null | undefined
  className?: string
}

export function ErrorText({ error, className = '' }: ErrorTextProps) {
  if (!error) return null

  return (
    <p 
      className={`flex items-center gap-1 text-sm text-red-600 ${className}`}
      role="alert"
    >
      <AlertCircle size={16} aria-hidden="true" />
      {error}
    </p>
  )
}

// =============================================================================
// FULL PAGE ERROR
// =============================================================================

export interface FullPageErrorProps {
  title?: string
  message: string
  onRetry?: () => void
  onGoHome?: () => void
}

export function FullPageError({
  title = 'Something went wrong',
  message,
  onRetry,
  onGoHome
}: FullPageErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button
              variant="primary"
              onClick={onRetry}
              leftIcon={<RefreshCw size={18} />}
            >
              Try Again
            </Button>
          )}
          
          {onGoHome && (
            <Button
              variant="secondary"
              onClick={onGoHome}
            >
              Go Home
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// INLINE ERROR
// =============================================================================

export interface InlineErrorProps {
  error: string | null | undefined
  onRetry?: () => void
  className?: string
}

export function InlineError({ error, onRetry, className = '' }: InlineErrorProps) {
  if (!error) return null

  return (
    <div 
      className={`flex items-center gap-2 text-red-600 ${className}`}
      role="alert"
    >
      <AlertCircle size={16} aria-hidden="true" className="flex-shrink-0" />
      <span className="text-sm">{error}</span>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {title}
      </h3>
      
      {message && (
        <p className="text-gray-500 mb-4 max-w-sm mx-auto">
          {message}
        </p>
      )}
      
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// TOAST NOTIFICATION (Simple)
// =============================================================================

export interface ToastProps {
  message: string
  variant?: AlertVariant
  isVisible: boolean
  onDismiss: () => void
}

export function Toast({
  message,
  variant = 'info',
  isVisible,
  onDismiss
}: ToastProps) {
  const config = alertConfigs[variant]

  if (!isVisible) return null

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        max-w-sm w-full
        rounded-lg border shadow-lg p-4
        animate-slide-up
        ${config.bgClass} ${config.borderClass}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={config.iconClass} aria-hidden="true">
          {config.icon}
        </div>
        
        <p className={`flex-1 ${config.textClass}`}>
          {message}
        </p>
        
        <button
          onClick={onDismiss}
          className={`
            flex-shrink-0 p-1 rounded
            hover:bg-black/5 transition-colors
            min-w-[44px] min-h-[44px] flex items-center justify-center -m-2
            ${config.iconClass}
          `}
          aria-label="Dismiss"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default ErrorMessage
