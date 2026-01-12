/**
 * Types Index
 * Barrel export for all type definitions
 */

// Approval types
export type {
  ApprovalStatus,
  Approval,
  ApprovalCreateInput,
  ApprovalResponse,
  ApprovalWithAudit,
  ApprovalAuditEntry,
  ApprovalStats,
  ApprovalStageConfig
} from './approval'

export { DEFAULT_APPROVAL_STAGES } from './approval'

// Project types
export type {
  ProjectStatus,
  ProjectStage,
  Project,
  ProjectWithApprovals,
  ProjectApprovalSummary,
  ProjectListItem,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectFilter,
  ProjectSortOptions
} from './project'

export { PROJECT_STAGE_LABELS, PROJECT_STATUS_LABELS } from './project'

// API types
export type {
  ApiResponse,
  ApiError,
  ApiResult,
  PaginatedResponse,
  PaginationParams,
  MondayWebhookPayload,
  MondayColumnValue,
  MondayItem,
  MondayColumnValueItem,
  GetApprovalRequest,
  GetApprovalResponse,
  SubmitApprovalRequest,
  SubmitApprovalResponse,
  GetProjectsRequest,
  GetProjectsResponse,
  GetAnalyticsRequest,
  GetAnalyticsResponse,
  SendReminderRequest,
  SendReminderResponse,
  SendSlackNotificationRequest,
  SendSlackNotificationResponse
} from './api'

// Analytics types
export type {
  TimePeriod,
  DateRange,
  GroupBy,
  DashboardMetrics,
  MetricCard,
  TimelineDataPoint,
  StageBreakdown,
  ResponseTimeDistribution,
  ClientActivityData,
  Bottleneck,
  BottleneckFilters,
  TeamMemberPerformance,
  ReportConfig,
  ExportData
} from './analytics'

export { calculateUrgency } from './analytics'

// Notification types
export type {
  NotificationChannel,
  NotificationType,
  EmailNotification,
  EmailTemplate,
  SendEmailInput,
  ApprovalEmailData,
  ReminderEmailData,
  ConfirmationEmailData,
  SmsNotification,
  SendSmsInput,
  SmsTemplate,
  SlackNotification,
  SlackBlock,
  SlackAccessory,
  SlackElement,
  SendSlackInput,
  SlackNotificationData,
  NotificationPreferences,
  QueuedNotification
} from './notifications'

export { SMS_TEMPLATES, DEFAULT_NOTIFICATION_PREFERENCES } from './notifications'
