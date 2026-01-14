/**
 * Form Validation Utilities
 * OWASP-compliant input validation for forms
 * AUTAIMATE BUILD STANDARD v2
 */

import DOMPurify from 'dompurify'

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  sanitized: Record<string, any>
}

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export type ValidationSchema = Record<string, ValidationRule>

// =============================================================================
// SANITIZATION
// =============================================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim()
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string): string {
  const sanitized = sanitizeString(url)
  
  // Only allow http/https protocols
  if (!/^https?:\/\//i.test(sanitized)) {
    return ''
  }
  
  try {
    const urlObj = new URL(sanitized)
    // Block dangerous protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return ''
    }
    return sanitized
  } catch {
    return ''
  }
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: string | number): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input
  return isNaN(num) ? null : num
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate single field
 */
export function validateField(
  fieldName: string,
  value: any,
  rule: ValidationRule
): string | null {
  // Required check
  if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return `${fieldName} is required`
  }

  // Skip other validations if field is empty and not required
  if (!value && !rule.required) {
    return null
  }

  const stringValue = String(value)

  // Min length
  if (rule.minLength && stringValue.length < rule.minLength) {
    return `${fieldName} must be at least ${rule.minLength} characters`
  }

  // Max length
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return `${fieldName} must be no more than ${rule.maxLength} characters`
  }

  // Pattern matching
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    return `${fieldName} format is invalid`
  }

  // Custom validation
  if (rule.custom) {
    return rule.custom(value)
  }

  return null
}

/**
 * Validate entire form
 */
export function validateForm(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {}
  const sanitized: Record<string, any> = {}

  for (const [fieldName, rule] of Object.entries(schema)) {
    const value = data[fieldName]

    // Validate field
    const error = validateField(fieldName, value, rule)
    if (error) {
      errors[fieldName] = error
    }

    // Sanitize field
    if (typeof value === 'string') {
      sanitized[fieldName] = sanitizeString(value)
    } else {
      sanitized[fieldName] = value
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  }
}

// =============================================================================
// COMMON VALIDATION PATTERNS
// =============================================================================

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/i,
  phone: /^[\d\s\-\+\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_]+$/
} as const

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

export const PROJECT_VALIDATION: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: VALIDATION_PATTERNS.noSpecialChars
  },
  reference: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.alphanumeric
  },
  clientId: {
    required: true
  }
}

export const APPROVAL_VALIDATION: ValidationSchema = {
  projectId: {
    required: true
  },
  stage: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  stageLabel: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  deliverableUrl: {
    required: false,
    maxLength: 500,
    custom: (value) => {
      if (!value) return null
      const sanitized = sanitizeUrl(value)
      if (!sanitized) return 'Invalid URL format'
      return null
    }
  },
  deliverableName: {
    required: false,
    maxLength: 100
  },
  expiryDays: {
    required: false,
    custom: (value) => {
      if (!value) return null
      const num = sanitizeNumber(value)
      if (num === null || num < 1 || num > 90) {
        return 'Expiry days must be between 1 and 90'
      }
      return null
    }
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export { ValidationRule, ValidationSchema }
