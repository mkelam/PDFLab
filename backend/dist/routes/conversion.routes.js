"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversion_controller_1 = require("../controllers/conversion.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const ratelimit_middleware_1 = require("../middleware/ratelimit.middleware");
const guest_middleware_1 = require("../middleware/guest.middleware");
const analytics_middleware_1 = require("../middleware/analytics.middleware");
const router = (0, express_1.Router)();
// Upload and start conversion (supports both authenticated and guest users)
router.post('/upload', auth_middleware_1.optionalAuthMiddleware, // Auth is optional - allows guests
ratelimit_middleware_1.uploadLimiter, guest_middleware_1.validateGuestQuota, // Check guest quota if not authenticated
analytics_middleware_1.trackQuotaReached, // Track when guests hit quota limit
auth_middleware_1.checkConversionQuota, // Check user quota if authenticated
upload_middleware_1.uploadMiddleware.single('file'), upload_middleware_1.handleUploadError, analytics_middleware_1.trackUpload, // Track successful uploads
conversion_controller_1.uploadFile);
// Batch convert multiple files (requires authentication - Pro/Enterprise only)
router.post('/batch-convert', ratelimit_middleware_1.uploadLimiter, auth_middleware_1.authMiddleware, upload_middleware_1.uploadMultipleMiddleware.array('files', 10), upload_middleware_1.handleUploadError, analytics_middleware_1.trackUpload, conversion_controller_1.batchConvert);
// Compress PDF (requires authentication)
router.post('/compress', ratelimit_middleware_1.uploadLimiter, auth_middleware_1.authMiddleware, auth_middleware_1.checkConversionQuota, upload_middleware_1.uploadMiddleware.single('file'), upload_middleware_1.handleUploadError, analytics_middleware_1.trackUpload, conversion_controller_1.compressPDF);
// Merge multiple PDFs
router.post('/merge', auth_middleware_1.authMiddleware, ratelimit_middleware_1.uploadLimiter, auth_middleware_1.checkConversionQuota, upload_middleware_1.uploadMultipleMiddleware.array('files', 10), upload_middleware_1.handleUploadError, conversion_controller_1.mergePDFs);
// Get job status (public - no auth required)
router.get('/status/:job_id', conversion_controller_1.getJobStatus);
// Download converted file (supports both authenticated and guest users)
router.get('/download/:job_id', ratelimit_middleware_1.downloadLimiter, auth_middleware_1.optionalAuthMiddleware, analytics_middleware_1.trackDownload, conversion_controller_1.downloadFile);
// Download multiple files as ZIP (batch conversion results)
router.get('/download-batch', ratelimit_middleware_1.downloadLimiter, auth_middleware_1.optionalAuthMiddleware, conversion_controller_1.downloadBatchZip);
// Get conversion history (requires authentication)
router.get('/history', auth_middleware_1.authMiddleware, conversion_controller_1.getConversionHistory);
exports.default = router;
//# sourceMappingURL=conversion.routes.js.map