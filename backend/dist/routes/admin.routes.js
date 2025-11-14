"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const models_1 = require("../models");
const router = (0, express_1.Router)();
/**
 * Admin routes for user management
 * All routes require authentication + admin role
 * All actions are automatically logged to audit trail
 */
// Apply authentication to all admin routes
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.requireAdmin);
// Apply audit logging to all admin actions
router.use(audit_middleware_1.auditLogMiddleware);
// Get all users (support, admin, super_admin can view)
router.get('/users', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.getAllUsers);
// Get beta users only (support, admin, super_admin can view)
router.get('/beta-users', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.getBetaUsers);
// Export users to CSV (respects filters)
router.get('/users/export', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.exportUsersToCSV);
// Bulk quota reset (admin and super_admin only)
router.post('/users/bulk-quota-reset', (0, admin_middleware_1.requirePermission)('users.edit'), admin_controller_1.bulkQuotaReset);
// Get single user by ID
router.get('/users/:id', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.getUserById);
// Get platform stats (all admin roles can view)
router.get('/stats', admin_controller_1.getStats);
// Create new user (admin and super_admin only)
router.post('/users', (0, admin_middleware_1.requireRole)(models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN), admin_controller_1.createUser);
// Update user profile (admin and super_admin only)
router.put('/users/:id', (0, admin_middleware_1.requirePermission)('users.edit'), admin_controller_1.updateUser);
// Update user plan (admin and super_admin only)
router.put('/users/:id/plan', (0, admin_middleware_1.requirePermission)('users.edit'), admin_controller_1.updateUserPlan);
// Reset user quota (support, admin, super_admin)
router.put('/users/:id/quota', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.resetUserQuota);
// Generate password reset link (support, admin, super_admin)
router.post('/users/:id/reset-password', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.resetUserPassword);
// Resend verification email (support, admin, super_admin)
router.post('/users/:id/resend-verification', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.resendVerificationEmail);
// Manually verify user email (admin and super_admin only)
router.post('/users/:id/verify-email', (0, admin_middleware_1.requirePermission)('users.edit'), admin_controller_1.verifyUserEmail);
// Impersonate user (super_admin only)
router.post('/users/:id/impersonate', (0, admin_middleware_1.requireRole)(models_1.UserRole.SUPER_ADMIN), admin_controller_1.impersonateUser);
// Get user's conversion history (support, admin, super_admin)
router.get('/users/:id/conversions', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.getUserConversions);
// Get user's activity timeline (support, admin, super_admin)
router.get('/users/:id/activity', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.getUserActivity);
// Delete user (super_admin only)
router.delete('/users/:id', (0, admin_middleware_1.requirePermission)('users.delete'), admin_controller_1.deleteUser);
// Quota Management Routes (admin and super_admin only)
// Get quota status for all users (shows who needs fixing)
router.get('/quota-status', (0, admin_middleware_1.requirePermission)('users.view'), admin_controller_1.getQuotaStatus);
// Fix ALL user quotas based on their plans
router.post('/fix-quotas', (0, admin_middleware_1.requirePermission)('users.edit'), admin_controller_1.fixQuotas);
// Sync quota for a specific user
router.post('/users/:id/sync-quota', (0, admin_middleware_1.requirePermission)('users.edit'), admin_controller_1.syncUserQuotaEndpoint);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map