import { Router } from 'express'
import {
  getAllConversionJobs,
  getConversionJobById,
  retryConversionJob,
  cancelConversionJob,
  deleteConversionJob,
  bulkRetryJobs,
  getQueueStatus
} from '../controllers/conversion.admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin, requirePermission } from '../middleware/admin.middleware'
import { auditLogMiddleware } from '../middleware/audit.middleware'

const router = Router()

/**
 * Admin routes for conversion job monitoring
 * All routes require authentication + admin role
 */

// Apply authentication and admin check
router.use(authMiddleware)
router.use(requireAdmin)

// Apply audit logging
router.use(auditLogMiddleware)

// Get all conversion jobs (support, admin, super_admin)
router.get('/conversions', requirePermission('users.view'), getAllConversionJobs)

// Get single job details
router.get('/conversions/:id', requirePermission('users.view'), getConversionJobById)

// Retry failed job (admin, super_admin)
router.post('/conversions/:id/retry', requirePermission('users.edit'), retryConversionJob)

// Cancel pending/processing job (admin, super_admin)
router.post('/conversions/:id/cancel', requirePermission('users.edit'), cancelConversionJob)

// Delete job (super_admin)
router.delete('/conversions/:id', requirePermission('users.delete'), deleteConversionJob)

// Bulk retry failed jobs (admin, super_admin)
router.post('/conversions/bulk-retry', requirePermission('users.edit'), bulkRetryJobs)

// Get queue health status
router.get('/queue/status', requirePermission('users.view'), getQueueStatus)

export default router
