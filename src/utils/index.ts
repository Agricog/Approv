/**
 * Utils Index
 * Barrel export for all utility functions
 */

// Validation utilities
export {
  validateInput,
  validateEmail,
  validatePhone,
  validateCurrency,
  validateUrl,
  validateToken,
  validateForm,
  escapeHtml,
  unescapeHtml,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidToken,
  isRelativeUrl,
  isAllowedDomain
} from './validation'

export type {
  ValidationResult,
  InputType,
  FieldValidation,
  FormValidationResult
} from './validation'

// Sanitization utilities
export {
  sanitizeText,
  sanitizeBasic,
  sanitizeRich,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeObject,
  createSafeHtml,
  truncateText,
  encodeHtmlAttribute,
  encodeUrlParam,
  decodeUrlParam
} from './sanitization'

// Error tracking utilities
export {
  captureError,
  captureApiError,
  captureFormError,
  captureApprovalError,
  captureWebhookError,
  addNavigationBreadcrumb,
  addActionBreadcrumb,
  addApiBreadcrumb,
  setErrorTrackingUser,
  setErrorTrackingContext,
  clearErrorTrackingContext,
  captureMessage,
  captureWarning,
  startTransaction,
  measureAsync
} from './errorTracking'

export type {
  ErrorSeverity,
  ErrorContext,
  ErrorMetadata
} from './errorTracking'

// Analytics utilities
export {
  isAnalyticsEnabled,
  trackEvent,
  trackPageView,
  trackApprovalViewed,
  trackApprovalSubmitted,
  trackPdfPreviewOpened,
  trackDeliverableDownloaded,
  trackPortalAccessed,
  trackProjectViewed,
  trackPortalFilterUsed,
  trackDashboardAccessed,
  trackDateRangeChanged,
  trackReportExported,
  trackBottleneckClicked,
  trackReminderSent,
  trackNotificationPreferenceChanged,
  trackError,
  trackFormError,
  trackApprovalEngagement,
  trackScrollDepth,
  setUserProperties
} from './analytics'

export type {
  AnalyticsEventCategory,
  AnalyticsEvent
} from './analytics'

// Formatter utilities
export {
  parseDate,
  formatDate,
  formatDateFull,
  formatDateShort,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatSmartDate,
  formatDuration,
  getDaysPending,
  getHoursPending,
  isExpired,
  isUpcoming,
  getExpiryDate,
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercentage,
  formatHours,
  capitalize,
  titleCase,
  truncate,
  getInitials,
  pluralize
} from './formatters'

export type { DateRange } from './formatters'
