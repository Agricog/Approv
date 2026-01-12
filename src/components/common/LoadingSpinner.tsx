/**
 * LoadingSpinner Component
 * Accessible loading indicators with various sizes and variants
 */

import { Loader2 } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpinnerVariant = 'primary' | 'secondary' | 'white' | 'current'

export interface LoadingSpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  label?: string
  className?: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const sizeClasses: Record<SpinnerSize, { icon: number; text: string }> = {
  xs: { icon: 14, text: 'text-xs' },
  sm: { icon: 16, text: 'text-sm' },
  md: { icon: 24, text: 'text-base' },
  lg: { icon: 32, text: 'text-lg' },
  xl: { icon: 48, text: 'text-xl' }
}

const variantClasses: Record<SpinnerVariant, string> = {
  primary: 'text-green-600',
  secondary: 'text-gray-600',
  white: 'text-white',
  current: 'text-current'
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label,
  className = ''
}: LoadingSpinnerProps) {
  const sizeConfig = sizeClasses[size]
  const colorClass = variantClasses[variant]

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        size={sizeConfig.icon}
        className={`animate-spin ${colorClass}`}
        aria-hidden="true"
      />
      {label ? (
        <span className={`${sizeConfig.text} ${colorClass}`}>
          {label}
        </span>
      ) : (
        <span className="sr-only">Loading...</span>
      )}
    </div>
  )
}

// =============================================================================
// FULL PAGE LOADING
// =============================================================================

export interface FullPageLoadingProps {
  message?: string
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div 
      className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" variant="primary" />
        <p className="text-lg text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
}

// =============================================================================
// INLINE LOADING
// =============================================================================

export interface InlineLoadingProps {
  size?: SpinnerSize
}

export function InlineLoading({ size = 'sm' }: InlineLoadingProps) {
  return (
    <span className="inline-flex items-center">
      <LoadingSpinner size={size} variant="current" />
    </span>
  )
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

export interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
}

export function LoadingOverlay({
  isLoading,
  message,
  children
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      
      {isLoading && (
        <div 
          className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center rounded-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" variant="primary" />
            {message && (
              <p className="text-sm text-gray-600">{message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SKELETON LOADING
// =============================================================================

export interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md'
}: SkeletonProps) {
  const roundedClasses: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const style: React.CSSProperties = {
    width: width,
    height: height
  }

  return (
    <div
      className={`animate-pulse bg-gray-200 ${roundedClasses[rounded]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

// =============================================================================
// SKELETON PRESETS
// =============================================================================

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="40%" />
          <Skeleton height={12} width="60%" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton height={36} width={100} rounded="lg" />
        <Skeleton height={36} width={80} rounded="lg" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-gray-200">
        <Skeleton height={16} width="20%" />
        <Skeleton height={16} width="30%" />
        <Skeleton height={16} width="25%" />
        <Skeleton height={16} width="15%" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton height={16} width="20%" />
          <Skeleton height={16} width="30%" />
          <Skeleton height={16} width="25%" />
          <Skeleton height={16} width="15%" />
        </div>
      ))}
    </div>
  )
}

export default LoadingSpinner
