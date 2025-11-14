import { Request, Response } from 'express';
/**
 * Compress PDF file to reduce size
 */
export declare const compressPDF: (req: Request, res: Response) => Promise<void>;
/**
 * Merge multiple PDF files
 */
export declare const mergePDFs: (req: Request, res: Response) => Promise<void>;
/**
 * Batch convert multiple PDF files to the same format
 * Requires authentication (Pro/Enterprise plans)
 */
export declare const batchConvert: (req: Request, res: Response) => Promise<void>;
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
 * Download multiple batch conversion results as a ZIP file
 * Supports batch conversions where multiple files were converted
 */
export declare const downloadBatchZip: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's conversion history
 */
export declare const getConversionHistory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=conversion.controller.d.ts.map