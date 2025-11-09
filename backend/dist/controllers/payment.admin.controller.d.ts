import { Request, Response } from 'express';
/**
 * Get all subscriptions with filters, search, and pagination
 * GET /api/admin/payments/subscriptions
 */
export declare const getAllSubscriptions: (req: Request, res: Response) => Promise<void>;
/**
 * Get subscription details with payment history
 * GET /api/admin/payments/subscriptions/:id
 */
export declare const getSubscriptionById: (req: Request, res: Response) => Promise<void>;
/**
 * Update subscription (manual plan change)
 * PUT /api/admin/payments/subscriptions/:id
 */
export declare const updateSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel subscription
 * POST /api/admin/payments/subscriptions/:id/cancel
 */
export declare const cancelSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * Pause subscription
 * POST /api/admin/payments/subscriptions/:id/pause
 */
export declare const pauseSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * Resume subscription
 * POST /api/admin/payments/subscriptions/:id/resume
 */
export declare const resumeSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * Get all payment transactions with filters
 * GET /api/admin/payments/transactions
 */
export declare const getAllTransactions: (req: Request, res: Response) => Promise<void>;
/**
 * Get transaction details
 * GET /api/admin/payments/transactions/:id
 */
export declare const getTransactionById: (req: Request, res: Response) => Promise<void>;
/**
 * Process refund
 * POST /api/admin/payments/refund
 */
export declare const processRefund: (req: Request, res: Response) => Promise<void>;
/**
 * Get ITN logs for debugging
 * GET /api/admin/payments/itn-logs
 */
export declare const getITNLogs: (req: Request, res: Response) => Promise<void>;
/**
 * Get revenue analytics (MRR, churn rate, LTV)
 * GET /api/admin/payments/analytics
 */
export declare const getRevenueAnalytics: (req: Request, res: Response) => Promise<void>;
/**
 * Retry failed payment
 * POST /api/admin/payments/retry-failed
 */
export declare const retryFailedPayment: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=payment.admin.controller.d.ts.map