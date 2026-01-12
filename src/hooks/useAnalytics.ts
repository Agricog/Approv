/**
 * useAnalytics Hook
 * React hook wrapper for analytics tracking
 * Handles page views, engagement timing, and scroll depth
 */

import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  trackPageView,
  trackApprovalEngagement,
  trackScrollDepth,
  isAnalyticsEnabled
} from '../utils/analytics'

// =============================================================================
// PAGE VIEW TRACKING
// =============================================================================

/**
 * Track page views on route changes
 */
export function usePageTracking(): void {
  const location = useLocation()

  useEffect(() => {
    if (!isAnalyticsEnabled()) return

    // Track page view
    trackPageView(location.pathname)
  }, [location.pathname])
}

// =============================================================================
// ENGAGEMENT TRACKING
// =============================================================================

interface UseEngagementOptions {
  pageName: string
  minEngagementSeconds?: number
}

/**
 * Track time spent on a page
 * Reports engagement when user leaves or after minimum time
 */
export function useEngagementTracking(options: UseEngagementOptions): void {
  const { pageName, minEngagementSeconds = 5 } = options
  const startTimeRef = useRef<number>(Date.now())
  const hasReportedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!isAnalyticsEnabled()) return

    startTimeRef.current = Date.now()
    hasReportedRef.current = false

    const reportEngagement = () => {
      if (hasReportedRef.current) return

      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
      
      if (timeSpentSeconds >= minEngagementSeconds) {
        trackApprovalEngagement(pageName, timeSpentSeconds)
        hasReportedRef.current = true
      }
    }

    // Report on visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportEngagement()
      }
    }

    // Report on page unload
    const handleBeforeUnload = () => {
      reportEngagement()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      reportEngagement()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pageName, minEngagementSeconds])
}

// =============================================================================
// SCROLL TRACKING
// =============================================================================

interface UseScrollTrackingOptions {
  pageName: string
  thresholds?: number[]
}

/**
 * Track scroll depth on a page
 * Reports when user scrolls past defined thresholds
 */
export function useScrollTracking(options: UseScrollTrackingOptions): void {
  const { pageName, thresholds = [25, 50, 75, 100] } = options
  const reportedThresholdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!isAnalyticsEnabled()) return

    reportedThresholdsRef.current = new Set()

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      
      if (scrollHeight <= 0) return

      const scrollPercentage = Math.round((window.scrollY / scrollHeight) * 100)

      for (const threshold of thresholds) {
        if (
          scrollPercentage >= threshold &&
          !reportedThresholdsRef.current.has(threshold)
        ) {
          trackScrollDepth(pageName, threshold)
          reportedThresholdsRef.current.add(threshold)
        }
      }
    }

    // Debounced scroll handler
    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 100)
    }

    window.addEventListener('scroll', debouncedScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', debouncedScroll)
      clearTimeout(timeoutId)
    }
  }, [pageName, thresholds])
}

// =============================================================================
// COMBINED TRACKING HOOK
// =============================================================================

interface UseAnalyticsOptions {
  pageName: string
  trackEngagement?: boolean
  trackScroll?: boolean
  minEngagementSeconds?: number
  scrollThresholds?: number[]
}

/**
 * Combined analytics hook for common tracking needs
 */
export function useAnalytics(options: UseAnalyticsOptions): void {
  const {
    pageName,
    trackEngagement = true,
    trackScroll = false,
    minEngagementSeconds = 5,
    scrollThresholds = [25, 50, 75, 100]
  } = options

  // Page view tracking
  usePageTracking()

  // Engagement tracking
  useEffect(() => {
    if (!trackEngagement || !isAnalyticsEnabled()) return

    const startTime = Date.now()
    let hasReported = false

    const reportEngagement = () => {
      if (hasReported) return

      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000)
      
      if (timeSpentSeconds >= minEngagementSeconds) {
        trackApprovalEngagement(pageName, timeSpentSeconds)
        hasReported = true
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportEngagement()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', reportEngagement)

    return () => {
      reportEngagement()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', reportEngagement)
    }
  }, [pageName, trackEngagement, minEngagementSeconds])

  // Scroll tracking
  useEffect(() => {
    if (!trackScroll || !isAnalyticsEnabled()) return

    const reportedThresholds = new Set<number>()

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight <= 0) return

      const scrollPercentage = Math.round((window.scrollY / scrollHeight) * 100)

      for (const threshold of scrollThresholds) {
        if (scrollPercentage >= threshold && !reportedThresholds.has(threshold)) {
          trackScrollDepth(pageName, threshold)
          reportedThresholds.add(threshold)
        }
      }
    }

    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 100)
    }

    window.addEventListener('scroll', debouncedScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', debouncedScroll)
      clearTimeout(timeoutId)
    }
  }, [pageName, trackScroll, scrollThresholds])
}

// =============================================================================
// EVENT TRACKING HELPER
// =============================================================================

/**
 * Returns a memoized event tracking function
 * Useful for tracking button clicks, form submissions, etc.
 */
export function useTrackEvent() {
  return useCallback((
    category: string,
    action: string,
    label?: string,
    value?: number
  ) => {
    if (!isAnalyticsEnabled()) return

    // Import dynamically to avoid circular dependencies
    import('../utils/analytics').then(({ trackEvent }) => {
      trackEvent({
        category: category as 'approval' | 'project' | 'navigation' | 'engagement' | 'error' | 'notification' | 'portal' | 'dashboard',
        action,
        label,
        value
      })
    })
  }, [])
}
