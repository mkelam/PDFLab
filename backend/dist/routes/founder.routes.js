"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const founder_controller_1 = require("../controllers/founder.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const ratelimit_middleware_1 = require("../middleware/ratelimit.middleware");
const router = (0, express_1.Router)();
// Public routes
// GET /api/founder/spots - Get remaining founder spots (for landing page counter)
router.get('/spots', founder_controller_1.getSpotsRemaining);
// Protected routes (requires authentication)
// GET /api/founder/progress - Get user's founder challenge progress
router.get('/progress', auth_middleware_1.authMiddleware, founder_controller_1.getProgress);
// POST /api/founder/feedback - Submit founder feedback form
router.post('/feedback', auth_middleware_1.authMiddleware, ratelimit_middleware_1.authLimiter, founder_controller_1.submitFeedback);
// Admin routes
// GET /api/founder/stats - Get founder edition statistics
router.get('/stats', auth_middleware_1.authMiddleware, admin_middleware_1.requireAdmin, founder_controller_1.getFounderStats);
// POST /api/founder/check-expiry - Manually trigger expiry check (also called by cron)
router.post('/check-expiry', auth_middleware_1.authMiddleware, admin_middleware_1.requireAdmin, founder_controller_1.checkAndExpireFounders);
exports.default = router;
//# sourceMappingURL=founder.routes.js.map