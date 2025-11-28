import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
export declare const uploadMiddleware: multer.Multer;
export declare const uploadMultipleMiddleware: multer.Multer;
export declare const handleUploadError: (err: any, req: Request, res: any, next: any) => any;
/**
 * Validate uploaded file by checking magic bytes
 * This runs AFTER multer has saved the file to disk
 * Provides defense-in-depth against spoofed MIME types
 */
export declare const validateFileMagicBytes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate multiple uploaded files by checking magic bytes
 * For PDF merge operations
 */
export declare const validateMultipleFileMagicBytes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=upload.middleware.d.ts.map