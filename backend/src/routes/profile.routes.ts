import { Router } from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAccountStats
} from '../controllers/profile.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { cacheMiddleware, invalidateCacheMiddleware } from '../middleware/cache.middleware'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

/**
 * @route GET /api/profile
 * @desc Get user profile
 * @access Private
 * Cache for 5 minutes
 */
router.get('/', cacheMiddleware(300), getProfile)

/**
 * @route PUT /api/profile
 * @desc Update user profile (name, email)
 * @access Private
 * @body name - User's name (optional)
 * @body email - User's email (optional)
 * Invalidate profile cache after update
 */
router.put('/', invalidateCacheMiddleware('/api/profile'), updateProfile)

/**
 * @route PUT /api/profile/password
 * @desc Change password
 * @access Private
 * @body currentPassword - Current password
 * @body newPassword - New password (min 8 characters)
 */
router.put('/password', changePassword)

/**
 * @route DELETE /api/profile
 * @desc Delete account
 * @access Private
 * @body password - User's password for confirmation
 * @body confirmation - Must be "DELETE"
 */
router.delete('/', deleteAccount)

/**
 * @route GET /api/profile/stats
 * @desc Get account statistics
 * @access Private
 * Cache for 2 minutes
 */
router.get('/stats', cacheMiddleware(120), getAccountStats)

export default router
