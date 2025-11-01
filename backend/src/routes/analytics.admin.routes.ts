import { Router } from 'express'
import {
  getAnalyticsOverview,
  getUserAnalytics,
  getConversionAnalytics,
  getRevenueAnalytics,
  getFeatureAnalytics
} from '../controllers/analytics.admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin, requirePermission } from '../middleware/admin.middleware'

const router = Router()

/**
 * Admin routes for analytics dashboard
 * All routes require authentication + admin role
 */

// Apply authentication to all admin routes
router.use(authMiddleware)
router.use(requireAdmin)

// ==================== Analytics Endpoints ====================

// Get analytics overview (all admin roles can view)
router.get('/overview', requirePermission('users.view'), getAnalyticsOverview)

// Get user analytics
router.get('/users', requirePermission('users.view'), getUserAnalytics)

// Get conversion analytics
router.get('/conversions', requirePermission('users.view'), getConversionAnalytics)

// Get revenue analytics
router.get('/revenue', requirePermission('users.view'), getRevenueAnalytics)

// Get feature adoption analytics
router.get('/features', requirePermission('users.view'), getFeatureAnalytics)

export default router
