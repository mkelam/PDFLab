import { Request, Response } from 'express';
/**
 * GET /api/paygenius/plans
 * Get all available pricing plans
 */
export declare const getPlans: (_req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paygenius/initialize
 * Initialize a PayGenius payment - returns redirect URL for hosted payment page
 */
export declare const initializePayment: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paygenius/webhook
 * Handle PayGenius webhook notification
 */
export declare const handleWebhook: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/return
 * Handle successful payment return
 */
export declare const handleReturn: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/cancel
 * Handle cancelled payment
 */
export declare const handleCancel: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/error
 * Handle payment error
 */
export declare const handleError: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/subscription/:id
 * Get subscription details
 */
export declare const getSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paygenius/cancel-subscription
 * Cancel active subscription
 */
export declare const cancelSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/config
 * Get PayGenius configuration status
 */
export declare const getConfig: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/payment/:reference
 * Lookup payment status (useful for success page polling)
 */
export declare const lookupPayment: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paygenius/refund
 * Process a refund (admin only - protected by route middleware)
 */
export declare const processRefund: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paygenius/validate
 * Test API connection
 */
export declare const validateConnection: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=paygenius.controller.d.ts.map