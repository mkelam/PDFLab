import { Router } from 'express'
import {
  submitFeedback,
  getAllFeedback,
  getFeedbackStats,
  getFeedbackById,
  updateFeedbackStatus,
  replyToFeedback,
  deleteFeedback,
  bulkUpdateFeedback,
  bulkDeleteFeedback
} from '../controllers/feedback.controller'
import { optionalAuth } from '../middleware/auth.middleware'
import { requireAuth } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/admin.middleware'

const router = Router()

// Public Routes
// POST /api/feedback - Submit feedback (public, optional auth)
router.post('/feedback', optionalAuth, submitFeedback)

// Admin Routes (require authentication and permission)
// GET /api/admin/feedback - Get all feedback with filtering
router.get('/admin/feedback', requireAuth, requirePermission('feedback.view'), getAllFeedback)

// GET /api/admin/feedback/stats - Get feedback statistics
router.get('/admin/feedback/stats', requireAuth, requirePermission('feedback.view'), getFeedbackStats)

// GET /api/admin/feedback/:id - Get feedback by ID
router.get('/admin/feedback/:id', requireAuth, requirePermission('feedback.view'), getFeedbackById)

// PATCH /api/admin/feedback/:id/status - Update feedback status
router.patch('/admin/feedback/:id/status', requireAuth, requirePermission('feedback.manage'), updateFeedbackStatus)

// POST /api/admin/feedback/:id/reply - Reply to feedback
router.post('/admin/feedback/:id/reply', requireAuth, requirePermission('feedback.manage'), replyToFeedback)

// DELETE /api/admin/feedback/:id - Delete feedback
router.delete('/admin/feedback/:id', requireAuth, requirePermission('feedback.delete'), deleteFeedback)

// POST /api/admin/feedback/bulk-update - Bulk update feedback
router.post('/admin/feedback/bulk-update', requireAuth, requirePermission('feedback.manage'), bulkUpdateFeedback)

// POST /api/admin/feedback/bulk-delete - Bulk delete feedback
router.post('/admin/feedback/bulk-delete', requireAuth, requirePermission('feedback.delete'), bulkDeleteFeedback)

export default router
