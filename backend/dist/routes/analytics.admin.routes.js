"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_admin_controller_1 = require("../controllers/analytics.admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const router = (0, express_1.Router)();
/**
 * Admin routes for analytics dashboard
 * All routes require authentication + admin role
 * Analytics views are logged for compliance tracking
 */
// Apply authentication to all admin routes
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.requireAdmin);
// Apply audit logging (analytics access should be logged for compliance)
router.use(audit_middleware_1.auditLogMiddleware);
// ==================== Analytics Endpoints ====================
// Get analytics overview (all admin roles can view)
router.get('/overview', (0, admin_middleware_1.requirePermission)('users.view'), analytics_admin_controller_1.getAnalyticsOverview);
// Get user analytics
router.get('/users', (0, admin_middleware_1.requirePermission)('users.view'), analytics_admin_controller_1.getUserAnalytics);
// Get conversion analytics
router.get('/conversions', (0, admin_middleware_1.requirePermission)('users.view'), analytics_admin_controller_1.getConversionAnalytics);
// Get revenue analytics
router.get('/revenue', (0, admin_middleware_1.requirePermission)('users.view'), analytics_admin_controller_1.getRevenueAnalytics);
// Get feature adoption analytics
router.get('/features', (0, admin_middleware_1.requirePermission)('users.view'), analytics_admin_controller_1.getFeatureAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.admin.routes.js.map