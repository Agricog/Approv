/**
 * Notification Types
 * Types for email, SMS, and Slack notifications
 */

// =============================================================================
// NOTIFICATION CHANNELS
// =============================================================================

export type NotificationChannel = 'email' | 'sms' | 'slack'

export type NotificationType = 
  | 'approval_request'
  | 'approval_reminder'
  | 'approval_confirmed'
  | 'changes_requested'
  | 'approval_escalation'
  | 'project_update'

// =============================================================================
// EMAIL NOTIFICATIONS
// =============================================================================

export interface EmailNotification {
  id: string
  type: NotificationType
  to: string
  toName: string
  subject: string
  templateId: string
  templateData: Record<string, unknown>
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  sentAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  type: NotificationType
  variables: string[]
}

export interface SendEmailInput {
  to: string
  toName: string
  type: NotificationType
  data: ApprovalEmailData | ReminderEmailData | ConfirmationEmailData
}

export interface ApprovalEmailData {
  clientName: string
  projectName: string
  approvalStage: string
  approvalUrl: string
  deliverableUrl?: string
  expiresAt: string
  companyName: string
  companyLogo?: string
}

export interface ReminderEmailData {
  clientName: string
  projectName: string
  approvalStage: string
  approvalUrl: string
  daysPending: number
  reminderNumber: number
  companyName: string
}

export interface ConfirmationEmailData {
  clientName: string
  projectName: string
  approvalStage: string
  action: 'approved' | 'changes_requested'
  timestamp: string
  nextSteps: string
  companyName: string
}

// =============================================================================
// SMS NOTIFICATIONS
// =============================================================================

export interface SmsNotification {
  id: string
  type: NotificationType
  to: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  twilioSid: string | null
  sentAt: string | null
  deliveredAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface SendSmsInput {
  to: string
  type: NotificationType
  message: string
}

export interface SmsTemplate {
  type: NotificationType
  template: string
  maxLength: number
}

export const SMS_TEMPLATES: Record<string, SmsTemplate> = {
  approval_reminder: {
    type: 'approval_reminder',
    template: 'Hi {clientName}, your approval is needed for {projectName} - {stage}. Please check your email for the approval link. - {companyName}',
    maxLength: 160
  },
  approval_escalation: {
    type: 'approval_escalation',
    template: 'URGENT: {projectName} approval has been pending for {days} days. Please respond via email link or contact us. - {companyName}',
    maxLength: 160
  }
}

// =============================================================================
// SLACK NOTIFICATIONS
// =============================================================================

export interface SlackNotification {
  id: string
  type: NotificationType
  channel: string
  message: string
  blocks?: SlackBlock[]
  status: 'pending' | 'sent' | 'failed'
  sentAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'actions' | 'context' | 'header'
  text?: {
    type: 'plain_text' | 'mrkdwn'
    text: string
    emoji?: boolean
  }
  fields?: {
    type: 'plain_text' | 'mrkdwn'
    text: string
  }[]
  accessory?: SlackAccessory
  elements?: SlackElement[]
}

export interface SlackAccessory {
  type: 'button' | 'image'
  text?: {
    type: 'plain_text'
    text: string
    emoji?: boolean
  }
  url?: string
  image_url?: string
  alt_text?: string
  action_id?: string
}

export interface SlackElement {
  type: 'button' | 'image' | 'mrkdwn'
  text?: {
    type: 'plain_text' | 'mrkdwn'
    text: string
    emoji?: boolean
  }
  url?: string
  action_id?: string
}

export interface SendSlackInput {
  channel?: string
  type: NotificationType
  data: SlackNotificationData
}

export interface SlackNotificationData {
  projectName: string
  projectReference: string
  clientName: string
  stage: string
  action?: 'approved' | 'changes_requested'
  notes?: string
  daysPending?: number
  approvalUrl?: string
  dashboardUrl?: string
}

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

export interface NotificationPreferences {
  email: {
    enabled: boolean
    approvalRequests: boolean
    reminders: boolean
    confirmations: boolean
    escalations: boolean
  }
  sms: {
    enabled: boolean
    remindersOnly: boolean
    escalationsOnly: boolean
  }
  slack: {
    enabled: boolean
    channel: string
    approvalRequests: boolean
    reminders: boolean
    confirmations: boolean
    escalations: boolean
    dailyDigest: boolean
  }
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: {
    enabled: true,
    approvalRequests: true,
    reminders: true,
    confirmations: true,
    escalations: true
  },
  sms: {
    enabled: false,
    remindersOnly: true,
    escalationsOnly: true
  },
  slack: {
    enabled: false,
    channel: '#approvals',
    approvalRequests: true,
    reminders: false,
    confirmations: true,
    escalations: true,
    dailyDigest: false
  }
}

// =============================================================================
// NOTIFICATION QUEUE
// =============================================================================

export interface QueuedNotification {
  id: string
  channel: NotificationChannel
  type: NotificationType
  priority: 'low' | 'normal' | 'high'
  payload: Record<string, unknown>
  scheduledFor: string
  attempts: number
  maxAttempts: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  lastAttemptAt: string | null
  errorMessage: string | null
  createdAt: string
}
