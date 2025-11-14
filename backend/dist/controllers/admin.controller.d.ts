import { Request, Response } from 'express';
/**
 * GET /api/admin/users
 * Get all users with search, filtering, and pagination
 * Query params: search, plan, role, status, page, limit, sortBy, sortOrder
 */
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/beta-users
 * Get all beta users (users with is_beta_user = true)
 * Query params: search, page, limit, sortBy, sortOrder
 */
export declare const getBetaUsers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
export declare const getUserById: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /api/admin/users/:id
 * Update user profile (name, email, plan, role)
 */
export declare const updateUser: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /api/admin/users/:id/plan
 * Update user plan/tier
 */
export declare const updateUserPlan: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /api/admin/users/:id/quota
 * Reset user conversion quota
 */
export declare const resetUserQuota: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users/:id/reset-password
 * Generate password reset link/token for user
 */
export declare const resetUserPassword: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users/:id/resend-verification
 * Resend email verification to user
 */
export declare const resendVerificationEmail: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users/:id/verify-email
 * Manually verify user's email (admin only)
 */
export declare const verifyUserEmail: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export declare const createUser: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users/:id/impersonate
 * Generate temporary impersonation token (super admin only)
 */
export declare const impersonateUser: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only)
 */
export declare const deleteUser: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/users/:id/conversions
 * Get user's conversion history
 */
export declare const getUserConversions: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/users/:id/activity
 * Get user's activity timeline (logins, conversions, payments)
 */
export declare const getUserActivity: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users/bulk-quota-reset
 * Reset quota for multiple users at once
 */
export declare const bulkQuotaReset: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/users/export
 * Export users to CSV (respects filters)
 */
export declare const exportUsersToCSV: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/stats
 * Get platform statistics
 */
export declare const getStats: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/quota-status
 * Get quota status for all users (shows who needs fixing)
 */
export declare const getQuotaStatus: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/fix-quotas
 * Fix quota limits for ALL users based on their plans
 */
export declare const fixQuotas: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/users/:id/sync-quota
 * Sync quota for a specific user
 */
export declare const syncUserQuotaEndpoint: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map