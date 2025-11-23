"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAnalytics = exports.getConversionHistory = exports.getDashboardAnalytics = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Get user analytics dashboard data
 * @route GET /api/analytics/dashboard
 */
const getDashboardAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get date ranges
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        // Get all conversions for user
        const allConversions = await models_1.ConversionJob.findAll({
            where: { user_id: userId },
            attributes: ['id', 'type', 'status', 'file_size', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        // Calculate statistics
        const totalConversions = allConversions.length;
        const successfulConversions = allConversions.filter(j => j.status === 'completed').length;
        const failedConversions = allConversions.filter(j => j.status === 'failed').length;
        const successRate = totalConversions > 0
            ? Math.round((successfulConversions / totalConversions) * 100)
            : 0;
        // Conversions in last 30 days
        const conversionsLast30Days = allConversions.filter(j => new Date(j.created_at) >= last30Days).length;
        // Conversions in last 7 days
        const conversionsLast7Days = allConversions.filter(j => new Date(j.created_at) >= last7Days).length;
        // This month vs last month
        const conversionsThisMonth = allConversions.filter(j => new Date(j.created_at) >= thisMonth).length;
        const conversionsLastMonth = allConversions.filter(j => new Date(j.created_at) >= lastMonth && new Date(j.created_at) <= lastMonthEnd).length;
        // Calculate month-over-month growth
        const monthOverMonthGrowth = conversionsLastMonth > 0
            ? Math.round(((conversionsThisMonth - conversionsLastMonth) / conversionsLastMonth) * 100)
            : conversionsThisMonth > 0 ? 100 : 0;
        // Conversion type breakdown
        const conversionTypes = allConversions.reduce((acc, job) => {
            const type = job.type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        // Total file size processed
        const totalFileSizeBytes = allConversions.reduce((sum, job) => {
            return sum + (parseInt(job.file_size) || 0);
        }, 0);
        const totalFileSizeMB = Math.round(totalFileSizeBytes / (1024 * 1024));
        // Daily conversion trend (last 7 days)
        const dailyTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const count = allConversions.filter(j => {
                const jobDate = new Date(j.created_at).toISOString().split('T')[0];
                return jobDate === dateStr;
            }).length;
            dailyTrend.push({
                date: dateStr,
                count: count,
                label: date.toLocaleDateString('en-US', { weekday: 'short' })
            });
        }
        // Most used conversion type
        const mostUsedType = Object.entries(conversionTypes).sort((a, b) => b[1] - a[1])[0];
        const favoriteFormat = mostUsedType ? mostUsedType[0] : 'N/A';
        // Recent activity (last 5 conversions)
        const recentActivity = allConversions.slice(0, 5).map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            created_at: job.created_at,
            file_size: job.file_size
        }));
        // Response
        res.json({
            overview: {
                totalConversions,
                successfulConversions,
                failedConversions,
                successRate,
                totalFileSizeMB,
                favoriteFormat
            },
            periods: {
                last7Days: conversionsLast7Days,
                last30Days: conversionsLast30Days,
                thisMonth: conversionsThisMonth,
                lastMonth: conversionsLastMonth,
                monthOverMonthGrowth
            },
            conversionTypes,
            dailyTrend,
            recentActivity
        });
    }
    catch (error) {
        logger_1.default.error('Analytics error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch analytics',
            message: error.message
        });
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
/**
 * Get detailed conversion history with filters
 * @route GET /api/analytics/history
 */
const getConversionHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Query parameters
        const { type, status, limit = '50', offset = '0', startDate, endDate } = req.query;
        // Build where clause
        const where = { user_id: userId };
        if (type) {
            where.type = type;
        }
        if (status) {
            where.status = status;
        }
        if (startDate && endDate) {
            where.created_at = {
                [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        // Get conversions
        const { count, rows: conversions } = await models_1.ConversionJob.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            attributes: [
                'id',
                'type',
                'status',
                'progress',
                'file_name',
                'file_size',
                'output_file',
                'created_at',
                'expires_at',
                'error_message'
            ]
        });
        res.json({
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset),
            conversions
        });
    }
    catch (error) {
        logger_1.default.error('History error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch history',
            message: error.message
        });
    }
};
exports.getConversionHistory = getConversionHistory;
/**
 * Export analytics data as CSV
 * @route GET /api/analytics/export
 */
const exportAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Get all conversions
        const conversions = await models_1.ConversionJob.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            attributes: [
                'id',
                'type',
                'status',
                'file_name',
                'file_size',
                'created_at',
                'expires_at',
                'error_message'
            ]
        });
        // Generate CSV
        const csvHeader = 'ID,Type,Status,Filename,Size (bytes),Created At,Expires At,Error\n';
        const csvRows = conversions.map(job => {
            return [
                job.id,
                job.type,
                job.status,
                `"${job.file_name || 'N/A'}"`,
                job.file_size || '0',
                job.created_at,
                job.expires_at || 'N/A',
                `"${job.error_message || ''}"`
            ].join(',');
        }).join('\n');
        const csv = csvHeader + csvRows;
        // Send as downloadable file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pdflab-conversions-${Date.now()}.csv"`);
        res.send(csv);
    }
    catch (error) {
        logger_1.default.error('Export error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to export data',
            message: error.message
        });
    }
};
exports.exportAnalytics = exportAnalytics;
//# sourceMappingURL=analytics.controller.js.map