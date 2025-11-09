import { Request, Response } from 'express';
/**
 * GET /api/admin/conversions
 * List all conversion jobs with filtering and pagination
 */
export declare const getAllConversionJobs: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/conversions/:id
 * Get detailed job information
 */
export declare const getConversionJobById: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/conversions/:id/retry
 * Retry a failed conversion job
 */
export declare const retryConversionJob: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/conversions/:id/cancel
 * Cancel a pending/processing job
 */
export declare const cancelConversionJob: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/admin/conversions/:id
 * Delete a conversion job
 */
export declare const deleteConversionJob: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/conversions/bulk-retry
 * Retry multiple failed jobs
 */
export declare const bulkRetryJobs: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/queue/status
 * Get Bull queue health metrics
 */
export declare const getQueueStatus: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=conversion.admin.controller.d.ts.map