/**
 * Reminder Cron Job
 * Sends automated reminders for overdue approvals
 * Run via: node dist/cron/reminders.js
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import { createLogger } from '../lib/logger.js'
import { sendApprovalReminder } from '../services/email.js'

const logger = createLogger('cron:reminders')

// Reminder schedule: 3 days, 7 days, 14 days
const REMINDER_THRESHOLDS = [
  { days: 3, type: 'FIRST' as const },
  { days: 7, type: 'SECOND' as const },
  { days: 14, type: 'ESCALATION' as const },
]

async function processReminders() {
  logger.info('Starting reminder processing')

  try {
    // Get all pending approvals
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() }, // Not expired
      },
      include: {
        client: true,
        project: {
          include: {
            organization: true
          }
        }
      }
    })

    logger.info({ count: pendingApprovals.length }, 'Found pending approvals')

    let sentCount = 0

    for (const approval of pendingApprovals) {
      const daysPending = Math.floor(
        (Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Find applicable reminder threshold
      const threshold = REMINDER_THRESHOLDS.find(t => {
        // Check if we've reached this threshold and haven't sent this type yet
        if (daysPending >= t.days) {
          // Check reminder count to determine which type we're on
          if (t.type === 'FIRST' && approval.reminderCount === 0) return true
          if (t.type === 'SECOND' && approval.reminderCount === 1) return true
          if (t.type === 'ESCALATION' && approval.reminderCount >= 2 && approval.reminderCount < 5) return true
        }
        return false
      })

      if (!threshold) continue

      // Check if we sent a reminder recently (within 24 hours)
      if (approval.lastReminderAt) {
        const hoursSinceLastReminder = 
          (Date.now() - approval.lastReminderAt.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastReminder < 24) continue
      }

      // Send reminder
      const sent = await sendApprovalReminder({
        to: approval.client.email,
        clientName: approval.client.firstName,
        projectName: approval.project.name,
        stageName: approval.stageLabel,
        approvalToken: approval.token,
        daysPending
      })

      if (sent) {
        // Update approval
        await prisma.approval.update({
          where: { id: approval.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date()
          }
        })

        // Note: Reminder record not created for automated sends
        // as sentById is required. Track via approval.reminderCount instead.

        sentCount++
        logger.info({
          approvalId: approval.id,
          type: threshold.type,
          daysPending
        }, 'Reminder sent')
      }
    }

    logger.info({ sentCount }, 'Reminder processing complete')
  } catch (error) {
    logger.error({ error }, 'Reminder processing failed')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run
processReminders()
  .then(() => {
    logger.info('Cron job finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    logger.error({ error }, 'Cron job failed')
    process.exit(1)
  })
