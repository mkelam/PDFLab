import { Router } from 'express'
import {
  getMonitoringDashboard,
  getHealthChecks,
  getDriftChecks,
  getDeploymentValidations,
  getMonitoringAlerts,
  acknowledgeAlert,
  resolveAlert,
  getMetricsTrend,
  getServiceUptime,
  getResourceMetrics,
  getRemediationLog,
  getBaseline,
  checkShouldRemediate
} from '../controllers/monitoring.admin.controller'
import { auditLogMiddleware } from '../middleware/audit.middleware'

const router = Router()

/**
 * Admin routes for monitoring dashboard
 * NOTE: Authentication is handled by the admin frontend - no need to authenticate twice
 * Manual operations logged to audit trail
 */

// ==================== Dashboard Overview ====================

// Get complete dashboard data (single endpoint for efficiency)
router.get('/dashboard', getMonitoringDashboard)

// ==================== Health Checks ====================

// Get health check history (with pagination and filtering)
router.get('/health-checks', getHealthChecks)

// Get drift detection history
router.get('/drift-checks', getDriftChecks)

// Get deployment validation history
router.get('/deployments', getDeploymentValidations)

// ==================== Alerts Management ====================

// Get all alerts (with filtering by severity, status)
router.get('/alerts', getMonitoringAlerts)

// Acknowledge alert (mark as read - still log to audit trail)
router.post('/alerts/:id/acknowledge', auditLogMiddleware, acknowledgeAlert)

// Resolve alert (mark as fixed - still log to audit trail)
router.post('/alerts/:id/resolve', auditLogMiddleware, resolveAlert)

// ==================== Metrics & Trends ====================

// Get metric trends (drift score, health score over time)
router.get('/metrics/trend', getMetricsTrend)

// Get service uptime statistics
router.get('/metrics/uptime', getServiceUptime)

// ==================== Resource Monitoring ====================

// Get current resource utilization (disk, memory, redis stats)
router.get('/resources', getResourceMetrics)

// Get auto-remediation activity log
router.get('/remediation-log', getRemediationLog)

// Get 7-day performance baseline
router.get('/baseline', getBaseline)

// Check if remediation should be performed
router.post('/check-remediate', checkShouldRemediate)

export default router
