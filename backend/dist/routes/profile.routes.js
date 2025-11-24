"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const cache_middleware_1 = require("../middleware/cache.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
/**
 * @route GET /api/profile
 * @desc Get user profile
 * @access Private
 * Cache for 5 minutes
 */
router.get('/', (0, cache_middleware_1.cacheMiddleware)(300), profile_controller_1.getProfile);
/**
 * @route PUT /api/profile
 * @desc Update user profile (name, email)
 * @access Private
 * @body name - User's name (optional)
 * @body email - User's email (optional)
 * Invalidate profile cache after update
 */
router.put('/', (0, cache_middleware_1.invalidateCacheMiddleware)('/api/profile'), profile_controller_1.updateProfile);
/**
 * @route PUT /api/profile/password
 * @desc Change password
 * @access Private
 * @body currentPassword - Current password
 * @body newPassword - New password (min 8 characters)
 */
router.put('/password', profile_controller_1.changePassword);
/**
 * @route DELETE /api/profile
 * @desc Delete account
 * @access Private
 * @body password - User's password for confirmation
 * @body confirmation - Must be "DELETE"
 */
router.delete('/', profile_controller_1.deleteAccount);
/**
 * @route GET /api/profile/stats
 * @desc Get account statistics
 * @access Private
 * Cache for 2 minutes
 */
router.get('/stats', (0, cache_middleware_1.cacheMiddleware)(120), profile_controller_1.getAccountStats);
exports.default = router;
//# sourceMappingURL=profile.routes.js.map