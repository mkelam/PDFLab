import { Request, Response } from 'express';
/**
 * Partner Dashboard Controller
 *
 * Provides API endpoints for:
 * 1. Partner authentication
 * 2. Partner performance tracking
 * 3. Referral analytics
 * 4. Commission calculations
 * 5. Promo code management
 */
/**
 * POST /api/partners/login
 * Partner login endpoint
 */
export declare const partnerLogin: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/partners/:slug/dashboard
 * Get partner dashboard with performance metrics
 */
export declare const getPartnerDashboard: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/partners/:slug/referrals
 * Get all referrals for a partner (with pagination)
 */
export declare const getPartnerReferrals: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/partners
 * Create a new partner (admin only)
 */
export declare const createPartner: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/partners
 * Get all partners (admin only)
 */
export declare const getAllPartners: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/partners/:id/promo-code
 * Create a new promo code for a partner (admin only)
 */
export declare const createPromoCode: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/attribution/stats
 * Get overall attribution statistics (admin only)
 */
export declare const getAttributionStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=partner.controller.d.ts.map