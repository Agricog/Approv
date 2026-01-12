/**
 * Analytics Utilities
 * Google Analytics 4 event tracking
 * SECURITY: Never track PII (emails, names, phone numbers)
 */

// =============================================================================
// TYPES
// =============================================================================

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set',
      targetId: string,
      config?: Record<string, unknown>
    ) => void
    dataLayer?: unknown[]
  }
}

export type AnalyticsEventCategory =
  | 'approval'
  | 'project'
  | 'navigation'
  | 'engagement'
  | 'error'
  | 'notification'
  | 'portal'
  | 'dashboard'

export interface AnalyticsEvent {
  category: AnalyticsEventCategory
  action: string
  label?: string
  value?: number
  nonInteraction?: boolean
  customDimensions?: Record<string, string | number | boolean>
}

// =============================================================================
// CORE TRACKING FUNCTIONS
// =============================================================================

/**
 * Check if analytics is available and enabled
 */
export function isAnalyticsEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
  )
}

/**
 * Track a custom event
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!isAnalyticsEnabled()) return

  try {
    window.gtag?.('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      non_interaction: event.nonInteraction ?? false,
      ...event.customDimensions
    })
  } catch (error) {
    // Silently fail - don't break the app for analytics
    console.warn('Analytics tracking failed:', error)
  }
}

/**
 * Track a page view
 */
export function trackPageView(
  pagePath: string,
  pageTitle?: string
): void {
  if (!isAnalyticsEnabled()) return

  try {
    window.gtag?.('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title
    })
  } catch (error) {
    console.warn('Analytics page view failed:', error)
  }
}

// =============================================================================
// APPROVAL EVENTS
// =============================================================================

/**
 * Track approval page viewed
 */
export function trackApprovalViewed(
  approvalStage: string,
  hasDeliverable: boolean
): void {
  trackEvent({
    category: 'approval',
    action: 'approval_viewed',
    label: approvalStage,
    customDimensions: {
      has_deliverable: hasDeliverable
    }
  })
}

/**
 * Track approval submitted
 */
export function trackApprovalSubmitted(
  approvalStage: string,
  action: 'approved' | 'changes_requested',
  responseTimeHours?: number
): void {
  trackEvent({
    category: 'approval',
    action: `approval_${action}`,
    label: approvalStage,
    value: responseTimeHours ? Math.round(responseTimeHours) : undefined,
    customDimensions: {
      response_time_hours: responseTimeHours
    }
  })
}

/**
 * Track PDF preview opened
 */
export function trackPdfPreviewOpened(approvalStage: string): void {
  trackEvent({
    category: 'approval',
    action: 'pdf_preview_opened',
    label: approvalStage
  })
}

/**
 * Track deliverable downloaded
 */
export function trackDeliverableDownloaded(
  approvalStage: string,
  fileType: string
): void {
  trackEvent({
    category: 'approval',
    action: 'deliverable_downloaded',
    label: approvalStage,
    customDimensions: {
      file_type: fileType
    }
  })
}

// =============================================================================
// PORTAL EVENTS
// =============================================================================

/**
 * Track client portal accessed
 */
export function trackPortalAccessed(): void {
  trackEvent({
    category: 'portal',
    action: 'portal_accessed'
  })
}

/**
 * Track project viewed in portal
 */
export function trackProjectViewed(projectStage: string): void {
  trackEvent({
    category: 'portal',
    action: 'project_viewed',
    label: projectStage
  })
}

/**
 * Track portal filter used
 */
export function trackPortalFilterUsed(filterType: string): void {
  trackEvent({
    category: 'portal',
    action: 'filter_used',
    label: filterType
  })
}

// =============================================================================
// DASHBOARD EVENTS
// =============================================================================

/**
 * Track dashboard accessed
 */
export function trackDashboardAccessed(section: string): void {
  trackEvent({
    category: 'dashboard',
    action: 'dashboard_accessed',
    label: section
  })
}

/**
 * Track analytics date range changed
 */
export function trackDateRangeChanged(range: string): void {
  trackEvent({
    category: 'dashboard',
    action: 'date_range_changed',
    label: range
  })
}

/**
 * Track report exported
 */
export function trackReportExported(format: string): void {
  trackEvent({
    category: 'dashboard',
    action: 'report_exported',
    label: format
  })
}

/**
 * Track bottleneck clicked
 */
export function trackBottleneckClicked(urgency: string): void {
  trackEvent({
    category: 'dashboard',
    action: 'bottleneck_clicked',
    label: urgency
  })
}

// =============================================================================
// NOTIFICATION EVENTS
// =============================================================================

/**
 * Track reminder sent
 */
export function trackReminderSent(
  reminderType: string,
  channel: string
): void {
  trackEvent({
    category: 'notification',
    action: 'reminder_sent',
    label: `${reminderType}_${channel}`
  })
}

/**
 * Track notification preference changed
 */
export function trackNotificationPreferenceChanged(
  channel: string,
  enabled: boolean
): void {
  trackEvent({
    category: 'notification',
    action: 'preference_changed',
    label: channel,
    customDimensions: {
      enabled
    }
  })
}

// =============================================================================
// ERROR EVENTS
// =============================================================================

/**
 * Track client-side error (non-fatal)
 */
export function trackError(
  errorType: string,
  errorContext: string
): void {
  trackEvent({
    category: 'error',
    action: 'client_error',
    label: `${errorType}_${errorContext}`,
    nonInteraction: true
  })
}

/**
 * Track form validation error
 */
export function trackFormError(
  formName: string,
  fieldCount: number
): void {
  trackEvent({
    category: 'error',
    action: 'form_validation_error',
    label: formName,
    value: fieldCount,
    nonInteraction: true
  })
}

// =============================================================================
// ENGAGEMENT EVENTS
// =============================================================================

/**
 * Track time spent on approval page
 */
export function trackApprovalEngagement(
  approvalStage: string,
  timeSpentSeconds: number
): void {
  trackEvent({
    category: 'engagement',
    action: 'approval_time_spent',
    label: approvalStage,
    value: timeSpentSeconds,
    nonInteraction: true
  })
}

/**
 * Track scroll depth
 */
export function trackScrollDepth(
  pageName: string,
  percentage: number
): void {
  trackEvent({
    category: 'engagement',
    action: 'scroll_depth',
    label: pageName,
    value: percentage,
    nonInteraction: true
  })
}

// =============================================================================
// USER PROPERTIES
// =============================================================================

/**
 * Set user properties (non-PII only)
 */
export function setUserProperties(properties: {
  userType?: 'client' | 'team_member' | 'admin'
  hasMultipleProjects?: boolean
}): void {
  if (!isAnalyticsEnabled()) return

  try {
    window.gtag?.('set', 'user_properties', properties)
  } catch (error) {
    console.warn('Analytics user properties failed:', error)
  }
}
