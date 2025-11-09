"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const ratelimit_middleware_1 = require("../middleware/ratelimit.middleware");
const analytics_middleware_1 = require("../middleware/analytics.middleware");
const router = (0, express_1.Router)();
// Public routes (with rate limiting)
router.post('/register', ratelimit_middleware_1.authLimiter, analytics_middleware_1.trackSignup, auth_controller_1.register);
router.post('/login', ratelimit_middleware_1.authLimiter, auth_controller_1.login);
router.post('/refresh', auth_controller_1.refreshToken);
router.post('/forgot-password', ratelimit_middleware_1.authLimiter, auth_controller_1.forgotPassword);
router.post('/reset-password', ratelimit_middleware_1.authLimiter, auth_controller_1.resetPassword);
// Protected routes
router.get('/profile', auth_middleware_1.authMiddleware, auth_controller_1.getProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map