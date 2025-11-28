"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMultipleFileMagicBytes = exports.validateFileMagicBytes = exports.handleUploadError = exports.uploadMultipleMiddleware = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const file_type_1 = __importDefault(require("file-type"));
const logger_1 = __importDefault(require("../config/logger"));
// PDF magic bytes (header signature)
// PDF files start with "%PDF-" (hex: 25 50 44 46 2D)
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
// Helper function to get absolute storage path
const getStoragePath = () => {
    const storagePath = process.env['STORAGE_PATH'] || './storage';
    return path_1.default.resolve(storagePath);
};
// Storage configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Use userId for authenticated users, 'guest' for guest users
        const userId = req.userId || 'guest';
        const jobId = (0, uuid_1.v4)();
        const uploadPath = path_1.default.join(getStoragePath(), 'uploads', userId, jobId);
        // Create directory if it doesn't exist
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
        req.jobId = jobId;
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Keep original filename with timestamp
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/\s+/g, '-');
        cb(null, `${timestamp}-${originalName}`);
    }
});
// File filter - only PDFs
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    }
    else {
        cb(new Error('Only PDF files are allowed'));
    }
};
// Multer configuration for single file upload
// Note: Using maximum possible size (500MB for enterprise), plan-specific validation done in routes
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 524288000, // 500MB max (enterprise limit)
        files: 1 // Single file upload
    }
});
// Multer configuration for multiple file uploads (for PDF merge)
// Note: Using maximum possible size (500MB for enterprise), plan-specific validation done in routes
exports.uploadMultipleMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 524288000, // 500MB max (enterprise limit)
        files: 10 // Maximum 10 files for merging
    }
});
// Error handler for multer errors
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                message: 'File size exceeds your plan limit',
                code: err.code
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                message: 'Please upload only one file at a time',
                code: err.code
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected field',
                message: 'Unexpected file field in the request',
                code: err.code
            });
        }
    }
    if (err.message === 'Only PDF files are allowed') {
        return res.status(400).json({
            error: 'Invalid file type',
            message: 'Only PDF files are allowed'
        });
    }
    // Generic error
    return res.status(500).json({
        error: 'Upload failed',
        message: err.message || 'An error occurred during file upload'
    });
};
exports.handleUploadError = handleUploadError;
/**
 * Validate uploaded file by checking magic bytes
 * This runs AFTER multer has saved the file to disk
 * Provides defense-in-depth against spoofed MIME types
 */
const validateFileMagicBytes = async (req, res, next) => {
    const file = req.file;
    if (!file) {
        return next();
    }
    try {
        // Read the first few bytes of the file
        const buffer = Buffer.alloc(8); // PDF magic bytes are in first 5 bytes
        const fd = fs_1.default.openSync(file.path, 'r');
        fs_1.default.readSync(fd, buffer, 0, 8, 0);
        fs_1.default.closeSync(fd);
        // Check PDF magic bytes (%PDF-)
        const isPdfMagicValid = buffer.slice(0, 5).equals(PDF_MAGIC_BYTES);
        if (!isPdfMagicValid) {
            // Also try file-type library as a fallback
            const fileTypeResult = await file_type_1.default.fromFile(file.path);
            if (!fileTypeResult || fileTypeResult.mime !== 'application/pdf') {
                // Delete the suspicious file
                try {
                    fs_1.default.unlinkSync(file.path);
                    // Also clean up the job directory if empty
                    const jobDir = path_1.default.dirname(file.path);
                    const filesInDir = fs_1.default.readdirSync(jobDir);
                    if (filesInDir.length === 0) {
                        fs_1.default.rmdirSync(jobDir);
                    }
                }
                catch (cleanupError) {
                    logger_1.default.error('Failed to clean up invalid file:', { error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
                }
                logger_1.default.warn('Rejected file with spoofed MIME type', {
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    detectedType: fileTypeResult?.mime || 'unknown',
                    ip: req.ip
                });
                res.status(400).json({
                    error: 'Invalid file',
                    message: 'The uploaded file is not a valid PDF document. Please ensure you are uploading an actual PDF file.'
                });
                return;
            }
        }
        logger_1.default.debug('File magic bytes validated', { originalname: file.originalname });
        next();
    }
    catch (error) {
        logger_1.default.error('Error validating file magic bytes:', { error: error instanceof Error ? error.message : String(error) });
        // Clean up the file on error
        try {
            if (file.path && fs_1.default.existsSync(file.path)) {
                fs_1.default.unlinkSync(file.path);
            }
        }
        catch (cleanupError) {
            // Ignore cleanup errors
        }
        res.status(500).json({
            error: 'Validation failed',
            message: 'An error occurred while validating the uploaded file'
        });
    }
};
exports.validateFileMagicBytes = validateFileMagicBytes;
/**
 * Validate multiple uploaded files by checking magic bytes
 * For PDF merge operations
 */
const validateMultipleFileMagicBytes = async (req, res, next) => {
    const files = req.files;
    if (!files || files.length === 0) {
        return next();
    }
    try {
        for (const file of files) {
            // Read the first few bytes of the file
            const buffer = Buffer.alloc(8);
            const fd = fs_1.default.openSync(file.path, 'r');
            fs_1.default.readSync(fd, buffer, 0, 8, 0);
            fs_1.default.closeSync(fd);
            // Check PDF magic bytes
            const isPdfMagicValid = buffer.slice(0, 5).equals(PDF_MAGIC_BYTES);
            if (!isPdfMagicValid) {
                const fileTypeResult = await file_type_1.default.fromFile(file.path);
                if (!fileTypeResult || fileTypeResult.mime !== 'application/pdf') {
                    // Delete all uploaded files
                    for (const f of files) {
                        try {
                            if (fs_1.default.existsSync(f.path)) {
                                fs_1.default.unlinkSync(f.path);
                            }
                        }
                        catch (cleanupError) {
                            // Ignore cleanup errors
                        }
                    }
                    logger_1.default.warn('Rejected file with spoofed MIME type in batch upload', {
                        originalname: file.originalname,
                        mimetype: file.mimetype,
                        detectedType: fileTypeResult?.mime || 'unknown',
                        ip: req.ip
                    });
                    res.status(400).json({
                        error: 'Invalid file',
                        message: `The file "${file.originalname}" is not a valid PDF document. All files must be valid PDF files.`
                    });
                    return;
                }
            }
        }
        logger_1.default.debug('All files magic bytes validated', { fileCount: files.length });
        next();
    }
    catch (error) {
        logger_1.default.error('Error validating multiple file magic bytes:', { error: error instanceof Error ? error.message : String(error) });
        // Clean up all files on error
        const files = req.files;
        if (files) {
            for (const file of files) {
                try {
                    if (fs_1.default.existsSync(file.path)) {
                        fs_1.default.unlinkSync(file.path);
                    }
                }
                catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
        }
        res.status(500).json({
            error: 'Validation failed',
            message: 'An error occurred while validating the uploaded files'
        });
    }
};
exports.validateMultipleFileMagicBytes = validateMultipleFileMagicBytes;
//# sourceMappingURL=upload.middleware.js.map