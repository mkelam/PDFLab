import { Request, Response } from 'express';
/**
 * Get analytics overview
 * GET /api/admin/analytics/overview
 */
export declare const getAnalyticsOverview: (req: Request, res: Response) => Promise<void>;
/**
 * Get user analytics
 * GET /api/admin/analytics/users
 */
export declare const getUserAnalytics: (req: Request, res: Response) => Promise<void>;
/**
 * Get conversion analytics
 * GET /api/admin/analytics/conversions
 */
export declare const getConversionAnalytics: (req: Request, res: Response) => Promise<void>;
/**
 * Get revenue analytics
 * GET /api/admin/analytics/revenue
 */
export declare const getRevenueAnalytics: (req: Request, res: Response) => Promise<void>;
/**
 * Get feature adoption analytics
 * GET /api/admin/analytics/features
 */
export declare const getFeatureAnalytics: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=analytics.admin.controller.d.ts.map