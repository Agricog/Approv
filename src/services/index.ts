/**
 * Services Index
 * Barrel export for all service modules
 */

// API client
export { 
  api, 
  apiRequest,
  approvalApi,
  projectApi,
  dashboardApi,
  portalApi
} from './api'
export type { RequestConfig } from './api'

// Monday.com integration
export { 
  MondayClient, 
  createMondayClient,
  parseMondayWebhook,
  handleWebhookChallenge
} from './monday'
export type { 
  MondayConfig, 
  MondayItem, 
  MondayColumnValue,
  MondayBoard,
  MondayColumn,
  MondayGroup,
  MondayWebhook,
  MondayResponse,
  MondayWebhookPayload
} from './monday'

// Notifications
export { 
  notifications,
  emailNotifications,
  smsNotifications,
  slackNotifications,
  notificationPreferences
} from './notifications'
export type { 
  SendNotificationResult,
  NotificationRequest,
  BulkNotificationRequest
} from './notifications'
