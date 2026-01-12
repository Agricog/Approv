/**
 * Input Component
 * Accessible form input with validation, labels, and error states
 * WCAG 2.1 AA compliant - 44px minimum touch target
 */

import { forwardRef, useId } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

// =============================================================================
// STYLES
// =============================================================================

const baseInputStyles = `
  w-full rounded-lg border
  transition-colors duration-200
  placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:border-transparent
  disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
`

const sizeStyles = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm',
  md: 'min-h-[44px] px-3 py-2 text-base',
  lg: 'min-h-[52px] px-4 py-3 text-lg'
}

const stateStyles = {
  default: 'border-gray-300 focus:ring-green-500',
  error: 'border-red-500 focus:ring-red-500'
}

// =============================================================================
// COMPONENT
// =============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      className = '',
      id: providedId,
      type = 'text',
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    const hasError = !!error
    const hasLeftIcon = !!leftIcon
    const hasRightIcon = !!rightIcon

    const inputClasses = [
      baseInputStyles,
      sizeStyles[size],
      hasError ? stateStyles.error : stateStyles.default,
      hasLeftIcon ? 'pl-10' : '',
      hasRightIcon ? 'pr-10' : '',
      fullWidth ? 'w-full' : '',
      className
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    const describedBy = [
      hasError ? errorId : null,
      hint ? hintId : null
    ]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {hint && !hasError && (
          <p id={hintId} className="text-sm text-gray-500 mb-1">
            {hint}
          </p>
        )}

        <div className="relative">
          {hasLeftIcon && (
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            required={required}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            {...props}
          />

          {hasRightIcon && (
            <div 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>

        {hasError && (
          <p
            id={errorId}
            className="flex items-center gap-1 text-sm text-red-600 mt-1"
            role="alert"
          >
            <AlertCircle size={16} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// =============================================================================
// PASSWORD INPUT VARIANT
// =============================================================================

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const toggleVisibility = () => {
      setShowPassword(prev => !prev)
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-3"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

// =============================================================================
// TEXTAREA VARIANT
// =============================================================================

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      fullWidth = true,
      className = '',
      id: providedId,
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    const hasError = !!error

    const textareaClasses = [
      baseInputStyles,
      sizeStyles[size],
      hasError ? stateStyles.error : stateStyles.default,
      fullWidth ? 'w-full' : '',
      'resize-y',
      className
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    const describedBy = [
      hasError ? errorId : null,
      hint ? hintId : null
    ]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {hint && !hasError && (
          <p id={hintId} className="text-sm text-gray-500 mb-1">
            {hint}
          </p>
        )}

        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          rows={rows}
          className={textareaClasses}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          {...props}
        />

        {hasError && (
          <p
            id={errorId}
            className="flex items-center gap-1 text-sm text-red-600 mt-1"
            role="alert"
          >
            <AlertCircle size={16} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Input
