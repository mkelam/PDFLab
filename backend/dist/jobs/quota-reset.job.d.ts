import { CronJob } from 'cron';
/**
 * Reset conversion quotas for all users
 */
export declare const resetMonthlyQuotas: () => Promise<void>;
/**
 * Reset quota based on subscription anniversary (alternative approach)
 * This version resets quota 30 days after subscription start
 */
export declare const resetSubscriptionQuotas: () => Promise<void>;
/**
 * Initialize quota reset cron job
 */
export declare const initializeQuotaResetJob: () => CronJob | null;
/**
 * Manually trigger quota reset (for testing or admin actions)
 */
export declare const manualQuotaReset: (userId?: string) => Promise<{
    success: boolean;
    affected: number;
}>;
declare const _default: {
    initializeQuotaResetJob: () => CronJob | null;
    resetMonthlyQuotas: () => Promise<void>;
    resetSubscriptionQuotas: () => Promise<void>;
    manualQuotaReset: (userId?: string) => Promise<{
        success: boolean;
        affected: number;
    }>;
};
export default _default;
//# sourceMappingURL=quota-reset.job.d.ts.map