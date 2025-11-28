import { Request, Response } from 'express';
/**
 * GET /api/payfast/plans
 * Get all available pricing plans
 */
export declare const getPlans: (_req: Request, res: Response) => Promise<void>;
/**
 * POST /api/payfast/initialize
 * Initialize a PayFast payment
 */
export declare const initializePayment: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/payfast/webhook
 * Handle PayFast ITN (Instant Transaction Notification)
 *
 * IMPORTANT: This handler uses database transactions to ensure data consistency.
 * All payment, subscription, and user updates are atomic - either all succeed or all fail.
 */
export declare const handleWebhook: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/payfast/return
 * Handle successful payment return
 */
export declare const handleReturn: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/payfast/cancel
 * Handle cancelled payment
 */
export declare const handleCancel: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/payfast/subscription/:id
 * Get subscription details
 */
export declare const getSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/payfast/cancel-subscription
 * Cancel active subscription
 */
export declare const cancelSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/payfast/config
 * Get PayFast configuration status
 */
export declare const getConfig: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=payfast.controller.d.ts.map