"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_admin_controller_1 = require("../controllers/audit.admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = (0, express_1.Router)();
/**
 * Admin routes for audit logs and compliance
 * All routes require authentication + admin role
 * Note: Audit logging middleware not applied here to avoid logging log views
 */
// Apply authentication to all admin routes
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.requireAdmin);
// ==================== Audit Logs ====================
// Get all audit logs with filters (admin, super_admin can view)
router.get('/', (0, admin_middleware_1.requirePermission)('users.view'), audit_admin_controller_1.getAllAuditLogs);
// Get security events (last 24 hours) - MUST be before /:id
router.get('/security-events', (0, admin_middleware_1.requirePermission)('users.view'), audit_admin_controller_1.getSecurityEvents);
// Get audit log statistics - MUST be before /:id
router.get('/stats', (0, admin_middleware_1.requirePermission)('users.view'), audit_admin_controller_1.getAuditLogStats);
// Get user activity for GDPR compliance (admin, super_admin) - MUST be before /:id
router.get('/user-activity/:user_id', (0, admin_middleware_1.requirePermission)('users.view'), audit_admin_controller_1.getUserActivity);
// Get single audit log details - MUST be last to avoid catching other routes
router.get('/:id', (0, admin_middleware_1.requirePermission)('users.view'), audit_admin_controller_1.getAuditLogById);
exports.default = router;
//# sourceMappingURL=audit.admin.routes.js.map