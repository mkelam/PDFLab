"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceUptime = exports.getMetricsTrend = exports.resolveAlert = exports.acknowledgeAlert = exports.getMonitoringAlerts = exports.getDeploymentValidations = exports.getDriftChecks = exports.getHealthChecks = exports.getMonitoringDashboard = void 0;
const database_1 = require("../config/database");
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Get complete monitoring dashboard data
 * Returns: current status, recent alerts, trend data
 */
const getMonitoringDashboard = async (req, res) => {
    try {
        // Get latest health check
        const latestHealth = await database_1.sequelize.query(`SELECT * FROM health_checks ORDER BY timestamp DESC LIMIT 1`, { type: sequelize_1.QueryTypes.SELECT });
        // Get latest drift check
        const latestDrift = await database_1.sequelize.query(`SELECT * FROM drift_checks ORDER BY timestamp DESC LIMIT 1`, { type: sequelize_1.QueryTypes.SELECT });
        // Get unacknowledged alerts count
        const alertsCount = await database_1.sequelize.query(`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning
      FROM monitoring_alerts
      WHERE acknowledged = FALSE`, { type: sequelize_1.QueryTypes.SELECT });
        // Get 7-day drift trend
        const driftTrend = await database_1.sequelize.query(`SELECT
        DATE(timestamp) as date,
        AVG(drift_score) as avg_drift,
        MAX(drift_score) as max_drift
      FROM drift_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC`, { type: sequelize_1.QueryTypes.SELECT });
        // Get 7-day uptime statistics
        const uptimeRaw = await database_1.sequelize.query(`SELECT
        (SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as backend_uptime,
        (SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as worker_uptime,
        (SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as mysql_uptime,
        (SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as redis_uptime
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, { type: sequelize_1.QueryTypes.SELECT });
        // Convert string values to numbers
        const uptimeRow = uptimeRaw[0];
        const uptime = uptimeRow ? {
            backend_uptime: parseFloat(String(uptimeRow.backend_uptime)) || 0,
            worker_uptime: parseFloat(String(uptimeRow.worker_uptime)) || 0,
            mysql_uptime: parseFloat(String(uptimeRow.mysql_uptime)) || 0,
            redis_uptime: parseFloat(String(uptimeRow.redis_uptime)) || 0
        } : {};
        // Get recent alerts (last 10)
        const recentAlerts = await database_1.sequelize.query(`SELECT * FROM monitoring_alerts
      WHERE acknowledged = FALSE
      ORDER BY severity DESC, timestamp DESC
      LIMIT 10`, { type: sequelize_1.QueryTypes.SELECT });
        res.json({
            success: true,
            data: {
                currentStatus: {
                    health: latestHealth[0] || null,
                    drift: latestDrift[0] || null,
                    alerts: alertsCount[0] || { total: 0, critical: 0, warning: 0 }
                },
                trends: {
                    drift: driftTrend,
                    uptime: uptime
                },
                recentAlerts
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching monitoring dashboard:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monitoring dashboard',
            error: error.message
        });
    }
};
exports.getMonitoringDashboard = getMonitoringDashboard;
/**
 * Get health check history with pagination
 */
const getHealthChecks = async (req, res) => {
    try {
        const { page = 1, limit = 50, environment, status } = req.query;
        // Validate and sanitize pagination parameters
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        // Validate environment and status values against allowed values
        const allowedEnvironments = ['development', 'staging', 'production', 'prod', 'dev'];
        const allowedStatuses = ['healthy', 'warning', 'critical', 'unknown'];
        const safeEnvironment = environment && allowedEnvironments.includes(String(environment)) ? String(environment) : null;
        const safeStatus = status && allowedStatuses.includes(String(status)) ? String(status) : null;
        const checks = await database_1.sequelize.query(`SELECT * FROM health_checks
      WHERE (:environment IS NULL OR environment = :environment)
      AND (:status IS NULL OR overall_status = :status)
      ORDER BY timestamp DESC
      LIMIT :limit OFFSET :offset`, {
            replacements: { environment: safeEnvironment, status: safeStatus, limit: limitNum, offset },
            type: sequelize_1.QueryTypes.SELECT
        });
        const totalCount = await database_1.sequelize.query(`SELECT COUNT(*) as total FROM health_checks
      WHERE (:environment IS NULL OR environment = :environment)
      AND (:status IS NULL OR overall_status = :status)`, {
            replacements: { environment: safeEnvironment, status: safeStatus },
            type: sequelize_1.QueryTypes.SELECT
        });
        res.json({
            success: true,
            data: checks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount[0].total,
                pages: Math.ceil(totalCount[0].total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching health checks:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch health checks',
            error: error.message
        });
    }
};
exports.getHealthChecks = getHealthChecks;
/**
 * Get drift check history with pagination
 */
const getDriftChecks = async (req, res) => {
    try {
        const { page = 1, limit = 50, level } = req.query;
        // Validate and sanitize pagination parameters
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        // Validate drift level against allowed values
        const allowedLevels = ['none', 'low', 'medium', 'high', 'critical'];
        const safeLevel = level && allowedLevels.includes(String(level)) ? String(level) : null;
        const checks = await database_1.sequelize.query(`SELECT * FROM drift_checks
      WHERE (:level IS NULL OR drift_level = :level)
      ORDER BY timestamp DESC
      LIMIT :limit OFFSET :offset`, {
            replacements: { level: safeLevel, limit: limitNum, offset },
            type: sequelize_1.QueryTypes.SELECT
        });
        const totalCount = await database_1.sequelize.query(`SELECT COUNT(*) as total FROM drift_checks
      WHERE (:level IS NULL OR drift_level = :level)`, {
            replacements: { level: safeLevel },
            type: sequelize_1.QueryTypes.SELECT
        });
        res.json({
            success: true,
            data: checks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount[0].total,
                pages: Math.ceil(totalCount[0].total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching drift checks:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch drift checks',
            error: error.message
        });
    }
};
exports.getDriftChecks = getDriftChecks;
/**
 * Get deployment validation history
 */
const getDeploymentValidations = async (req, res) => {
    try {
        const { page = 1, limit = 50, environment, result } = req.query;
        // Validate and sanitize pagination parameters
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        // Validate environment and result values against allowed values
        const allowedEnvironments = ['development', 'staging', 'production', 'prod', 'dev'];
        const allowedResults = ['success', 'failure', 'warning', 'skipped'];
        const safeEnvironment = environment && allowedEnvironments.includes(String(environment)) ? String(environment) : null;
        const safeResult = result && allowedResults.includes(String(result)) ? String(result) : null;
        const validations = await database_1.sequelize.query(`SELECT * FROM deployment_validations
      WHERE (:environment IS NULL OR environment = :environment)
      AND (:result IS NULL OR validation_result = :result)
      ORDER BY timestamp DESC
      LIMIT :limit OFFSET :offset`, {
            replacements: { environment: safeEnvironment, result: safeResult, limit: limitNum, offset },
            type: sequelize_1.QueryTypes.SELECT
        });
        const totalCount = await database_1.sequelize.query(`SELECT COUNT(*) as total FROM deployment_validations
      WHERE (:environment IS NULL OR environment = :environment)
      AND (:result IS NULL OR validation_result = :result)`, {
            replacements: { environment: safeEnvironment, result: safeResult },
            type: sequelize_1.QueryTypes.SELECT
        });
        res.json({
            success: true,
            data: validations,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount[0].total,
                pages: Math.ceil(totalCount[0].total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching deployment validations:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deployment validations',
            error: error.message
        });
    }
};
exports.getDeploymentValidations = getDeploymentValidations;
/**
 * Get monitoring alerts with filtering
 */
const getMonitoringAlerts = async (req, res) => {
    try {
        const { page = 1, limit = 50, severity, acknowledged, resolved } = req.query;
        // Validate and sanitize pagination parameters
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
        const offset = (pageNum - 1) * limitNum;
        // Validate severity against allowed values
        const allowedSeverities = ['info', 'warning', 'critical', 'error'];
        const safeSeverity = severity && allowedSeverities.includes(String(severity)) ? String(severity) : null;
        // Convert boolean strings to actual booleans (or null if not provided)
        const safeAcknowledged = acknowledged !== undefined ? acknowledged === 'true' : null;
        const safeResolved = resolved !== undefined ? resolved === 'true' : null;
        const alerts = await database_1.sequelize.query(`SELECT * FROM monitoring_alerts
      WHERE (:severity IS NULL OR severity = :severity)
      AND (:acknowledged IS NULL OR acknowledged = :acknowledged)
      AND (:resolved IS NULL OR resolved = :resolved)
      ORDER BY severity DESC, timestamp DESC
      LIMIT :limit OFFSET :offset`, {
            replacements: { severity: safeSeverity, acknowledged: safeAcknowledged, resolved: safeResolved, limit: limitNum, offset },
            type: sequelize_1.QueryTypes.SELECT
        });
        const totalCount = await database_1.sequelize.query(`SELECT COUNT(*) as total FROM monitoring_alerts
      WHERE (:severity IS NULL OR severity = :severity)
      AND (:acknowledged IS NULL OR acknowledged = :acknowledged)
      AND (:resolved IS NULL OR resolved = :resolved)`, {
            replacements: { severity: safeSeverity, acknowledged: safeAcknowledged, resolved: safeResolved },
            type: sequelize_1.QueryTypes.SELECT
        });
        res.json({
            success: true,
            data: alerts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount[0].total,
                pages: Math.ceil(totalCount[0].total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching monitoring alerts:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monitoring alerts',
            error: error.message
        });
    }
};
exports.getMonitoringAlerts = getMonitoringAlerts;
/**
 * Acknowledge an alert
 */
const acknowledgeAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        await database_1.sequelize.query(`UPDATE monitoring_alerts
      SET acknowledged = TRUE,
          acknowledged_by = :email,
          acknowledged_at = NOW()
      WHERE id = :id`, {
            replacements: { id, email: userEmail },
            type: sequelize_1.QueryTypes.UPDATE
        });
        res.json({
            success: true,
            message: 'Alert acknowledged successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error acknowledging alert:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to acknowledge alert',
            error: error.message
        });
    }
};
exports.acknowledgeAlert = acknowledgeAlert;
/**
 * Resolve an alert
 */
const resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.sequelize.query(`UPDATE monitoring_alerts
      SET resolved = TRUE,
          resolved_at = NOW()
      WHERE id = :id`, {
            replacements: { id },
            type: sequelize_1.QueryTypes.UPDATE
        });
        res.json({
            success: true,
            message: 'Alert resolved successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error resolving alert:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to resolve alert',
            error: error.message
        });
    }
};
exports.resolveAlert = resolveAlert;
/**
 * Get metrics trend over time
 */
const getMetricsTrend = async (req, res) => {
    try {
        const { days = 7, metric = 'drift_score' } = req.query;
        // Validate and sanitize days parameter (1-365 days)
        const safeDays = Math.min(365, Math.max(1, Number(days) || 7));
        // Validate metric against allowed values
        const allowedMetrics = ['drift_score', 'health_score'];
        const safeMetric = allowedMetrics.includes(String(metric)) ? String(metric) : 'drift_score';
        let trend = [];
        if (safeMetric === 'drift_score') {
            trend = await database_1.sequelize.query(`SELECT
          DATE(timestamp) as date,
          AVG(drift_score) as avg_value,
          MAX(drift_score) as max_value,
          MIN(drift_score) as min_value
        FROM drift_checks
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL :days DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC`, {
                replacements: { days: safeDays },
                type: sequelize_1.QueryTypes.SELECT
            });
        }
        else if (safeMetric === 'health_score') {
            trend = await database_1.sequelize.query(`SELECT
          DATE(timestamp) as date,
          (SUM(services_healthy) / (SUM(services_healthy) + SUM(services_unhealthy))) * 100 as avg_value,
          100 as max_value,
          0 as min_value
        FROM health_checks
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL :days DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC`, {
                replacements: { days: safeDays },
                type: sequelize_1.QueryTypes.SELECT
            });
        }
        res.json({
            success: true,
            data: trend
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching metrics trend:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch metrics trend',
            error: error.message
        });
    }
};
exports.getMetricsTrend = getMetricsTrend;
/**
 * Get service uptime statistics
 */
const getServiceUptime = async (req, res) => {
    try {
        const { days = 7, environment = 'prod' } = req.query;
        // Validate and sanitize days parameter (1-365 days)
        const safeDays = Math.min(365, Math.max(1, Number(days) || 7));
        // Validate environment against allowed values
        const allowedEnvironments = ['development', 'staging', 'production', 'prod', 'dev'];
        const safeEnvironment = allowedEnvironments.includes(String(environment)) ? String(environment) : 'prod';
        const uptime = await database_1.sequelize.query(`SELECT
        'backend' as service,
        (SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL :days DAY)
        AND environment = :environment
      UNION ALL
      SELECT
        'worker' as service,
        (SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL :days DAY)
        AND environment = :environment
      UNION ALL
      SELECT
        'mysql' as service,
        (SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL :days DAY)
        AND environment = :environment
      UNION ALL
      SELECT
        'redis' as service,
        (SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL :days DAY)
        AND environment = :environment`, {
            replacements: { days: safeDays, environment: safeEnvironment },
            type: sequelize_1.QueryTypes.SELECT
        });
        res.json({
            success: true,
            data: uptime
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching service uptime:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service uptime',
            error: error.message
        });
    }
};
exports.getServiceUptime = getServiceUptime;
//# sourceMappingURL=monitoring.admin.controller.js.map