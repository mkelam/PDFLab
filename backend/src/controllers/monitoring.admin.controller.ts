import { Request, Response } from 'express'
import { sequelize } from '../config/database'
import { QueryTypes } from 'sequelize'
import logger from '../config/logger'

/**
 * Get complete monitoring dashboard data
 * Returns: current status, recent alerts, trend data
 */
export const getMonitoringDashboard = async (req: Request, res: Response) => {
  try {
    // Get latest health check
    const latestHealth = await sequelize.query(
      `SELECT * FROM health_checks ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    )

    // Get latest drift check
    const latestDrift = await sequelize.query(
      `SELECT * FROM drift_checks ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    )

    // Get unacknowledged alerts count
    const alertsCount = await sequelize.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning
      FROM monitoring_alerts
      WHERE acknowledged = FALSE`,
      { type: QueryTypes.SELECT }
    )

    // Get 7-day drift trend
    const driftTrend = await sequelize.query(
      `SELECT
        DATE(timestamp) as date,
        AVG(drift_score) as avg_drift,
        MAX(drift_score) as max_drift
      FROM drift_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC`,
      { type: QueryTypes.SELECT }
    )

    // Get 7-day uptime statistics
    type UptimeRow = {
      backend_uptime: string | number | null
      worker_uptime: string | number | null
      mysql_uptime: string | number | null
      redis_uptime: string | number | null
    }

    const uptimeRaw = await sequelize.query<UptimeRow>(
      `SELECT
        (SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as backend_uptime,
        (SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as worker_uptime,
        (SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as mysql_uptime,
        (SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as redis_uptime
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      { type: QueryTypes.SELECT }
    )

    // Convert string values to numbers
    const uptimeRow = uptimeRaw[0]
    const uptime = uptimeRow ? {
      backend_uptime: parseFloat(String(uptimeRow.backend_uptime ?? '0')) || 0,
      worker_uptime: parseFloat(String(uptimeRow.worker_uptime ?? '0')) || 0,
      mysql_uptime: parseFloat(String(uptimeRow.mysql_uptime ?? '0')) || 0,
      redis_uptime: parseFloat(String(uptimeRow.redis_uptime ?? '0')) || 0
    } : {}

    // Get recent alerts (last 10)
    const recentAlerts = await sequelize.query(
      `SELECT * FROM monitoring_alerts
      WHERE acknowledged = FALSE
      ORDER BY severity DESC, timestamp DESC
      LIMIT 10`,
      { type: QueryTypes.SELECT }
    )

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
    })
  } catch (error: any) {
    logger.error('Error fetching monitoring dashboard:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitoring dashboard',
      error: error.message
    })
  }
}

/**
 * Get health check history with pagination
 */
export const getHealthChecks = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      environment,
      status
    } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = ''
    if (environment) {
      whereClause += `WHERE environment = '${environment}'`
    }
    if (status) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} overall_status = '${status}'`
    }

    const checks = await sequelize.query(
      `SELECT * FROM health_checks
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`,
      { type: QueryTypes.SELECT }
    )

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as total FROM health_checks ${whereClause}`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: checks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / Number(limit))
      }
    })
  } catch (error: any) {
    logger.error('Error fetching health checks:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health checks',
      error: error.message
    })
  }
}

/**
 * Get drift check history with pagination
 */
export const getDriftChecks = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      level
    } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = ''
    if (level) {
      whereClause = `WHERE drift_level = '${level}'`
    }

    const checks = await sequelize.query(
      `SELECT * FROM drift_checks
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`,
      { type: QueryTypes.SELECT }
    )

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as total FROM drift_checks ${whereClause}`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: checks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / Number(limit))
      }
    })
  } catch (error: any) {
    logger.error('Error fetching drift checks:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drift checks',
      error: error.message
    })
  }
}

/**
 * Get deployment validation history
 */
export const getDeploymentValidations = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      environment,
      result
    } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = ''
    if (environment) {
      whereClause += `WHERE environment = '${environment}'`
    }
    if (result) {
      whereClause += `${whereClause ? ' AND' : 'WHERE'} validation_result = '${result}'`
    }

    const validations = await sequelize.query(
      `SELECT * FROM deployment_validations
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`,
      { type: QueryTypes.SELECT }
    )

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as total FROM deployment_validations ${whereClause}`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: validations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / Number(limit))
      }
    })
  } catch (error: any) {
    logger.error('Error fetching deployment validations:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployment validations',
      error: error.message
    })
  }
}

