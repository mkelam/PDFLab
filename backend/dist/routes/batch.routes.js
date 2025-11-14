"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const batch_controller_1 = require("../controllers/batch.controller");
const router = (0, express_1.Router)();
/**
 * Batch Processing Routes
 * All routes require authentication
 */
// Upload multiple files for batch processing
// Supports up to 50 files (plan-dependent limits apply)
router.post('/upload', auth_middleware_1.authMiddleware, upload_middleware_1.uploadMultipleMiddleware.array('files', 50), // Max 50 files (will be filtered by plan limits)
batch_controller_1.uploadBatchFiles);
// Get batch job status with individual file progress
router.get('/status/:id', auth_middleware_1.authMiddleware, batch_controller_1.getBatchStatus);
// Download ZIP archive of all converted files
router.get('/download/:id', auth_middleware_1.authMiddleware, batch_controller_1.downloadBatchZip);
// Get user's batch processing history
router.get('/history', auth_middleware_1.authMiddleware, batch_controller_1.getBatchHistory);
// Cancel batch job (if pending or processing)
router.delete('/:id', auth_middleware_1.authMiddleware, batch_controller_1.cancelBatch);
exports.default = router;
//# sourceMappingURL=batch.routes.js.map