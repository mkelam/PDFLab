"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feedback_controller_1 = require("../controllers/feedback.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_middleware_2 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = (0, express_1.Router)();
// Public Routes
// POST /api/feedback - Submit feedback (public, optional auth)
router.post('/feedback', auth_middleware_1.optionalAuth, feedback_controller_1.submitFeedback);
// Admin Routes (require authentication and permission)
// GET /api/admin/feedback - Get all feedback with filtering
router.get('/admin/feedback', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.view'), feedback_controller_1.getAllFeedback);
// GET /api/admin/feedback/stats - Get feedback statistics
router.get('/admin/feedback/stats', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.view'), feedback_controller_1.getFeedbackStats);
// GET /api/admin/feedback/:id - Get feedback by ID
router.get('/admin/feedback/:id', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.view'), feedback_controller_1.getFeedbackById);
// PATCH /api/admin/feedback/:id/status - Update feedback status
router.patch('/admin/feedback/:id/status', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.manage'), feedback_controller_1.updateFeedbackStatus);
// POST /api/admin/feedback/:id/reply - Reply to feedback
router.post('/admin/feedback/:id/reply', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.manage'), feedback_controller_1.replyToFeedback);
// DELETE /api/admin/feedback/:id - Delete feedback
router.delete('/admin/feedback/:id', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.delete'), feedback_controller_1.deleteFeedback);
// POST /api/admin/feedback/bulk-update - Bulk update feedback
router.post('/admin/feedback/bulk-update', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.manage'), feedback_controller_1.bulkUpdateFeedback);
// POST /api/admin/feedback/bulk-delete - Bulk delete feedback
router.post('/admin/feedback/bulk-delete', auth_middleware_2.requireAuth, (0, admin_middleware_1.requirePermission)('feedback.delete'), feedback_controller_1.bulkDeleteFeedback);
exports.default = router;
//# sourceMappingURL=feedback.routes.js.map