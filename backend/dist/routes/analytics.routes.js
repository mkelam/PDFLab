"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
/**
 * @route GET /api/analytics/dashboard
 * @desc Get user analytics dashboard data
 * @access Private
 */
router.get('/dashboard', analytics_controller_1.getDashboardAnalytics);
/**
 * @route GET /api/analytics/history
 * @desc Get detailed conversion history with filters
 * @access Private
 * @query type - Filter by conversion type (optional)
 * @query status - Filter by status (optional)
 * @query limit - Number of results (default: 50)
 * @query offset - Pagination offset (default: 0)
 * @query startDate - Start date filter (optional)
 * @query endDate - End date filter (optional)
 */
router.get('/history', analytics_controller_1.getConversionHistory);
/**
 * @route GET /api/analytics/export
 * @desc Export analytics data as CSV
 * @access Private
 */
router.get('/export', analytics_controller_1.exportAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map