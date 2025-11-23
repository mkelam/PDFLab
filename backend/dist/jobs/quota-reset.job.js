"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualQuotaReset = exports.initializeQuotaResetJob = exports.resetSubscriptionQuotas = exports.resetMonthlyQuotas = void 0;
const cron_1 = require("cron");
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Monthly Quota Reset Job
 * Resets conversions_used to 0 for all users on the 1st of each month at midnight
 */
const QUOTA_RESET_SCHEDULE = '0 0 1 * *'; // At 00:00 on day-of-month 1
/**
 * Reset conversion quotas for all users
 */
const resetMonthlyQuotas = async () => {
    try {
        logger_1.default.info('[Quota Reset] Starting monthly quota reset...');
        const startTime = Date.now();
        // Reset conversions_used to 0 for all users
        const [affectedRows] = await models_1.User.update({ conversions_used: 0 }, {
            where: {
                conversions_used: {
                    [sequelize_1.Op.gt]: 0 // Only update users who have used conversions
                }
            }
        });
        const duration = Date.now() - startTime;
        logger_1.default.info(`[Quota Reset] Monthly quota reset completed`);
        logger_1.default.info(`[Quota Reset] Users affected: ${affectedRows}`);
        logger_1.default.info(`[Quota Reset] Duration: ${duration}ms`);
        // Log the reset event (optional - could store in a separate audit table)
        // await QuotaResetLog.create({
        //   reset_date: new Date(),
        //   users_affected: affectedRows,
        //   duration_ms: duration
        // })
    }
    catch (error) {
        logger_1.default.error('[Quota Reset] Error during monthly quota reset:', { error: error instanceof Error ? error.message : String(error) });
        // In production, send alert to monitoring service (Sentry, Datadog, etc.)
        throw error;
    }
};
exports.resetMonthlyQuotas = resetMonthlyQuotas;
/**
 * Reset quota based on subscription anniversary (alternative approach)
 * This version resets quota 30 days after subscription start
 */
const resetSubscriptionQuotas = async () => {
    try {
        logger_1.default.info('[Quota Reset] Starting subscription-based quota reset...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Find users whose subscription started 30+ days ago and haven't been reset recently
        const usersToReset = await models_1.User.findAll({
            where: {
                conversions_used: {
                    [sequelize_1.Op.gt]: 0
                },
                // Add last_quota_reset field to User model to track this
                // last_quota_reset: {
                //   [Op.or]: [
                //     { [Op.is]: null },
                //     { [Op.lt]: thirtyDaysAgo }
                //   ]
                // }
            }
        });
        let resetCount = 0;
        for (const user of usersToReset) {
            await user.update({
                conversions_used: 0,
                // last_quota_reset: new Date()
            });
            resetCount++;
        }
        logger_1.default.info(`[Quota Reset] Subscription-based quota reset completed for ${resetCount} users`);
    }
    catch (error) {
        logger_1.default.error('[Quota Reset] Error during subscription quota reset:', { error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
};
exports.resetSubscriptionQuotas = resetSubscriptionQuotas;
/**
 * Initialize quota reset cron job
 */
const initializeQuotaResetJob = () => {
    try {
        logger_1.default.info('[Quota Reset] Initializing monthly quota reset cron job...');
        logger_1.default.info(`[Quota Reset] Schedule: ${QUOTA_RESET_SCHEDULE} (1st of month at midnight)`);
        const cronJob = new cron_1.CronJob(QUOTA_RESET_SCHEDULE, exports.resetMonthlyQuotas, // Function to run
        null, // onComplete (optional)
        true, // Start the job immediately
        'America/New_York' // Timezone (adjust to your timezone)
        );
        logger_1.default.info('✓ Quota reset cron job initialized and scheduled');
        logger_1.default.info(`✓ Next reset: ${cronJob.nextDate().toISO()}`);
        return cronJob;
    }
    catch (error) {
        logger_1.default.error('✗ Failed to initialize quota reset cron job:', { error: error instanceof Error ? error.message : String(error) });
        return null;
    }
};
exports.initializeQuotaResetJob = initializeQuotaResetJob;
/**
 * Manually trigger quota reset (for testing or admin actions)
 */
const manualQuotaReset = async (userId) => {
    try {
        if (userId) {
            // Reset specific user
            const [affectedRows] = await models_1.User.update({ conversions_used: 0 }, { where: { id: userId } });
            logger_1.default.info(`[Quota Reset] Manual reset for user ${userId}: ${affectedRows} row(s) affected`);
            return { success: true, affected: affectedRows };
        }
        else {
            // Reset all users
            await (0, exports.resetMonthlyQuotas)();
            return { success: true, affected: -1 }; // -1 indicates all users
        }
    }
    catch (error) {
        logger_1.default.error('[Quota Reset] Manual reset failed:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, affected: 0 };
    }
};
exports.manualQuotaReset = manualQuotaReset;
// Export for testing
exports.default = {
    initializeQuotaResetJob: exports.initializeQuotaResetJob,
    resetMonthlyQuotas: exports.resetMonthlyQuotas,
    resetSubscriptionQuotas: exports.resetSubscriptionQuotas,
    manualQuotaReset: exports.manualQuotaReset
};
//# sourceMappingURL=quota-reset.job.js.map