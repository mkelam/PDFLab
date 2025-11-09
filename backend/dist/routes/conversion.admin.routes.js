"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversion_admin_controller_1 = require("../controllers/conversion.admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const router = (0, express_1.Router)();
/**
 * Admin routes for conversion job monitoring
 * All routes require authentication + admin role
 */
// Apply authentication and admin check
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.requireAdmin);
// Apply audit logging
router.use(audit_middleware_1.auditLogMiddleware);
// Get all conversion jobs (support, admin, super_admin)
router.get('/conversions', (0, admin_middleware_1.requirePermission)('users.view'), conversion_admin_controller_1.getAllConversionJobs);
// Get single job details
router.get('/conversions/:id', (0, admin_middleware_1.requirePermission)('users.view'), conversion_admin_controller_1.getConversionJobById);
// Retry failed job (admin, super_admin)
router.post('/conversions/:id/retry', (0, admin_middleware_1.requirePermission)('users.edit'), conversion_admin_controller_1.retryConversionJob);
// Cancel pending/processing job (admin, super_admin)
router.post('/conversions/:id/cancel', (0, admin_middleware_1.requirePermission)('users.edit'), conversion_admin_controller_1.cancelConversionJob);
// Delete job (super_admin)
router.delete('/conversions/:id', (0, admin_middleware_1.requirePermission)('users.delete'), conversion_admin_controller_1.deleteConversionJob);
// Bulk retry failed jobs (admin, super_admin)
router.post('/conversions/bulk-retry', (0, admin_middleware_1.requirePermission)('users.edit'), conversion_admin_controller_1.bulkRetryJobs);
// Get queue health status
router.get('/queue/status', (0, admin_middleware_1.requirePermission)('users.view'), conversion_admin_controller_1.getQueueStatus);
exports.default = router;
//# sourceMappingURL=conversion.admin.routes.js.map