/**
 * Notifications Service
 * Handles email, SMS, and Slack notifications
 * All actual sending done server-side via API
 */

import { api } from './api'
import { captureError } from '../utils/errorTracking'
import type { NotificationChannel, NotificationPreferences } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export interface SendNotificationResult {
  success: boolean
  channel: NotificationChannel
  messageId?: string
  error?: string
}

export interface NotificationRequest {
  channel: NotificationChannel
  recipientId: string
  templateId: string
  data: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high'
  scheduledFor?: string
}

export interface BulkNotificationRequest {
  notifications: NotificationRequest[]
  batchId?: string
}

// =============================================================================
// EMAIL NOTIFICATIONS
// =============================================================================

export const emailNotifications = {
  /**
   * Send approval request email to client
   */
  async sendApprovalRequest(
    recipientEmail: string,
    data: {
      clientName: string
      projectName: string
      stageName: string
      approvalUrl: string
      expiresAt: string
      senderName: string
      companyName: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/email', {
        template: 'approval_request',
        to: recipientEmail,
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'email',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'email',
        error: response.error?.message || 'Failed to send email'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'email_approval_request' })
      return {
        success: false,
        channel: 'email',
        error: error.message
      }
    }
  },

  /**
   * Send approval reminder email
   */
  async sendReminder(
    recipientEmail: string,
    data: {
      clientName: string
      projectName: string
      stageName: string
      approvalUrl: string
      daysPending: number
      expiresAt: string
      companyName: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/email', {
        template: 'approval_reminder',
        to: recipientEmail,
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'email',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'email',
        error: response.error?.message || 'Failed to send reminder'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'email_reminder' })
      return {
        success: false,
        channel: 'email',
        error: error.message
      }
    }
  },

  /**
   * Send approval confirmation email
   */
  async sendConfirmation(
    recipientEmail: string,
    data: {
      clientName: string
      projectName: string
      stageName: string
      status: 'approved' | 'changes_requested'
      respondedAt: string
      notes?: string
      companyName: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/email', {
        template: 'approval_confirmation',
        to: recipientEmail,
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'email',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'email',
        error: response.error?.message || 'Failed to send confirmation'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'email_confirmation' })
      return {
        success: false,
        channel: 'email',
        error: error.message
      }
    }
  },

  /**
   * Send team notification when approval is received
   */
  async notifyTeam(
    teamEmails: string[],
    data: {
      projectName: string
      stageName: string
      clientName: string
      status: 'approved' | 'changes_requested'
      notes?: string
      projectUrl: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/email/bulk', {
        template: 'team_notification',
        recipients: teamEmails,
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'email',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'email',
        error: response.error?.message || 'Failed to notify team'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'email_team' })
      return {
        success: false,
        channel: 'email',
        error: error.message
      }
    }
  }
}

// =============================================================================
// SMS NOTIFICATIONS
// =============================================================================

export const smsNotifications = {
  /**
   * Send SMS reminder
   */
  async sendReminder(
    phoneNumber: string,
    data: {
      clientName: string
      projectName: string
      approvalUrl: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/sms', {
        template: 'approval_reminder',
        to: phoneNumber,
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'sms',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'sms',
        error: response.error?.message || 'Failed to send SMS'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'sms_reminder' })
      return {
        success: false,
        channel: 'sms',
        error: error.message
      }
    }
  },

  /**
   * Send escalation SMS
   */
  async sendEscalation(
    phoneNumber: string,
    data: {
      clientName: string
      projectName: string
      daysPending: number
      approvalUrl: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/sms', {
        template: 'approval_escalation',
        to: phoneNumber,
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'sms',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'sms',
        error: response.error?.message || 'Failed to send escalation SMS'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'sms_escalation' })
      return {
        success: false,
        channel: 'sms',
        error: error.message
      }
    }
  }
}

// =============================================================================
// SLACK NOTIFICATIONS
// =============================================================================

export const slackNotifications = {
  /**
   * Send Slack notification to channel
   */
  async sendToChannel(
    channelId: string,
    data: {
      projectName: string
      stageName: string
      clientName: string
      status: 'pending' | 'approved' | 'changes_requested'
      notes?: string
      approvalUrl?: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/slack', {
        channel: channelId,
        type: 'approval_update',
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'slack',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'slack',
        error: response.error?.message || 'Failed to send Slack message'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'slack_channel' })
      return {
        success: false,
        channel: 'slack',
        error: error.message
      }
    }
  },

  /**
   * Send bottleneck alert
   */
  async sendBottleneckAlert(
    channelId: string,
    data: {
      projectName: string
      stageName: string
      clientName: string
      daysPending: number
      urgency: 'medium' | 'high' | 'critical'
      projectUrl: string
    }
  ): Promise<SendNotificationResult> {
    try {
      const response = await api.post<{ messageId: string }>('/notifications/slack', {
        channel: channelId,
        type: 'bottleneck_alert',
        data
      })

      if (response.success) {
        return {
          success: true,
          channel: 'slack',
          messageId: response.data?.messageId
        }
      }

      return {
        success: false,
        channel: 'slack',
        error: response.error?.message || 'Failed to send Slack alert'
      }
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'slack_bottleneck' })
      return {
        success: false,
        channel: 'slack',
        error: error.message
      }
    }
  }
}

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

export const notificationPreferences = {
  /**
   * Get user notification preferences
   */
  async get(userId: string): Promise<NotificationPreferences | null> {
    try {
      const response = await api.get<NotificationPreferences>(
        `/users/${userId}/notification-preferences`
      )
      return response.success ? response.data : null
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'get_preferences' })
      return null
    }
  },

  /**
   * Update user notification preferences
   */
  async update(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const response = await api.patch(
        `/users/${userId}/notification-preferences`,
        preferences
      )
      return response.success
    } catch (err) {
      const error = err as Error
      captureError(error, { context: 'notification', action: 'update_preferences' })
      return false
    }
  }
}

// =============================================================================
// UNIFIED NOTIFICATION SERVICE
// =============================================================================

export const notifications = {
  email: emailNotifications,
  sms: smsNotifications,
  slack: slackNotifications,
  preferences: notificationPreferences
}

export default notifications
