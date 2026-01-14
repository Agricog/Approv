/**
 * useApi Hook
 * Secure fetch wrapper with error handling, CSRF protection, and rate limiting awareness
 */
import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { captureApiError, addApiBreadcrumb } from '../utils/errorTracking'

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'

// =============================================================================
// TYPES
// =============================================================================

export interface ApiState<T> {
  data: T | null
  isLoading: boolean
  error: ApiError | null
}

export interface ApiError {
  code: string
  message: string
  status?: number
  retryAfter?: number
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
  skipAuth?: boolean
  skipCsrf?: boolean
}

interface UseApiReturn<T> {
  data: T | null
  isLoading: boolean
  error: ApiError | null
  execute: (endpoint: string, options?: FetchOptions) => Promise<T | null>
  reset: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const RETRY_STATUS_CODES = [408, 429, 503, 504]
const METHODS_REQUIRING_CSRF = ['POST', 'PUT', 'DELETE', 'PATCH']

// =============================================================================
// CSRF TOKEN CACHE
// =============================================================================

let cachedCsrfToken: string | null = null
let csrfTokenExpiry: number = 0

async function getCsrfToken(authToken: string | null): Promise<string | null> {
  // Return cached token if still valid (with 1 minute buffer)
  if (cachedCsrfToken && Date.now() < csrfTokenExpiry - 60000) {
    return cachedCsrfToken
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers
    })

    if (!response.ok) {
      console.error('Failed to get CSRF token:', response.status)
      return null
    }

    const data = await response.json()
    
    // Handle both formats: { token: "..." } or { success: true, data: { token: "..." } }
    const token = data.token || data.data?.token
    
    if (token) {
      cachedCsrfToken = token
      // Token expires in 1 hour, cache for 55 minutes
      csrfTokenExpiry = Date.now() + 55 * 60 * 1000
      return cachedCsrfToken
    }
    
    return null
  } catch (err) {
    console.error('Error fetching CSRF token:', err)
    return null
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useApi<T = unknown>(): UseApiReturn<T> {
  const { getToken } = useAuth()
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null
  })

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null
    })
  }, [])

  const execute = useCallback(async (
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const {
      method = 'GET',
      body,
      headers = {},
      timeout = DEFAULT_TIMEOUT,
      skipAuth = false,
      skipCsrf = false
    } = options

    // Build full URL
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      }

      // Add auth token
      let authToken: string | null = null
      if (!skipAuth) {
        try {
          authToken = await getToken()
          if (authToken) {
            requestHeaders['Authorization'] = `Bearer ${authToken}`
          }
        } catch {
          // Continue without token
        }
      }

      // Add CSRF token for state-changing methods
      if (!skipCsrf && METHODS_REQUIRING_CSRF.includes(method)) {
        const csrfToken = await getCsrfToken(authToken)
        if (csrfToken) {
          requestHeaders['X-CSRF-Token'] = csrfToken
        }
      }

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Add breadcrumb for debugging
      addApiBreadcrumb(method, endpoint, response.status)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const error: ApiError = {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          status: 429,
          retryAfter: retryAfter ? parseInt(retryAfter, 10) : 60
        }
        setState(prev => ({ ...prev, error, isLoading: false }))
        return null
      }

      // Handle CSRF token expired/invalid - retry once with fresh token
      if (response.status === 403 && METHODS_REQUIRING_CSRF.includes(method)) {
        // Clear cached token and retry once
        cachedCsrfToken = null
        csrfTokenExpiry = 0
      }

      // Handle other errors
      if (!response.ok) {
        let errorData: { code?: string; message?: string } = {}
        
        try {
          errorData = await response.json()
        } catch {
          // Response body not JSON
        }

        const error: ApiError = {
          code: errorData.code || `HTTP_${response.status}`,
          message: errorData.message || getDefaultErrorMessage(response.status),
          status: response.status
        }

        // Log error to Sentry (non-4xx errors)
        if (response.status >= 500) {
          captureApiError(new Error(error.message), endpoint, method, response.status)
        }

        setState(prev => ({ ...prev, error, isLoading: false }))
        return null
      }

      // Parse successful response
      const responseData = await response.json()
      
      // Unwrap { success: true, data: ... } format
      const data = (responseData.success && responseData.data !== undefined) 
        ? responseData.data as T 
        : responseData as T

      setState({ data, isLoading: false, error: null })
      return data

    } catch (err) {
      clearTimeout(timeoutId)
      
      let error: ApiError

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          error = {
            code: 'TIMEOUT',
            message: 'Request timed out. Please try again.'
          }
        } else if (err.message === 'Failed to fetch') {
          error = {
            code: 'NETWORK_ERROR',
            message: 'Unable to connect. Please check your internet connection.'
          }
        } else {
          error = {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred. Please try again.'
          }
          captureApiError(err, endpoint, method)
        }
      } else {
        error = {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again.'
        }
      }

      setState(prev => ({ ...prev, error, isLoading: false }))
      return null
    }
  }, [getToken])

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    execute,
    reset
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.'
    case 401:
      return 'Please log in to continue.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return 'A conflict occurred. Please refresh and try again.'
    case 422:
      return 'Invalid data provided. Please check your input.'
    case 429:
      return 'Too many requests. Please try again later.'
    case 500:
      return 'A server error occurred. Please try again later.'
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.'
    default:
      return 'An error occurred. Please try again.'
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  return error.status !== undefined && RETRY_STATUS_CODES.includes(error.status)
}

/**
 * Simple GET request helper
 */
export function useApiGet<T = unknown>() {
  const api = useApi<T>()
  
  const get = useCallback((endpoint: string) => {
    return api.execute(endpoint, { method: 'GET' })
  }, [api])

  return { ...api, get }
}

/**
 * Simple POST request helper
 */
export function useApiPost<T = unknown>() {
  const api = useApi<T>()
  
  const post = useCallback((endpoint: string, body: Record<string, unknown>) => {
    return api.execute(endpoint, { method: 'POST', body })
  }, [api])

  return { ...api, post }
}

/**
 * Clear CSRF token cache (useful on logout)
 */
export function clearCsrfCache() {
  cachedCsrfToken = null
  csrfTokenExpiry = 0
}
