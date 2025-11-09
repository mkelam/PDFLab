import { Request, Response } from 'express';
/**
 * Merge multiple PDF files
 */
export declare const mergePDFs: (req: Request, res: Response) => Promise<void>;
/**
 * Upload file and create conversion job
 * Supports both authenticated users and guest users
 */
export declare const uploadFile: (req: Request, res: Response) => Promise<void>;
/**
 * Get conversion job status
 * Public endpoint - accessible by both authenticated and guest users
 */
export declare const getJobStatus: (req: Request, res: Response) => Promise<void>;
/**
 * Download converted file
 * Supports both authenticated and guest users
 */
export declare const downloadFile: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's conversion history
 */
export declare const getConversionHistory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=conversion.controller.d.ts.map