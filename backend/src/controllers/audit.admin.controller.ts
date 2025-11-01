import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { AdminAuditLog, AuditLogSeverity } from '../models/AdminAuditLog'
import { User } from '../models/User'

/**
 * Get all audit logs with filters
 * GET /api/admin/audit-logs
 */
export const getAllAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      admin_user,
      action,
      entity_type,
      severity,
      search = '',
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      dateFrom,
      dateTo
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (admin_user && admin_user !== 'all') {
      where.admin_user_id = admin_user
    }

    if (action && action !== 'all') {
      where.action = { [Op.like]: `%${action}%` }
    }

    if (entity_type && entity_type !== 'all') {
      where.entity_type = entity_type
    }

    if (severity && severity !== 'all') {
      where.severity = severity
    }

    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom as string)
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo as string)
    }

    // Search by entity_id or action
    if (search) {
      where[Op.or] = [
        { entity_id: { [Op.like]: `%${search}%` } },
        { action: { [Op.like]: `%${search}%` } }
      ]
    }

    // Get logs with admin user info
    const { count, rows: logs } = await AdminAuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'adminUser',
        attributes: ['id', 'email', 'name', 'role']
      }],
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    res.json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    })
  } catch (error: any) {
    console.error('Get audit logs error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    })
  }
}

/**
 * Get audit log by ID
 * GET /api/admin/audit-logs/:id
 */
export const getAuditLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const log = await AdminAuditLog.findByPk(id, {
      include: [{
        model: User,
        as: 'adminUser',
        attributes: ['id', 'email', 'name', 'role']
      }]
    })

    if (!log) {
      res.status(404).json({
        success: false,
        message: 'Audit log not found'
      })
      return
    }

    // Get related logs (same entity, within 1 hour before/after)
    const oneHourBefore = new Date(log.created_at.getTime() - 60 * 60 * 1000)
    const oneHourAfter = new Date(log.created_at.getTime() + 60 * 60 * 1000)

    const relatedLogs = await AdminAuditLog.findAll({
      where: {
        entity_id: log.entity_id,
        id: { [Op.ne]: id },
        created_at: {
          [Op.between]: [oneHourBefore, oneHourAfter]
        }
      },
      include: [{
        model: User,
        as: 'adminUser',
        attributes: ['id', 'email', 'name']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    })

    res.json({
      success: true,
      log,
      relatedLogs
    })
  } catch (error: any) {
    console.error('Get audit log by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    })
  }
}

/**
 * Get security events
 * GET /api/admin/audit-logs/security-events
 */
export const getSecurityEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const securityEvents = await AdminAuditLog.findAll({
      where: {
        severity: { [Op.in]: [AuditLogSeverity.WARNING, AuditLogSeverity.CRITICAL] },
        created_at: { [Op.gte]: last24Hours }
      },
      include: [{
        model: User,
        as: 'adminUser',
        attributes: ['id', 'email', 'name']
      }],
      order: [['created_at', 'DESC']],
      limit: 50
    })

    // Count by severity
    const criticalCount = securityEvents.filter(e => e.severity === AuditLogSeverity.CRITICAL).length
    const warningCount = securityEvents.filter(e => e.severity === AuditLogSeverity.WARNING).length

    res.json({
      success: true,
      events: securityEvents,
      summary: {
        total: securityEvents.length,
        critical: criticalCount,
        warning: warningCount,
        last_24_hours: true
      }
    })
  } catch (error: any) {
    console.error('Get security events error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security events',
      error: error.message
    })
  }
}

/**
 * Get audit log statistics
 * GET /api/admin/audit-logs/stats
 */
export const getAuditLogStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Total logs
    const totalLogs = await AdminAuditLog.count()

    // Logs today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const logsToday = await AdminAuditLog.count({
      where: { created_at: { [Op.gte]: today } }
    })

    // Logs last 30 days (per day)
    const logsPerDay = []
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const count = await AdminAuditLog.count({
        where: {
          created_at: { [Op.between]: [dayStart, dayEnd] }
        }
      })

      logsPerDay.push({
        date: dayStart.toISOString().split('T')[0],
        count
      })
    }

    // Top admin users (by log count)
    const topAdmins = await AdminAuditLog.findAll({
      attributes: [
        'admin_user_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'log_count']
      ],
      include: [{
        model: User,
        as: 'adminUser',
        attributes: ['email', 'name']
      }],
      group: ['admin_user_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5
    })

    // Top actions
    const topActions = await AdminAuditLog.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10
    })

    res.json({
      success: true,
      stats: {
        total_logs: totalLogs,
        logs_today: logsToday,
        logs_per_day: logsPerDay,
        top_admins: topAdmins,
        top_actions: topActions
      }
    })
  } catch (error: any) {
    console.error('Get audit log stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log statistics',
      error: error.message
    })
  }
}

/**
 * Get user activity for GDPR compliance
 * GET /api/admin/audit-logs/user-activity/:user_id
 */
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params

    // Get all audit logs where this user was affected
    const adminActionsOnUser = await AdminAuditLog.findAll({
      where: {
        entity_type: 'user',
        entity_id: user_id
      },
      include: [{
        model: User,
        as: 'adminUser',
        attributes: ['id', 'email', 'name']
      }],
      order: [['created_at', 'DESC']]
    })

    res.json({
      success: true,
      user_id,
      exported_at: new Date().toISOString(),
      activity: {
        admin_actions_on_user: adminActionsOnUser
      }
    })
  } catch (error: any) {
    console.error('Get user activity error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message
    })
  }
}

// Import sequelize for stats
import { sequelize } from '../config/database'
