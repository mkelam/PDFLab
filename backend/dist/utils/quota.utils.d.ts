/**
 * Quota Management Utilities
 * Centralized quota logic to ensure consistency across the application
 */
import { User, UserPlan } from '../models/User';
export declare const PLAN_QUOTAS: {
    free: {
        conversions_limit: number;
        max_file_size: number;
        batch_size: number;
    };
    starter: {
        conversions_limit: number;
        max_file_size: number;
        batch_size: number;
    };
    pro: {
        conversions_limit: number;
        max_file_size: number;
        batch_size: number;
    };
    enterprise: {
        conversions_limit: number;
        max_file_size: number;
        batch_size: number;
    };
};
/**
 * Sync user quota to match their current plan
 * IMPORTANT: Call this whenever a user's plan changes
 */
export declare function syncUserQuota(user: User): Promise<void>;
/**
 * Update user plan and sync quota
 * Use this instead of manually setting user.plan
 */
export declare function updateUserPlan(user: User, newPlan: UserPlan, resetUsage?: boolean): Promise<void>;
/**
 * Fix quota for existing users (migration utility)
 * Call this to repair users who have incorrect quota limits
 */
export declare function fixAllUserQuotas(): Promise<{
    fixed: number;
    total: number;
}>;
/**
 * Check if user can perform a conversion
 */
export declare function canUserConvert(user: User, requiredConversions?: number): {
    allowed: boolean;
    reason?: string;
};
/**
 * Get quota information for a user
 */
export declare function getQuotaInfo(user: User): {
    plan: UserPlan;
    conversions_used: number;
    conversions_limit: number;
    conversions_remaining: string | number;
    expected_limit: number;
    is_synced: boolean;
    max_file_size: number;
    batch_size: number;
};
//# sourceMappingURL=quota.utils.d.ts.map