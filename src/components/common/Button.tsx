/**
 * Button Component
 * Accessible button with variants, loading state, and icons
 * WCAG 2.1 AA compliant - 44px minimum touch target
 */

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

// =============================================================================
// STYLES
// =============================================================================

const baseStyles = `
  inline-flex items-center justify-center
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
`

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-green-600 text-white
    hover:bg-green-700
    focus:ring-green-500
  `,
  secondary: `
    bg-gray-200 text-gray-800
    hover:bg-gray-300
    focus:ring-gray-500
  `,
  danger: `
    bg-red-600 text-white
    hover:bg-red-700
    focus:ring-red-500
  `,
  outline: `
    bg-transparent border-2 border-green-600 text-green-600
    hover:bg-green-50
    focus:ring-green-500
  `,
  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100
    focus:ring-gray-500
  `
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm gap-1.5',
  md: 'min-h-[44px] px-4 py-2 text-base gap-2',
  lg: 'min-h-[52px] px-6 py-3 text-lg gap-2.5'
}

// =============================================================================
// COMPONENT
// =============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      className
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={classes}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 
              className="animate-spin" 
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              aria-hidden="true"
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// =============================================================================
// ICON BUTTON VARIANT
// =============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'min-h-[36px] min-w-[36px] p-1.5',
      md: 'min-h-[44px] min-w-[44px] p-2',
      lg: 'min-h-[52px] min-w-[52px] p-3'
    }

    return (
      <Button
        ref={ref}
        size={size}
        className={`${sizeClasses[size]} ${className}`}
        {...props}
      >
        <span aria-hidden="true">{icon}</span>
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

export default Button
