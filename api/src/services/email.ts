/**
 * Email Service
 * Handles all transactional emails using Resend
 */

import { Resend } from 'resend'
import { createLogger } from '../lib/logger.js'

const logger = createLogger('email')

// =============================================================================
// CONFIGURATION
// =============================================================================

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@approv.co.uk'
const APP_URL = process.env.APP_URL || 'https://approv-production.up.railway.app'

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

interface ApprovalRequestEmail {
  to: string
  clientName: string
  projectName: string
  stageName: string
  approvalToken: string
  organizationName: string
}

interface ApprovalConfirmationEmail {
  to: string
  clientName: string
  projectName: string
  stageName: string
  approvedAt: Date
}

interface ReminderEmail {
  to: string
  clientName: string
  projectName: string
  stageName: string
  approvalToken: string
  daysPending: number
}

// =============================================================================
// EMAIL FUNCTIONS
// =============================================================================

/**
 * Send approval request email to client
 */
export async function sendApprovalRequest(data: ApprovalRequestEmail): Promise<boolean> {
  const approvalUrl = `${APP_URL}/approve/${data.approvalToken}`
  
  try {
    const { error } = await resend.emails.send({
      from: `Approv <${FROM_EMAIL}>`,
      to: data.to,
      subject: `Approval Required: ${data.projectName} - ${data.stageName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: #16a34a; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">✓</span>
            </div>
          </div>
          
          <h1 style="font-size: 24px; margin-bottom: 20px;">Approval Required</h1>
          
          <p>Hi ${data.clientName},</p>
          
          <p><strong>${data.organizationName}</strong> has submitted <strong>${data.stageName}</strong> for <strong>${data.projectName}</strong> and requires your approval to proceed.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${approvalUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Review & Approve
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This link is unique to you and does not require a login.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This email was sent by Approv on behalf of ${data.organizationName}.<br>
            If you have questions about this approval, please contact them directly.
          </p>
        </body>
        </html>
      `
    })

    if (error) {
      logger.error({ error, to: data.to }, 'Failed to send approval request email')
      return false
    }

    logger.info({ to: data.to, project: data.projectName }, 'Approval request email sent')
    return true
  } catch (err) {
    logger.error({ err, to: data.to }, 'Error sending approval request email')
    return false
  }
}

/**
 * Send approval confirmation email to client
 */
export async function sendApprovalConfirmation(data: ApprovalConfirmationEmail): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: `Approv <${FROM_EMAIL}>`,
      to: data.to,
      subject: `Approved: ${data.projectName} - ${data.stageName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: #16a34a; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">✓</span>
            </div>
          </div>
          
          <h1 style="font-size: 24px; margin-bottom: 20px; color: #16a34a;">Approval Confirmed</h1>
          
          <p>Hi ${data.clientName},</p>
          
          <p>Thank you for approving <strong>${data.stageName}</strong> for <strong>${data.projectName}</strong>.</p>
          
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Approved:</strong> ${data.approvedAt.toLocaleDateString('en-GB', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <p>The project team has been notified and will proceed with the next steps.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated confirmation from Approv.<br>
            Please keep this email for your records.
          </p>
        </body>
        </html>
      `
    })

    if (error) {
      logger.error({ error, to: data.to }, 'Failed to send confirmation email')
      return false
    }

    logger.info({ to: data.to, project: data.projectName }, 'Approval confirmation email sent')
    return true
  } catch (err) {
    logger.error({ err, to: data.to }, 'Error sending confirmation email')
    return false
  }
}

/**
 * Send reminder email for pending approval
 */
export async function sendApprovalReminder(data: ReminderEmail): Promise<boolean> {
  const approvalUrl = `${APP_URL}/approve/${data.approvalToken}`
  const isUrgent = data.daysPending >= 7
  
  try {
    const { error } = await resend.emails.send({
      from: `Approv <${FROM_EMAIL}>`,
      to: data.to,
      subject: `${isUrgent ? '⚠️ ' : ''}Reminder: Approval pending for ${data.projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: ${isUrgent ? '#f59e0b' : '#16a34a'}; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">${isUrgent ? '!' : '✓'}</span>
            </div>
          </div>
          
          <h1 style="font-size: 24px; margin-bottom: 20px;">Approval Still Required</h1>
          
          <p>Hi ${data.clientName},</p>
          
          <p>This is a friendly reminder that <strong>${data.stageName}</strong> for <strong>${data.projectName}</strong> is still awaiting your approval.</p>
          
          <div style="background: ${isUrgent ? '#fef3c7' : '#f3f4f6'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Waiting:</strong> ${data.daysPending} days</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${approvalUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Review & Approve
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you need to request changes, you can do so via the link above.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated reminder from Approv.<br>
            If you have questions, please contact the project team directly.
          </p>
        </body>
        </html>
      `
    })

    if (error) {
      logger.error({ error, to: data.to }, 'Failed to send reminder email')
      return false
    }

    logger.info({ to: data.to, project: data.projectName, daysPending: data.daysPending }, 'Reminder email sent')
    return true
  } catch (err) {
    logger.error({ err, to: data.to }, 'Error sending reminder email')
    return false
  }
}

/**
 * Send notification to team when approval is received
 */
export async function sendTeamNotification(data: {
  to: string[]
  projectName: string
  stageName: string
  clientName: string
  action: 'approved' | 'changes_requested'
  notes?: string
}): Promise<boolean> {
  const isApproved = data.action === 'approved'
  
  try {
    const { error } = await resend.emails.send({
      from: `Approv <${FROM_EMAIL}>`,
      to: data.to,
      subject: `${isApproved ? '✅' : '📝'} ${data.clientName} ${isApproved ? 'approved' : 'requested changes'}: ${data.projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="font-size: 24px; margin-bottom: 20px; color: ${isApproved ? '#16a34a' : '#f59e0b'};">
            ${isApproved ? 'Approval Received' : 'Changes Requested'}
          </h1>
          
          <p><strong>${data.clientName}</strong> has ${isApproved ? 'approved' : 'requested changes for'} <strong>${data.stageName}</strong> on <strong>${data.projectName}</strong>.</p>
          
          ${data.notes ? `
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600;">Client Notes:</p>
              <p style="margin: 0; color: #666;">${data.notes}</p>
            </div>
          ` : ''}
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${APP_URL}/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View in Dashboard
            </a>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      logger.error({ error }, 'Failed to send team notification')
      return false
    }

    logger.info({ project: data.projectName, action: data.action }, 'Team notification sent')
    return true
  } catch (err) {
    logger.error({ err }, 'Error sending team notification')
    return false
  }
}

export default {
  sendApprovalRequest,
  sendApprovalConfirmation,
  sendApprovalReminder,
  sendTeamNotification
}
