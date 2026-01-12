/**
 * Hooks Index
 * Barrel export for all custom hooks
 */

// API hooks
export { useApi, useApiGet, useApiPost, isRetryableError } from './useApi'
export type { ApiState, ApiError, FetchOptions } from './useApi'

// Approval hooks
export { useApproval, useApprovalStatus } from './useApproval'
export type { ApprovalData, ApprovalState, UseApprovalReturn } from './useApproval'

// Analytics hooks
export {
  usePageTracking,
  useEngagementTracking,
  useScrollTracking,
  useAnalytics,
  useTrackEvent
} from './useAnalytics'

// Offline hooks
export {
  useOffline,
  useOfflineBanner,
  useNetworkStatus
} from './useOffline'
export type { OfflineState, UseOfflineReturn, NetworkStatus } from './useOffline'

// Debounce hooks
export {
  useDebounce,
  useDebounceCallback,
  useThrottleCallback,
  useDebouncedState,
  useDebouncedInput,
  useLeadingDebounce
} from './useDebounce'
