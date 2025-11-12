import { Router } from 'express'
import {
  getAllUsers,
  getBetaUsers,
  getUserById,
  updateUser,
  updateUserPlan,
  resetUserQuota,
  resetUserPassword,
  impersonateUser,
  getUserConversions,
  getUserActivity,
  bulkQuotaReset,
  exportUsersToCSV,
  createUser,
  deleteUser,
  getStats,
  resendVerificationEmail,
  verifyUserEmail,
  getQuotaStatus,
  fixQuotas,
  syncUserQuotaEndpoint
} from '../controllers/admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin, requirePermission, requireRole } from '../middleware/admin.middleware'
import { auditLogMiddleware } from '../middleware/audit.middleware'
import { UserRole } from '../models'

const router = Router()

/**
 * Admin routes for user management
 * All routes require authentication + admin role
 * All actions are automatically logged to audit trail
 */

// Apply authentication to all admin routes
router.use(authMiddleware)
router.use(requireAdmin)

// Apply audit logging to all admin actions
router.use(auditLogMiddleware)

// Get all users (support, admin, super_admin can view)
router.get('/users', requirePermission('users.view'), getAllUsers)

// Get beta users only (support, admin, super_admin can view)
router.get('/beta-users', requirePermission('users.view'), getBetaUsers)

// Export users to CSV (respects filters)
router.get('/users/export', requirePermission('users.view'), exportUsersToCSV)

// Bulk quota reset (admin and super_admin only)
router.post('/users/bulk-quota-reset', requirePermission('users.edit'), bulkQuotaReset)

// Get single user by ID
router.get('/users/:id', requirePermission('users.view'), getUserById)

// Get platform stats (all admin roles can view)
router.get('/stats', getStats)

// Create new user (admin and super_admin only)
router.post('/users', requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), createUser)

// Update user profile (admin and super_admin only)
router.put('/users/:id', requirePermission('users.edit'), updateUser)

// Update user plan (admin and super_admin only)
router.put('/users/:id/plan', requirePermission('users.edit'), updateUserPlan)

// Reset user quota (support, admin, super_admin)
router.put('/users/:id/quota', requirePermission('users.view'), resetUserQuota)

// Generate password reset link (support, admin, super_admin)
router.post('/users/:id/reset-password', requirePermission('users.view'), resetUserPassword)

// Resend verification email (support, admin, super_admin)
router.post('/users/:id/resend-verification', requirePermission('users.view'), resendVerificationEmail)

// Manually verify user email (admin and super_admin only)
router.post('/users/:id/verify-email', requirePermission('users.edit'), verifyUserEmail)

// Impersonate user (super_admin only)
router.post('/users/:id/impersonate', requireRole(UserRole.SUPER_ADMIN), impersonateUser)

// Get user's conversion history (support, admin, super_admin)
router.get('/users/:id/conversions', requirePermission('users.view'), getUserConversions)

// Get user's activity timeline (support, admin, super_admin)
router.get('/users/:id/activity', requirePermission('users.view'), getUserActivity)

// Delete user (super_admin only)
router.delete('/users/:id', requirePermission('users.delete'), deleteUser)

// Quota Management Routes (admin and super_admin only)
// Get quota status for all users (shows who needs fixing)
router.get('/quota-status', requirePermission('users.view'), getQuotaStatus)

// Fix ALL user quotas based on their plans
router.post('/fix-quotas', requirePermission('users.edit'), fixQuotas)

// Sync quota for a specific user
router.post('/users/:id/sync-quota', requirePermission('users.edit'), syncUserQuotaEndpoint)

export default router
