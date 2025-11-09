"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserActivity = exports.getAuditLogStats = exports.getSecurityEvents = exports.getAuditLogById = exports.getAllAuditLogs = void 0;
const sequelize_1 = require("sequelize");
const AdminAuditLog_1 = require("../models/AdminAuditLog");
const User_1 = require("../models/User");
/**
 * Get all audit logs with filters
 * GET /api/admin/audit-logs
 */
const getAllAuditLogs = async (req, res) => {
    try {
        const { admin_user, action, entity_type, severity, search = '', page = '1', limit = '25', sortBy = 'created_at', sortOrder = 'DESC', dateFrom, dateTo } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const where = {};
        if (admin_user && admin_user !== 'all') {
            where.admin_user_id = admin_user;
        }
        if (action && action !== 'all') {
            where.action = { [sequelize_1.Op.like]: `%${action}%` };
        }
        if (entity_type && entity_type !== 'all') {
            where.entity_type = entity_type;
        }
        if (severity && severity !== 'all') {
            where.severity = severity;
        }
        if (dateFrom || dateTo) {
            where.created_at = {};
            if (dateFrom)
                where.created_at[sequelize_1.Op.gte] = new Date(dateFrom);
            if (dateTo)
                where.created_at[sequelize_1.Op.lte] = new Date(dateTo);
        }
        // Search by entity_id or action
        if (search) {
            where[sequelize_1.Op.or] = [
                { entity_id: { [sequelize_1.Op.like]: `%${search}%` } },
                { action: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        // Get logs with admin user info
        const { count, rows: logs } = await AdminAuditLog_1.AdminAuditLog.findAndCountAll({
            where,
            include: [{
                    model: User_1.User,
                    as: 'adminUser',
                    attributes: ['id', 'email', 'name', 'role']
                }],
            order: [[sortBy, sortOrder]],
            limit: limitNum,
            offset
        });
        res.json({
            success: true,
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};
exports.getAllAuditLogs = getAllAuditLogs;
/**
 * Get audit log by ID
 * GET /api/admin/audit-logs/:id
 */
const getAuditLogById = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await AdminAuditLog_1.AdminAuditLog.findByPk(id, {
            include: [{
                    model: User_1.User,
                    as: 'adminUser',
                    attributes: ['id', 'email', 'name', 'role']
                }]
        });
        if (!log) {
            res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
            return;
        }
        // Get related logs (same entity, within 1 hour before/after)
        const oneHourBefore = new Date(log.created_at.getTime() - 60 * 60 * 1000);
        const oneHourAfter = new Date(log.created_at.getTime() + 60 * 60 * 1000);
        const relatedLogs = await AdminAuditLog_1.AdminAuditLog.findAll({
            where: {
                entity_id: log.entity_id,
                id: { [sequelize_1.Op.ne]: id },
                created_at: {
                    [sequelize_1.Op.between]: [oneHourBefore, oneHourAfter]
                }
            },
            include: [{
                    model: User_1.User,
                    as: 'adminUser',
                    attributes: ['id', 'email', 'name']
                }],
            order: [['created_at', 'DESC']],
            limit: 10
        });
        res.json({
            success: true,
            log,
            relatedLogs
        });
    }
    catch (error) {
        console.error('Get audit log by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log',
            error: error.message
        });
    }
};
exports.getAuditLogById = getAuditLogById;
/**
 * Get security events
 * GET /api/admin/audit-logs/security-events
 */
const getSecurityEvents = async (req, res) => {
    try {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const securityEvents = await AdminAuditLog_1.AdminAuditLog.findAll({
            where: {
                severity: { [sequelize_1.Op.in]: [AdminAuditLog_1.AuditLogSeverity.WARNING, AdminAuditLog_1.AuditLogSeverity.CRITICAL] },
                created_at: { [sequelize_1.Op.gte]: last24Hours }
            },
            include: [{
                    model: User_1.User,
                    as: 'adminUser',
                    attributes: ['id', 'email', 'name']
                }],
            order: [['created_at', 'DESC']],
            limit: 50
        });
        // Count by severity
        const criticalCount = securityEvents.filter(e => e.severity === AdminAuditLog_1.AuditLogSeverity.CRITICAL).length;
        const warningCount = securityEvents.filter(e => e.severity === AdminAuditLog_1.AuditLogSeverity.WARNING).length;
        res.json({
            success: true,
            events: securityEvents,
            summary: {
                total: securityEvents.length,
                critical: criticalCount,
                warning: warningCount,
                last_24_hours: true
            }
        });
    }
    catch (error) {
        console.error('Get security events error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch security events',
            error: error.message
        });
    }
};
exports.getSecurityEvents = getSecurityEvents;
/**
 * Get audit log statistics
 * GET /api/admin/audit-logs/stats
 */
const getAuditLogStats = async (req, res) => {
    try {
        // Total logs
        const totalLogs = await AdminAuditLog_1.AdminAuditLog.count();
        // Logs today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const logsToday = await AdminAuditLog_1.AdminAuditLog.count({
            where: { created_at: { [sequelize_1.Op.gte]: today } }
        });
        // Logs last 30 days (per day)
        const logsPerDay = [];
        for (let i = 29; i >= 0; i--) {
            const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            const count = await AdminAuditLog_1.AdminAuditLog.count({
                where: {
                    created_at: { [sequelize_1.Op.between]: [dayStart, dayEnd] }
                }
            });
            logsPerDay.push({
                date: dayStart.toISOString().split('T')[0],
                count
            });
        }
        // Top admin users (by log count)
        const topAdmins = await AdminAuditLog_1.AdminAuditLog.findAll({
            attributes: [
                'admin_user_id',
                [database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'log_count']
            ],
            include: [{
                    model: User_1.User,
                    as: 'adminUser',
                    attributes: ['email', 'name']
                }],
            group: ['admin_user_id'],
            order: [[database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'DESC']],
            limit: 5
        });
        // Top actions
        const topActions = await AdminAuditLog_1.AdminAuditLog.findAll({
            attributes: [
                'action',
                [database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'count']
            ],
            group: ['action'],
            order: [[database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'DESC']],
            limit: 10
        });
        res.json({
            success: true,
            stats: {
                total_logs: totalLogs,
                logs_today: logsToday,
                logs_per_day: logsPerDay,
                top_admins: topAdmins,
                top_actions: topActions
            }
        });
    }
    catch (error) {
        console.error('Get audit log stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log statistics',
            error: error.message
        });
    }
};
exports.getAuditLogStats = getAuditLogStats;
/**
 * Get user activity for GDPR compliance
 * GET /api/admin/audit-logs/user-activity/:user_id
 */
const getUserActivity = async (req, res) => {
    try {
        const { user_id } = req.params;
        // Get all audit logs where this user was affected
        const adminActionsOnUser = await AdminAuditLog_1.AdminAuditLog.findAll({
            where: {
                entity_type: 'user',
                entity_id: user_id
            },
            include: [{
                    model: User_1.User,
                    as: 'adminUser',
                    attributes: ['id', 'email', 'name']
                }],
            order: [['created_at', 'DESC']]
        });
        res.json({
            success: true,
            user_id,
            exported_at: new Date().toISOString(),
            activity: {
                admin_actions_on_user: adminActionsOnUser
            }
        });
    }
    catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activity',
            error: error.message
        });
    }
};
exports.getUserActivity = getUserActivity;
// Import sequelize for stats
const database_1 = require("../config/database");
//# sourceMappingURL=audit.admin.controller.js.map