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
//# sourceMappingURL=system.admin.controller.d.ts.map