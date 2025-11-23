import { Router } from 'express'
import {
  getDashboardAnalytics,
  getConversionHistory,
  exportAnalytics
} from '../controllers/analytics.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { cacheMiddleware } from '../middleware/cache.middleware'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

/**
 * @route GET /api/analytics/dashboard
 * @desc Get user analytics dashboard data
 * @access Private
 * Cache for 2 minutes - analytics data doesn't need real-time updates
 */
router.get('/dashboard', cacheMiddleware(120), getDashboardAnalytics)

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
 * Cache for 2 minutes
 */
router.get('/history', cacheMiddleware(120), getConversionHistory)

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data as CSV
 * @access Private
 */
router.get('/export', exportAnalytics)

export default router
