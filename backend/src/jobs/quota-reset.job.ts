import { CronJob } from 'cron'
import { User } from '../models'
import { Op} from 'sequelize'
import logger from '../config/logger'

/**
 * Monthly Quota Reset Job
 * Resets conversions_used to 0 for all users on the 1st of each month at midnight
 */

const QUOTA_RESET_SCHEDULE = '0 0 1 * *' // At 00:00 on day-of-month 1

/**
 * Reset conversion quotas for all users
 */
export const resetMonthlyQuotas = async (): Promise<void> => {
  try {
    logger.info('[Quota Reset] Starting monthly quota reset...')

    const startTime = Date.now()

    // Reset conversions_used to 0 for all users
    const [affectedRows] = await User.update(
      { conversions_used: 0 },
      {
        where: {
          conversions_used: {
            [Op.gt]: 0 // Only update users who have used conversions
          }
        }
      }
    )

    const duration = Date.now() - startTime

    logger.info(`[Quota Reset] Monthly quota reset completed`)
    logger.info(`[Quota Reset] Users affected: ${affectedRows}`)
    logger.info(`[Quota Reset] Duration: ${duration}ms`)

    // Log the reset event (optional - could store in a separate audit table)
    // await QuotaResetLog.create({
    //   reset_date: new Date(),
    //   users_affected: affectedRows,
    //   duration_ms: duration
    // })
  } catch (error) {
    logger.error('[Quota Reset] Error during monthly quota reset:', { error: error instanceof Error ? error.message : String(error) })
    // In production, send alert to monitoring service (Sentry, Datadog, etc.)
    throw error
  }
}

/**
 * Reset quota based on subscription anniversary (alternative approach)
 * This version resets quota 30 days after subscription start
 */
export const resetSubscriptionQuotas = async (): Promise<void> => {
  try {
    logger.info('[Quota Reset] Starting subscription-based quota reset...')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Find users whose subscription started 30+ days ago and haven't been reset recently
    const usersToReset = await User.findAll({
      where: {
        conversions_used: {
          [Op.gt]: 0
        },
        // Add last_quota_reset field to User model to track this
        // last_quota_reset: {
        //   [Op.or]: [
        //     { [Op.is]: null },
        //     { [Op.lt]: thirtyDaysAgo }
        //   ]
        // }
      }
    })

    let resetCount = 0

    for (const user of usersToReset) {
      await user.update({
        conversions_used: 0,
        // last_quota_reset: new Date()
      })
      resetCount++
    }

    logger.info(`[Quota Reset] Subscription-based quota reset completed for ${resetCount} users`)
  } catch (error) {
    logger.error('[Quota Reset] Error during subscription quota reset:', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

/**
 * Initialize quota reset cron job
 */
export const initializeQuotaResetJob = (): CronJob | null => {
  try {
    logger.info('[Quota Reset] Initializing monthly quota reset cron job...')
    logger.info(`[Quota Reset] Schedule: ${QUOTA_RESET_SCHEDULE} (1st of month at midnight)`)

    const cronJob = new CronJob(
      QUOTA_RESET_SCHEDULE,
      resetMonthlyQuotas, // Function to run
      null, // onComplete (optional)
      true, // Start the job immediately
      'America/New_York' // Timezone (adjust to your timezone)
    )

    logger.info('✓ Quota reset cron job initialized and scheduled')
    logger.info(`✓ Next reset: ${cronJob.nextDate().toISO()}`)

    return cronJob
  } catch (error) {
    logger.error('✗ Failed to initialize quota reset cron job:', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * Manually trigger quota reset (for testing or admin actions)
 */
export const manualQuotaReset = async (userId?: string): Promise<{ success: boolean; affected: number }> => {
  try {
    if (userId) {
      // Reset specific user
      const [affectedRows] = await User.update(
        { conversions_used: 0 },
        { where: { id: userId } }
      )

      logger.info(`[Quota Reset] Manual reset for user ${userId}: ${affectedRows} row(s) affected`)

      return { success: true, affected: affectedRows }
    } else {
      // Reset all users
      await resetMonthlyQuotas()
      return { success: true, affected: -1 } // -1 indicates all users
    }
  } catch (error) {
    logger.error('[Quota Reset] Manual reset failed:', { error: error instanceof Error ? error.message : String(error) })
    return { success: false, affected: 0 }
  }
}

// Export for testing
export default {
  initializeQuotaResetJob,
  resetMonthlyQuotas,
  resetSubscriptionQuotas,
  manualQuotaReset
}
