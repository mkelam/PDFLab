"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_admin_controller_1 = require("../controllers/payment.admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const router = (0, express_1.Router)();
/**
 * Admin routes for payment and subscription management
 * All routes require authentication + admin role
 * All actions are automatically logged to audit trail
 */
// Apply authentication to all admin routes
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.requireAdmin);
// Apply audit logging to all admin actions
router.use(audit_middleware_1.auditLogMiddleware);
// ==================== Subscriptions ====================
// Get all subscriptions with filters (finance, admin, super_admin can view)
router.get('/subscriptions', (0, admin_middleware_1.requirePermission)('users.view'), payment_admin_controller_1.getAllSubscriptions);
// Get single subscription details
router.get('/subscriptions/:id', (0, admin_middleware_1.requirePermission)('users.view'), payment_admin_controller_1.getSubscriptionById);
// Update subscription (manual plan change - admin, super_admin)
router.put('/subscriptions/:id', (0, admin_middleware_1.requirePermission)('users.edit'), payment_admin_controller_1.updateSubscription);
// Cancel subscription (admin, super_admin)
router.post('/subscriptions/:id/cancel', (0, admin_middleware_1.requirePermission)('users.edit'), payment_admin_controller_1.cancelSubscription);
// Pause subscription (admin, super_admin)
router.post('/subscriptions/:id/pause', (0, admin_middleware_1.requirePermission)('users.edit'), payment_admin_controller_1.pauseSubscription);
// Resume subscription (admin, super_admin)
router.post('/subscriptions/:id/resume', (0, admin_middleware_1.requirePermission)('users.edit'), payment_admin_controller_1.resumeSubscription);
// ==================== Transactions ====================
// Get all payment transactions (finance, admin, super_admin)
router.get('/transactions', (0, admin_middleware_1.requirePermission)('users.view'), payment_admin_controller_1.getAllTransactions);
// Get single transaction details
router.get('/transactions/:id', (0, admin_middleware_1.requirePermission)('users.view'), payment_admin_controller_1.getTransactionById);
// Process refund (admin, super_admin only)
router.post('/refund', (0, admin_middleware_1.requirePermission)('users.edit'), payment_admin_controller_1.processRefund);
// Retry failed payment (admin, super_admin)
router.post('/retry-failed', (0, admin_middleware_1.requirePermission)('users.edit'), payment_admin_controller_1.retryFailedPayment);
// ==================== Analytics & Logs ====================
// Get revenue analytics (all admin roles can view)
router.get('/analytics', (0, admin_middleware_1.requirePermission)('users.view'), payment_admin_controller_1.getRevenueAnalytics);
// Get ITN logs for debugging (support, admin, super_admin)
router.get('/itn-logs', (0, admin_middleware_1.requirePermission)('users.view'), payment_admin_controller_1.getITNLogs);
exports.default = router;
//# sourceMappingURL=payment.admin.routes.js.map