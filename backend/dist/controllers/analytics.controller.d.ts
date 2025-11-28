import { Request, Response } from 'express';
/**
 * Get user analytics dashboard data
 * @route GET /api/analytics/dashboard
 */
export declare const getDashboardAnalytics: (req: Request, res: Response) => Promise<void>;
/**
 * Get detailed conversion history with filters
 * @route GET /api/analytics/history
 */
export declare const getConversionHistory: (req: Request, res: Response) => Promise<void>;
/**
 * Export analytics data as CSV
 * @route GET /api/analytics/export
 */
export declare const exportAnalytics: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=analytics.controller.d.ts.map