/**
 * Get monitoring alerts with filtering
 */
export const getMonitoringAlerts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      acknowledged,
      resolved
    } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = ''
    const conditions = []
    if (severity) conditions.push(`severity = '${severity}'`)
    if (acknowledged !== undefined) conditions.push(`acknowledged = ${acknowledged === 'true' ? 'TRUE' : 'FALSE'}`)
    if (resolved !== undefined) conditions.push(`resolved = ${resolved === 'true' ? 'TRUE' : 'FALSE'}`)

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }

    const alerts = await sequelize.query(
      `SELECT * FROM monitoring_alerts
      ${whereClause}
      ORDER BY severity DESC, timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`,
      { type: QueryTypes.SELECT }
    )

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as total FROM monitoring_alerts ${whereClause}`,
      { type: QueryTypes.SELECT }
    ) as any[]

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / Number(limit))
      }
    })
  } catch (error: any) {
    logger.error('Error fetching monitoring alerts:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitoring alerts',
      error: error.message
    })
  }
}

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = (req as any).user?.id
    const userEmail = (req as any).user?.email

    await sequelize.query(
      `UPDATE monitoring_alerts
      SET acknowledged = TRUE,
          acknowledged_by = :email,
          acknowledged_at = NOW()
      WHERE id = :id`,
      {
        replacements: { id, email: userEmail },
        type: QueryTypes.UPDATE
      }
    )

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    })
  } catch (error: any) {
    logger.error('Error acknowledging alert:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    })
  }
}

/**
 * Resolve an alert
 */
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await sequelize.query(
      `UPDATE monitoring_alerts
      SET resolved = TRUE,
          resolved_at = NOW()
      WHERE id = :id`,
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    )

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    })
  } catch (error: any) {
    logger.error('Error resolving alert:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    })
  }
}

/**
 * Get metrics trend over time
 */
export const getMetricsTrend = async (req: Request, res: Response) => {
  try {
    const { days = 7, metric = 'drift_score' } = req.query

    let query = ''
    if (metric === 'drift_score') {
      query = `
        SELECT
          DATE(timestamp) as date,
          AVG(drift_score) as avg_value,
          MAX(drift_score) as max_value,
          MIN(drift_score) as min_value
        FROM drift_checks
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `
    } else if (metric === 'health_score') {
      query = `
        SELECT
          DATE(timestamp) as date,
          (SUM(services_healthy) / (SUM(services_healthy) + SUM(services_unhealthy))) * 100 as avg_value,
          100 as max_value,
          0 as min_value
        FROM health_checks
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `
    }

    const trend = await sequelize.query(query, { type: QueryTypes.SELECT })

    res.json({
      success: true,
      data: trend
    })
  } catch (error: any) {
    logger.error('Error fetching metrics trend:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics trend',
      error: error.message
    })
  }
}

/**
 * Get service uptime statistics
 */
export const getServiceUptime = async (req: Request, res: Response) => {
  try {
    const { days = 7, environment = 'prod' } = req.query

    const uptime = await sequelize.query(
      `SELECT
        'backend' as service,
        (SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        AND environment = :environment
      UNION ALL
      SELECT
        'worker' as service,
        (SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        AND environment = :environment
      UNION ALL
      SELECT
        'mysql' as service,
        (SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        AND environment = :environment
      UNION ALL
      SELECT
        'redis' as service,
        (SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as uptime_percent,
        SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
        COUNT(*) as total_checks
      FROM health_checks
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        AND environment = :environment`,
      {
        replacements: { environment },
        type: QueryTypes.SELECT
      }
    )

    res.json({
      success: true,
      data: uptime
    })
  } catch (error: any) {
    logger.error('Error fetching service uptime:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service uptime',
      error: error.message
    })
  }
}
