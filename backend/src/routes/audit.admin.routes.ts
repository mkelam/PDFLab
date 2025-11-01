import { Router } from 'express'
import {
  getAllAuditLogs,
  getAuditLogById,
  getSecurityEvents,
  getAuditLogStats,
  getUserActivity
} from '../controllers/audit.admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin, requirePermission, requireRole } from '../middleware/admin.middleware'
import { UserRole } from '../models'

const router = Router()

/**
 * Admin routes for audit logs and compliance
 * All routes require authentication + admin role
 * Note: Audit logging middleware not applied here to avoid logging log views
 */

// Apply authentication to all admin routes
router.use(authMiddleware)
router.use(requireAdmin)

// ==================== Audit Logs ====================

// Get all audit logs with filters (admin, super_admin can view)
router.get('/', requirePermission('users.view'), getAllAuditLogs)

// Get security events (last 24 hours) - MUST be before /:id
router.get('/security-events', requirePermission('users.view'), getSecurityEvents)

// Get audit log statistics - MUST be before /:id
router.get('/stats', requirePermission('users.view'), getAuditLogStats)

// Get user activity for GDPR compliance (admin, super_admin) - MUST be before /:id
router.get('/user-activity/:user_id', requirePermission('users.view'), getUserActivity)

// Get single audit log details - MUST be last to avoid catching other routes
router.get('/:id', requirePermission('users.view'), getAuditLogById)

export default router
