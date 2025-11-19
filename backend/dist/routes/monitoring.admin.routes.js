"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitoring_admin_controller_1 = require("../controllers/monitoring.admin.controller");
const audit_middleware_1 = require("../middleware/audit.middleware");
const router = (0, express_1.Router)();
/**
 * Admin routes for monitoring dashboard
 * NOTE: Authentication is handled by the admin frontend - no need to authenticate twice
 * Manual operations logged to audit trail
 */
// ==================== Dashboard Overview ====================
// Get complete dashboard data (single endpoint for efficiency)
router.get('/dashboard', monitoring_admin_controller_1.getMonitoringDashboard);
// ==================== Health Checks ====================
// Get health check history (with pagination and filtering)
router.get('/health-checks', monitoring_admin_controller_1.getHealthChecks);
// Get drift detection history
router.get('/drift-checks', monitoring_admin_controller_1.getDriftChecks);
// Get deployment validation history
router.get('/deployments', monitoring_admin_controller_1.getDeploymentValidations);
// ==================== Alerts Management ====================
// Get all alerts (with filtering by severity, status)
router.get('/alerts', monitoring_admin_controller_1.getMonitoringAlerts);
// Acknowledge alert (mark as read - still log to audit trail)
router.post('/alerts/:id/acknowledge', audit_middleware_1.auditLogMiddleware, monitoring_admin_controller_1.acknowledgeAlert);
// Resolve alert (mark as fixed - still log to audit trail)
router.post('/alerts/:id/resolve', audit_middleware_1.auditLogMiddleware, monitoring_admin_controller_1.resolveAlert);
// ==================== Metrics & Trends ====================
// Get metric trends (drift score, health score over time)
router.get('/metrics/trend', monitoring_admin_controller_1.getMetricsTrend);
// Get service uptime statistics
router.get('/metrics/uptime', monitoring_admin_controller_1.getServiceUptime);
// ==================== Resource Monitoring ====================
// Get current resource utilization (disk, memory, redis stats)
router.get('/resources', monitoring_admin_controller_1.getResourceMetrics);
// Get auto-remediation activity log
router.get('/remediation-log', monitoring_admin_controller_1.getRemediationLog);
// Get 7-day performance baseline
router.get('/baseline', monitoring_admin_controller_1.getBaseline);
// Check if remediation should be performed
router.post('/check-remediate', monitoring_admin_controller_1.checkShouldRemediate);
exports.default = router;
//# sourceMappingURL=monitoring.admin.routes.js.map