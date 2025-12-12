import { Request, Response } from 'express';
/**
 * Get user analytics dashboard data
 * @route GET /api/analytics/dashboard
 */
export declare const getDashboardAnalytics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Get detailed conversion history with filters
 * @route GET /api/analytics/history
 */
export declare const getConversionHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Export analytics data as CSV
 * @route GET /api/analytics/export
 */
export declare const exportAnalytics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=analytics.controller.d.ts.map