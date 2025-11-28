import { Router } from 'express'
import {
  getProgress,
  submitFeedback,
  checkAndExpireFounders,
  getFounderStats,
  getSpotsRemaining
} from '../controllers/founder.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/admin.middleware'
import { authLimiter } from '../middleware/ratelimit.middleware'

const router = Router()

// Public routes
// GET /api/founder/spots - Get remaining founder spots (for landing page counter)
router.get('/spots', getSpotsRemaining)

// Protected routes (requires authentication)
// GET /api/founder/progress - Get user's founder challenge progress
router.get('/progress', authMiddleware, getProgress)

// POST /api/founder/feedback - Submit founder feedback form
router.post('/feedback', authMiddleware, authLimiter, submitFeedback)

// Admin routes
// GET /api/founder/stats - Get founder edition statistics
router.get('/stats', authMiddleware, requireAdmin, getFounderStats)

// POST /api/founder/check-expiry - Manually trigger expiry check (also called by cron)
router.post('/check-expiry', authMiddleware, requireAdmin, checkAndExpireFounders)

export default router
