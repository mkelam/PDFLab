import { Request, Response } from 'express';
/**
 * Get overall system health summary
 * GET /api/admin/system/health
 */
export declare const getSystemHealth: (_req: Request, res: Response) => Promise<void>;
/**
 * Get CloudConvert API health
 * GET /api/admin/system/cloudconvert
 */
export declare const getCloudConvertHealth: (req: Request, res: Response) => Promise<void>;
/**
 * Get storage usage details
 * GET /api/admin/system/storage
 */
export declare const getStorageHealth: (req: Request, res: Response) => Promise<void>;
/**
 * Get recent error logs
 * GET /api/admin/system/errors
 */
export declare const getErrorLogs: (req: Request, res: Response) => Promise<void>;
/**
 * Test conversion operation
 * POST /api/admin/system/test-conversion
 */
export declare const testConversion: (req: Request, res: Response) => Promise<void>;
/**
 * Clear Redis cache
 * POST /api/admin/system/clear-cache
 */
export declare const clearCache: (_req: Request, res: Response) => Promise<void>;
/**
 * Trigger storage cleanup
 * POST /api/admin/system/cleanup-storage
 */
export declare const cleanupStorage: (req: Request, res: Response) => Promise<void>;
/**
 * Get application flow health (7-stage comprehensive pipeline)
 * GET /api/admin/system/flow-health
 *
 * Stages: Auth → Upload → Database → Convert → Download → Payment → Email
 */
export declare const getApplicationFlowHealth: (_req: Request, res: Response) => Promise<void>;
/**
 * Get business metrics
 * GET /api/admin/system/business-metrics
 */
export declare const getBusinessMetrics: (_req: Request, res: Response) => Promise<void>;
/**
 * Get environment configuration validation
 * GET /api/admin/system/environment-config
 */
export declare const getEnvironmentConfig: (_req: Request, res: Response) => Promise<void>;
/**
 * Get recent error stream (last 10 errors from past hour)
 * GET /api/admin/system/recent-errors
 */
export declare const getRecentErrors: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=system.admin.controller.d.ts.map