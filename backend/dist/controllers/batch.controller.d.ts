import { Request, Response } from 'express';
/**
 * Upload multiple files for batch processing
 * POST /api/batch/upload
 */
export declare const uploadBatchFiles: (req: Request, res: Response) => Promise<void>;
/**
 * Get batch job status with individual file progress
 * GET /api/batch/status/:id
 */
export declare const getBatchStatus: (req: Request, res: Response) => Promise<void>;
/**
 * Download ZIP archive of all converted files in batch
 * GET /api/batch/download/:id
 */
export declare const downloadBatchZip: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's batch history
 * GET /api/batch/history
 */
export declare const getBatchHistory: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel batch job (if not started or in progress)
 * DELETE /api/batch/:id
 */
export declare const cancelBatch: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=batch.controller.d.ts.map