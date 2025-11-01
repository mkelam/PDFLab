import { Router } from 'express'
import {
  getSystemHealth,
  getCloudConvertHealth,
  getStorageHealth,
  getErrorLogs,
  testConversion,
  clearCache,
  cleanupStorage
} from '../controllers/system.admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireAdmin, requirePermission, requireRole } from '../middleware/admin.middleware'
import { auditLogMiddleware } from '../middleware/audit.middleware'
import { UserRole } from '../models'

const router = Router()

/**
 * Admin routes for system health monitoring
 * All routes require authentication + admin role
 * Manual operations logged to audit trail
 */

// Apply authentication to all admin routes
router.use(authMiddleware)
router.use(requireAdmin)

// ==================== Health Monitoring (Read) ====================

// Get overall system health (all admin roles can view)
router.get('/health', requirePermission('users.view'), getSystemHealth)

// Get CloudConvert API health
router.get('/cloudconvert', requirePermission('users.view'), getCloudConvertHealth)

// Get storage usage details
router.get('/storage', requirePermission('users.view'), getStorageHealth)

// Get recent error logs
router.get('/errors', requirePermission('users.view'), getErrorLogs)

// ==================== Manual Operations (Write) ====================
// Apply audit logging to all manual operations
router.use(auditLogMiddleware)

// Test conversion (admin, super_admin)
router.post('/test-conversion', requirePermission('users.edit'), testConversion)

// Clear Redis cache (admin, super_admin)
router.post('/clear-cache', requirePermission('users.edit'), clearCache)

// Cleanup storage (admin, super_admin)
router.post('/cleanup-storage', requirePermission('users.edit'), cleanupStorage)

export default router
