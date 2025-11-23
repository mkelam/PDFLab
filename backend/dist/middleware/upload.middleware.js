"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.uploadMultipleMiddleware = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
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
//# sourceMappingURL=upload.middleware.js.map