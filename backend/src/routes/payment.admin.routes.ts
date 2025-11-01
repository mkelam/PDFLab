import { Router } from 'express'
import {
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  getAllTransactions,
  getTransactionById,
  processRefund,
  getITNLogs,
  getRevenueAnalytics,
  retryFailedPayment
} from '../controllers/payment.admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin, requirePermission, requireRole } from '../middleware/admin.middleware'
import { auditLogMiddleware } from '../middleware/audit.middleware'
import { UserRole } from '../models'

const router = Router()

/**
 * Admin routes for payment and subscription management
 * All routes require authentication + admin role
 * All actions are automatically logged to audit trail
 */

// Apply authentication to all admin routes
router.use(authMiddleware)
router.use(requireAdmin)

// Apply audit logging to all admin actions
router.use(auditLogMiddleware)

// ==================== Subscriptions ====================

// Get all subscriptions with filters (finance, admin, super_admin can view)
router.get('/subscriptions', requirePermission('users.view'), getAllSubscriptions)

// Get single subscription details
router.get('/subscriptions/:id', requirePermission('users.view'), getSubscriptionById)

// Update subscription (manual plan change - admin, super_admin)
router.put('/subscriptions/:id', requirePermission('users.edit'), updateSubscription)

// Cancel subscription (admin, super_admin)
router.post('/subscriptions/:id/cancel', requirePermission('users.edit'), cancelSubscription)

// Pause subscription (admin, super_admin)
router.post('/subscriptions/:id/pause', requirePermission('users.edit'), pauseSubscription)

// Resume subscription (admin, super_admin)
router.post('/subscriptions/:id/resume', requirePermission('users.edit'), resumeSubscription)

// ==================== Transactions ====================

// Get all payment transactions (finance, admin, super_admin)
router.get('/transactions', requirePermission('users.view'), getAllTransactions)

// Get single transaction details
router.get('/transactions/:id', requirePermission('users.view'), getTransactionById)

// Process refund (admin, super_admin only)
router.post('/refund', requirePermission('users.edit'), processRefund)

// Retry failed payment (admin, super_admin)
router.post('/retry-failed', requirePermission('users.edit'), retryFailedPayment)

// ==================== Analytics & Logs ====================

// Get revenue analytics (all admin roles can view)
router.get('/analytics', requirePermission('users.view'), getRevenueAnalytics)

// Get ITN logs for debugging (support, admin, super_admin)
router.get('/itn-logs', requirePermission('users.view'), getITNLogs)

export default router
