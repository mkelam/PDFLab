import { Request, Response } from 'express';
/**
 * GET /api/paypal/plans
 * Get all available pricing plans
 */
export declare const getPlans: (_req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paypal/initialize
 * Initialize a PayPal payment - returns approval URL
 */
export declare const initializePayment: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paypal/capture
 * Capture payment after user approval (for one-time orders)
 */
export declare const capturePayment: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paypal/webhook
 * Handle PayPal webhook notifications
 */
export declare const handleWebhook: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paypal/return
 * Handle successful payment return
 */
export declare const handleReturn: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paypal/cancel
 * Handle cancelled payment
 */
export declare const handleCancel: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paypal/subscription/:id
 * Get subscription details
 */
export declare const getSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paypal/cancel-subscription
 * Cancel active subscription
 */
export declare const cancelSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paypal/config
 * Get PayPal configuration status
 */
export declare const getConfig: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paypal/validate
 * Test API connection
 */
export declare const validateConnection: (_req: Request, res: Response) => Promise<void>;
/**
 * POST /api/paypal/refund
 * Process a refund
 */
export declare const processRefund: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/paypal/payment/:reference
 * Lookup payment status
 */
export declare const lookupPayment: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=paypal.controller.d.ts.map