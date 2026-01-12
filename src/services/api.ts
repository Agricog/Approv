/**
 * API Client Service
 * Centralized API client with CSRF protection, retry logic, and type safety
 * OWASP compliant
 */

import { captureApiError } from '../utils/errorTracking'
import { isRelativeUrl } from '../utils/validation'
import type { ApiResult } from '../types'

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_TIMEOUT = 30000
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// =============================================================================
// TYPES
// =============================================================================

export interface RequestConfig extends Omit<RequestInit, 'headers'> {
  timeout?: number
  retries?: number
  skipCsrf?: boolean
  headers?: Record<string, string>
}

interface CsrfToken {
  token: string
  expiresAt: number
}

// =============================================================================
// CSRF TOKEN MANAGEMENT
// =============================================================================

let csrfToken: CsrfToken | null = null

async function getCsrfToken(): Promise<string> {
  // Return cached token if still valid (5 min buffer)
  if (csrfToken && csrfToken.expiresAt > Date.now() + 300000) {
    return csrfToken.token
  }

  try {
    const response = await fetch(`${API_BASE_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token')
    }

    const data = await response.json()
    csrfToken = {
      token: data.token,
      expiresAt: Date.now() + (data.expiresIn || 3600) * 1000
    }

    return csrfToken.token
  } catch (error) {
    console.error('CSRF token fetch failed:', error)
    throw error
  }
}

function clearCsrfToken(): void {
  csrfToken = null
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableError(status: number): boolean {
  return status === 429 || status === 503 || status === 504
}

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  // Security: Only allow relative URLs
  if (!isRelativeUrl(endpoint) && !endpoint.startsWith(API_BASE_URL)) {
    throw new Error('Invalid endpoint: must be relative URL')
  }

  const url = endpoint.startsWith('/') 
    ? `${API_BASE_URL}${endpoint}`
    : `${API_BASE_URL}/${endpoint}`

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params)
    return `${url}?${searchParams.toString()}`
  }

  return url
}

// =============================================================================
// MAIN API CLIENT
// =============================================================================

export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResult<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    skipCsrf = false,
    method = 'GET',
    headers = {},
    ...restConfig
  } = config

  const url = buildUrl(endpoint)
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }

      // Add CSRF token for mutating requests
      if (!skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        try {
          const token = await getCsrfToken()
          requestHeaders['X-CSRF-Token'] = token
        } catch {
          // Continue without CSRF if token fetch fails (will be rejected by server)
          console.warn('Proceeding without CSRF token')
        }
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        credentials: 'include',
        signal: controller.signal,
        ...restConfig
      })

      clearTimeout(timeoutId)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY * (attempt + 1)
        
        if (attempt < retries) {
          await sleep(delay)
          continue
        }
      }

      // Handle CSRF token expiry
      if (response.status === 403) {
        const body = await response.json().catch(() => ({}))
        if (body.code === 'CSRF_INVALID') {
          clearCsrfToken()
          if (attempt < retries) {
            continue
          }
        }
      }

      // Parse response
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        // Retry on retryable errors
        if (isRetryableError(response.status) && attempt < retries) {
          await sleep(RETRY_DELAY * (attempt + 1))
          continue
        }

        captureApiError(
          new Error(data?.message || response.statusText), 
          endpoint, 
          method,
          response.status
        )

        return {
          success: false,
          error: {
            code: data?.code || `HTTP_${response.status}`,
            message: data?.message || response.statusText,
            details: data?.details
          }
        }
      }

      return {
        success: true,
        data: data as T
      }
    } catch (error) {
      lastError = error as Error

      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out'
          }
        }
      }

      // Retry on network errors
      if (attempt < retries) {
        await sleep(RETRY_DELAY * (attempt + 1))
        continue
      }
    }
  }

  // All retries exhausted
  captureApiError(lastError || new Error('Request failed'), endpoint, method)

  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: lastError?.message || 'Network error'
    }
  }
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

export const api = {
  get<T>(endpoint: string, params?: Record<string, string>, config?: RequestConfig) {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint
    return apiRequest<T>(url, { ...config, method: 'GET' })
  },

  post<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return apiRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    })
  },

  put<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return apiRequest<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    })
  },

  patch<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return apiRequest<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    })
  },

  delete<T>(endpoint: string, config?: RequestConfig) {
    return apiRequest<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

// =============================================================================
// TYPED API ENDPOINTS
// =============================================================================

export const approvalApi = {
  getByToken(token: string) {
    return api.get<{
      id: string
      projectName: string
      clientName: string
      approvalStage: string
      status: string
      deliverableUrl: string | null
      deliverableType: string | null
      createdAt: string
      expiresAt: string
      respondedAt: string | null
    }>(`/approvals/${token}`)
  },

  submit(token: string, action: 'approve' | 'request_changes', notes?: string) {
    return api.post<{ success: boolean; message: string }>(`/approvals/${token}/respond`, {
      action,
      notes
    })
  },

  trackView(token: string) {
    return api.post(`/approvals/${token}/view`, undefined, { skipCsrf: true })
  }
}

export const projectApi = {
  list(params?: { status?: string; stage?: string; search?: string }) {
    return api.get<{
      items: Array<{
        id: string
        name: string
        reference: string
        clientName: string
        status: string
        currentStage: string
        pendingApprovals: number
        lastActivityAt: string
      }>
      total: number
      page: number
      totalPages: number
    }>('/projects', params as Record<string, string>)
  },

  get(id: string) {
    return api.get<{
      id: string
      name: string
      reference: string
      clientName: string
      address: string
      status: string
      currentStage: string
      startDate: string
      targetCompletionDate: string | null
      approvals: Array<{
        id: string
        stage: string
        status: string
        createdAt: string
        respondedAt: string | null
      }>
    }>(`/projects/${id}`)
  },

  create(data: { name: string; clientName: string; clientEmail: string }) {
    return api.post<{ id: string }>('/projects', data)
  }
}

export const dashboardApi = {
  getMetrics() {
    return api.get<{
      activeProjects: number
      pendingApprovals: number
      approvalStats: {
        total: number
        approved: number
        changesRequested: number
        approvalRate: number
        avgResponseTimeHours: number
      }
      trends: {
        projectsChange: number
        approvalsChange: number
        responseTimeChange: number
      }
    }>('/dashboard/metrics')
  },

  getRecentActivity() {
    return api.get<Array<{
      id: string
      type: string
      message: string
      projectName: string
      timestamp: string
    }>>('/dashboard/activity')
  },

  getBottlenecks() {
    return api.get<Array<{
      id: string
      projectId: string
      projectName: string
      stageLabel: string
      clientName: string
      daysPending: number
      urgency: string
    }>>('/dashboard/bottlenecks')
  }
}

export const portalApi = {
  getData() {
    return api.get<{
      clientName: string
      projects: Array<{
        id: string
        name: string
        reference: string
        status: string
        currentStage: string
        pendingApprovalsCount: number
        completedApprovalsCount: number
        approvals: Array<{
          id: string
          stage: string
          status: string
          createdAt: string
          respondedAt: string | null
        }>
      }>
      pendingCount: number
    }>('/portal')
  },

  getProject(projectId: string) {
    return api.get<{
      id: string
      name: string
      reference: string
      clientName: string
      address: string
      status: string
      currentStage: string
      startDate: string
      targetCompletionDate: string | null
      pendingApprovalsCount: number
      completedApprovalsCount: number
      approvals: Array<{
        id: string
        stage: string
        status: string
        createdAt: string
        respondedAt: string | null
      }>
    }>(`/portal/projects/${projectId}`)
  }
}

export default api
