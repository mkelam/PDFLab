"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_admin_controller_1 = require("../controllers/system.admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const router = (0, express_1.Router)();
/**
 * Admin routes for system health monitoring
 * All routes require authentication + admin role
 * Manual operations logged to audit trail
 */
// Apply authentication to all admin routes
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.requireAdmin);
// ==================== Health Monitoring (Read) ====================
// Get overall system health (all admin roles can view)
router.get('/health', (0, admin_middleware_1.requirePermission)('users.view'), system_admin_controller_1.getSystemHealth);
// Get CloudConvert API health
router.get('/cloudconvert', (0, admin_middleware_1.requirePermission)('users.view'), system_admin_controller_1.getCloudConvertHealth);
// Get storage usage details
router.get('/storage', (0, admin_middleware_1.requirePermission)('users.view'), system_admin_controller_1.getStorageHealth);
// Get recent error logs
router.get('/errors', (0, admin_middleware_1.requirePermission)('users.view'), system_admin_controller_1.getErrorLogs);
// ==================== Manual Operations (Write) ====================
// Apply audit logging to all manual operations
router.use(audit_middleware_1.auditLogMiddleware);
// Test conversion (admin, super_admin)
router.post('/test-conversion', (0, admin_middleware_1.requirePermission)('users.edit'), system_admin_controller_1.testConversion);
// Clear Redis cache (admin, super_admin)
router.post('/clear-cache', (0, admin_middleware_1.requirePermission)('users.edit'), system_admin_controller_1.clearCache);
// Cleanup storage (admin, super_admin)
router.post('/cleanup-storage', (0, admin_middleware_1.requirePermission)('users.edit'), system_admin_controller_1.cleanupStorage);
exports.default = router;
//# sourceMappingURL=system.admin.routes.js.map