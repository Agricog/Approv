/**
 * Input Validation
 * OWASP compliant input validation and sanitization
 * NEVER trust user input - always validate AND sanitize
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  sanitized: string
}

export type InputType = 'email' | 'number' | 'text' | 'currency' | 'phone' | 'url' | 'token'

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s+()-]{10,20}$/,
  currency: /^\d+(\.\d{1,2})?$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  token: /^[a-zA-Z0-9_-]{20,64}$/,
  // Dangerous patterns to reject
  sqlInjection: /('|"|;|--|\/\*|\*\/|xp_|sp_|0x)/i,
  scriptInjection: /<script|javascript:|on\w+\s*=/i
} as const

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

export function validateInput(
  input: string,
  type: InputType,
  maxLength: number = 255
): ValidationResult {
  const errors: Record<string, string> = {}
  let sanitized = input.trim()

  // Empty check
  if (!sanitized) {
    return {
      isValid: true,
      errors: {},
      sanitized: ''
    }
  }

  // Length check
  if (sanitized.length > maxLength) {
    errors.length = `Maximum ${maxLength} characters allowed`
  }

  // Check for SQL injection attempts
  if (PATTERNS.sqlInjection.test(sanitized)) {
    errors.security = 'Invalid characters detected'
  }

  // Check for script injection attempts
  if (PATTERNS.scriptInjection.test(sanitized)) {
    errors.security = 'Invalid characters detected'
  }

  // Type-specific validation
  switch (type) {
    case 'email':
      if (!PATTERNS.email.test(sanitized)) {
        errors.format = 'Invalid email format'
      }
      sanitized = sanitized.toLowerCase()
      break

    case 'number':
      if (isNaN(Number(sanitized))) {
        errors.format = 'Must be a valid number'
      }
      break

    case 'currency':
      if (!PATTERNS.currency.test(sanitized)) {
        errors.format = 'Invalid currency format (e.g., 123.45)'
      }
      break

    case 'phone':
      if (!PATTERNS.phone.test(sanitized)) {
        errors.format = 'Invalid phone number format'
      }
      break

    case 'url':
      if (!PATTERNS.url.test(sanitized)) {
        errors.format = 'Invalid URL format'
      }
      break

    case 'token':
      if (!PATTERNS.token.test(sanitized)) {
        errors.format = 'Invalid token format'
      }
      break

    case 'text':
    default:
      // General text - just sanitize
      break
  }

  // XSS Protection: Escape dangerous characters
  sanitized = escapeHtml(sanitized)

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  }
}

// =============================================================================
// HTML ESCAPING
// =============================================================================

export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }

  return input.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char)
}

export function unescapeHtml(input: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  }

  return input.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g, 
    (entity) => htmlUnescapes[entity] || entity
  )
}

// =============================================================================
// SPECIFIC VALIDATORS
// =============================================================================

export function validateEmail(email: string): ValidationResult {
  return validateInput(email, 'email', 254)
}

export function validatePhone(phone: string): ValidationResult {
  return validateInput(phone, 'phone', 20)
}

export function validateCurrency(amount: string): ValidationResult {
  return validateInput(amount, 'currency', 15)
}

export function validateUrl(url: string): ValidationResult {
  return validateInput(url, 'url', 2000)
}

export function validateToken(token: string): ValidationResult {
  return validateInput(token, 'token', 64)
}

// =============================================================================
// FORM VALIDATION
// =============================================================================

export interface FieldValidation {
  value: string
  type: InputType
  required?: boolean
  maxLength?: number
  minLength?: number
  label?: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string>
  sanitizedValues: Record<string, string>
}

export function validateForm(
  fields: Record<string, FieldValidation>
): FormValidationResult {
  const errors: Record<string, string> = {}
  const sanitizedValues: Record<string, string> = {}

  for (const [fieldName, field] of Object.entries(fields)) {
    const label = field.label || fieldName

    // Required check
    if (field.required && !field.value.trim()) {
      errors[fieldName] = `${label} is required`
      continue
    }

    // Min length check
    if (field.minLength && field.value.trim().length < field.minLength) {
      errors[fieldName] = `${label} must be at least ${field.minLength} characters`
      continue
    }

    // Run validation
    const result = validateInput(
      field.value,
      field.type,
      field.maxLength
    )

    if (!result.isValid) {
      const errorMessage = Object.values(result.errors)[0]
      errors[fieldName] = errorMessage ? `${label}: ${errorMessage}` : `${label} is invalid`
    }

    sanitizedValues[fieldName] = result.sanitized
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedValues
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isValidEmail(email: string): boolean {
  return validateEmail(email).isValid
}

export function isValidPhone(phone: string): boolean {
  return validatePhone(phone).isValid
}

export function isValidUrl(url: string): boolean {
  return validateUrl(url).isValid
}

export function isValidToken(token: string): boolean {
  return validateToken(token).isValid
}

/**
 * Validate that a URL is relative (prevents SSRF)
 */
export function isRelativeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Validate that a URL is from an allowed domain
 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url)
    return allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}
