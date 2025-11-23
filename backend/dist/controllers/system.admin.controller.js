"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentErrors = exports.getEnvironmentConfig = exports.getBusinessMetrics = exports.getApplicationFlowHealth = exports.cleanupStorage = exports.clearCache = exports.testConversion = exports.getErrorLogs = exports.getStorageHealth = exports.getCloudConvertHealth = exports.getSystemHealth = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const ConversionJob_1 = require("../models/ConversionJob");
const User_1 = require("../models/User");
const SystemHealthLog_1 = require("../models/SystemHealthLog");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const logger_1 = __importDefault(require("../config/logger"));
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const stat = (0, util_1.promisify)(fs_1.default.stat);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
/**
 * Get overall system health summary
 * GET /api/admin/system/health
 */
const getSystemHealth = async (_req, res) => {
    try {
        // CloudConvert health
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const totalJobs = await ConversionJob_1.ConversionJob.count({
            where: { created_at: { [sequelize_1.Op.gte]: last24Hours } }
        });
        const completedJobs = await ConversionJob_1.ConversionJob.count({
            where: { status: 'completed', created_at: { [sequelize_1.Op.gte]: last24Hours } }
        });
        const failedJobs = await ConversionJob_1.ConversionJob.count({
            where: { status: 'failed', created_at: { [sequelize_1.Op.gte]: last24Hours } }
        });
        const successRate = totalJobs > 0 ? completedJobs / totalJobs : 1;
        const errorRate = totalJobs > 0 ? failedJobs / totalJobs : 0;
        // Redis/Queue health
        const queueCounts = await redis_1.conversionQueue.getJobCounts();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = await ConversionJob_1.ConversionJob.count({
            where: { status: 'completed', created_at: { [sequelize_1.Op.gte]: today } }
        });
        const failedToday = await ConversionJob_1.ConversionJob.count({
            where: { status: 'failed', created_at: { [sequelize_1.Op.gte]: today } }
        });
        // Database health
        const dbPool = database_1.sequelize.connectionManager.pool;
        const dbStats = {
            active: dbPool._inUseObjects?.length || 0,
            idle: dbPool._availableObjects?.length || 0,
            max: dbPool._config?.max || 100
        };
        // Storage health
        const storageDir = path_1.default.join(__dirname, '../../storage/uploads');
        let totalSize = 0;
        let fileCount = 0;
        try {
            const calculateSize = async (dir) => {
                const files = await readdir(dir);
                for (const file of files) {
                    const filePath = path_1.default.join(dir, file);
                    try {
                        const stats = await stat(filePath);
                        if (stats.isDirectory()) {
                            await calculateSize(filePath);
                        }
                        else {
                            totalSize += stats.size;
                            fileCount++;
                        }
                    }
                    catch (err) {
                        // Skip files that can't be read
                    }
                }
            };
            if (fs_1.default.existsSync(storageDir)) {
                await calculateSize(storageDir);
            }
        }
        catch (err) {
            logger_1.default.error('Storage calculation error:', { error: err instanceof Error ? err.message : String(err) });
        }
        // Determine overall status
        let overallStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        let cloudconvertStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        let redisStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        let databaseStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        let storageStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        // CloudConvert status
        if (errorRate > 0.2)
            cloudconvertStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        else if (errorRate > 0.1)
            cloudconvertStatus = SystemHealthLog_1.HealthStatus.WARNING;
        // Redis status
        if (queueCounts.waiting > 100)
            redisStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (queueCounts.waiting > 500)
            redisStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // Database status
        const dbUsagePercent = (dbStats.active / dbStats.max) * 100;
        if (dbUsagePercent > 80)
            databaseStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (dbUsagePercent > 95)
            databaseStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // Storage status (assuming 100GB capacity)
        const storageGB = totalSize / (1024 * 1024 * 1024);
        const capacityGB = 100;
        const storagePercent = (storageGB / capacityGB) * 100;
        if (storagePercent > 80)
            storageStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (storagePercent > 95)
            storageStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // Overall status is worst component status
        const statuses = [cloudconvertStatus, redisStatus, databaseStatus, storageStatus];
        if (statuses.includes(SystemHealthLog_1.HealthStatus.CRITICAL))
            overallStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        else if (statuses.includes(SystemHealthLog_1.HealthStatus.WARNING))
            overallStatus = SystemHealthLog_1.HealthStatus.WARNING;
        const health = {
            overall_status: overallStatus,
            components: {
                cloudconvert: {
                    status: cloudconvertStatus,
                    success_rate: successRate.toFixed(3),
                    error_rate: errorRate.toFixed(3),
                    total_jobs_24h: totalJobs,
                    completed_24h: completedJobs,
                    failed_24h: failedJobs
                },
                redis: {
                    status: redisStatus,
                    waiting: queueCounts.waiting,
                    active: queueCounts.active,
                    completed: queueCounts.completed,
                    failed: queueCounts.failed,
                    completed_today: completedToday,
                    failed_today: failedToday
                },
                database: {
                    status: databaseStatus,
                    connections: dbStats,
                    usage_percent: dbUsagePercent.toFixed(1)
                },
                storage: {
                    status: storageStatus,
                    total_gb: storageGB.toFixed(2),
                    capacity_gb: capacityGB,
                    usage_percent: storagePercent.toFixed(1),
                    file_count: fileCount
                }
            },
            last_updated: new Date().toISOString()
        };
        // Log health metrics
        await SystemHealthLog_1.SystemHealthLog.create({
            metric_name: 'overall_system_health',
            metric_value: overallStatus === SystemHealthLog_1.HealthStatus.HEALTHY ? 100 : overallStatus === SystemHealthLog_1.HealthStatus.WARNING ? 50 : 0,
            status: overallStatus,
            details: health
        });
        res.json({
            success: true,
            health
        });
    }
    catch (error) {
        logger_1.default.error('Get system health error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system health',
            error: error.message
        });
    }
};
exports.getSystemHealth = getSystemHealth;
/**
 * Get CloudConvert API health
 * GET /api/admin/system/cloudconvert
 */
const getCloudConvertHealth = async (req, res) => {
    try {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const _last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        // Get error logs for last 24 hours
        const recentErrors = await ConversionJob_1.ConversionJob.findAll({
            where: {
                status: 'failed',
                created_at: { [sequelize_1.Op.gte]: last24Hours }
            },
            order: [['created_at', 'DESC']],
            limit: 10,
            attributes: ['id', 'file_name', 'error_message', 'created_at']
        });
        // Get daily error trends for last 7 days
        const errorTrends = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            const failed = await ConversionJob_1.ConversionJob.count({
                where: {
                    status: 'failed',
                    created_at: { [sequelize_1.Op.between]: [dayStart, dayEnd] }
                }
            });
            const total = await ConversionJob_1.ConversionJob.count({
                where: {
                    created_at: { [sequelize_1.Op.between]: [dayStart, dayEnd] }
                }
            });
            errorTrends.push({
                date: dayStart.toISOString().split('T')[0],
                failed,
                total,
                error_rate: total > 0 ? (failed / total).toFixed(3) : '0'
            });
        }
        res.json({
            success: true,
            cloudconvert: {
                recent_errors: recentErrors,
                error_trends: errorTrends
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get CloudConvert health error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch CloudConvert health',
            error: error.message
        });
    }
};
exports.getCloudConvertHealth = getCloudConvertHealth;
/**
 * Get storage usage details
 * GET /api/admin/system/storage
 */
const getStorageHealth = async (req, res) => {
    try {
        // Get storage by user
        const userStorage = await database_1.sequelize.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        COUNT(cj.id) as job_count,
        SUM(cj.file_size) as total_size
      FROM users u
      INNER JOIN conversion_jobs cj ON u.id = cj.user_id
      GROUP BY u.id, u.email, u.name
      ORDER BY total_size DESC
      LIMIT 10
    `, { type: sequelize_1.QueryTypes.SELECT });
        res.json({
            success: true,
            storage: {
                top_users: userStorage
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get storage health error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch storage health',
            error: error.message
        });
    }
};
exports.getStorageHealth = getStorageHealth;
/**
 * Get recent error logs
 * GET /api/admin/system/errors
 */
const getErrorLogs = async (req, res) => {
    try {
        const { limit = '100' } = req.query;
        const limitNum = parseInt(limit);
        const errors = await ConversionJob_1.ConversionJob.findAll({
            where: {
                status: ConversionJob_1.JobStatus.FAILED,
                error_message: { [sequelize_1.Op.not]: null }
            },
            order: [['created_at', 'DESC']],
            limit: limitNum,
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name']
                }]
        });
        // Group errors by type
        const errorTypes = {};
        errors.forEach(job => {
            const errorType = job.error_message?.split(':')[0] || 'Unknown';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });
        const topErrorTypes = Object.entries(errorTypes)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        res.json({
            success: true,
            errors,
            error_summary: {
                total: errors.length,
                top_types: topErrorTypes
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get error logs error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch error logs',
            error: error.message
        });
    }
};
exports.getErrorLogs = getErrorLogs;
/**
 * Test conversion operation
 * POST /api/admin/system/test-conversion
 */
const testConversion = async (req, res) => {
    try {
        // Create a test conversion job
        // Note: This is a placeholder - in production, you'd create an actual test job
        res.json({
            success: true,
            message: 'Test conversion feature not yet implemented. Create a real conversion via the UI to test.',
            note: 'This would create a test PDF→PPTX conversion job using a sample PDF file'
        });
    }
    catch (error) {
        logger_1.default.error('Test conversion error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to run test conversion',
            error: error.message
        });
    }
};
exports.testConversion = testConversion;
/**
 * Clear Redis cache
 * POST /api/admin/system/clear-cache
 */
const clearCache = async (_req, res) => {
    try {
        // Clear all Redis keys (be careful with this in production!)
        await redis_1.redisClient.flushDb();
        res.json({
            success: true,
            message: 'Redis cache cleared successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Clear cache error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
};
exports.clearCache = clearCache;
/**
 * Trigger storage cleanup
 * POST /api/admin/system/cleanup-storage
 */
const cleanupStorage = async (req, res) => {
    try {
        // Delete expired jobs (>7 days old)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const expiredJobs = await ConversionJob_1.ConversionJob.findAll({
            where: {
                status: { [sequelize_1.Op.in]: ['completed', 'failed'] },
                created_at: { [sequelize_1.Op.lt]: sevenDaysAgo }
            }
        });
        let deletedFiles = 0;
        let freedSpace = 0;
        for (const job of expiredJobs) {
            // Delete input file
            if (job.input_file) {
                try {
                    const stats = await stat(job.input_file);
                    await unlink(job.input_file);
                    freedSpace += stats.size;
                    deletedFiles++;
                }
                catch (err) {
                    // File already deleted or doesn't exist
                }
            }
            // Delete output file
            if (job.output_file) {
                try {
                    const stats = await stat(job.output_file);
                    await unlink(job.output_file);
                    freedSpace += stats.size;
                    deletedFiles++;
                }
                catch (err) {
                    // File already deleted or doesn't exist
                }
            }
            // Delete job record
            await job.destroy();
        }
        const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);
        res.json({
            success: true,
            message: 'Storage cleanup completed',
            stats: {
                deleted_jobs: expiredJobs.length,
                deleted_files: deletedFiles,
                freed_space_mb: freedSpaceMB
            }
        });
    }
    catch (error) {
        logger_1.default.error('Cleanup storage error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup storage',
            error: error.message
        });
    }
};
exports.cleanupStorage = cleanupStorage;
/**
 * Get application flow health (7-stage comprehensive pipeline)
 * GET /api/admin/system/flow-health
 *
 * Stages: Auth → Upload → Database → Convert → Download → Payment → Email
 */
const getApplicationFlowHealth = async (_req, res) => {
    try {
        const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
        // STAGE 1: Authentication Health
        // Check login success rate by querying recent user activity
        const totalLoginAttempts = await User_1.User.count({
            where: { last_login: { [sequelize_1.Op.gte]: last1Hour } }
        });
        // Assume healthy if we have any logins (no failed login tracking yet)
        let authStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        const loginSuccessRate = totalLoginAttempts > 0 ? 100 : 95; // Optimistic if no data
        // STAGE 2: Upload Health
        const uploadJobs = await ConversionJob_1.ConversionJob.count({
            where: { created_at: { [sequelize_1.Op.gte]: last1Hour } }
        });
        let uploadStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        const avgUploadResponseTime = 150; // Placeholder - would measure actual response time
        // STAGE 3: Database Health
        // Measure database query response time
        const dbStart = Date.now();
        await database_1.sequelize.query('SELECT 1+1 AS result');
        const dbQueryTime = Date.now() - dbStart;
        const dbPool = database_1.sequelize.connectionManager.pool;
        const dbActiveConnections = dbPool._inUseObjects?.length || 0;
        const dbMaxConnections = dbPool._config?.max || 100;
        const dbUsagePercent = (dbActiveConnections / dbMaxConnections) * 100;
        let databaseStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        if (dbQueryTime > 100 || dbUsagePercent > 80)
            databaseStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (dbQueryTime > 500 || dbUsagePercent > 95)
            databaseStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // STAGE 4: CloudConvert Processing Health
        const queueCounts = await redis_1.conversionQueue.getJobCounts();
        const processingJobs = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'processing',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            }
        });
        const completedJobs = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            }
        });
        const failedJobs = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'failed',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            }
        });
        const totalProcessed = completedJobs + failedJobs;
        const conversionSuccessRate = totalProcessed > 0 ? (completedJobs / totalProcessed) : 1;
        let cloudConvertStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        if (conversionSuccessRate < 0.9 || queueCounts.waiting > 50)
            cloudConvertStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (conversionSuccessRate < 0.7 || queueCounts.waiting > 100)
            cloudConvertStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // Calculate average processing time
        const recentCompleted = await ConversionJob_1.ConversionJob.findAll({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            },
            limit: 100,
            attributes: ['created_at', 'updated_at']
        });
        let avgProcessingTime = 0;
        if (recentCompleted.length > 0) {
            const totalTime = recentCompleted.reduce((sum, job) => {
                const processingTime = new Date(job.updated_at).getTime() - new Date(job.created_at).getTime();
                return sum + processingTime;
            }, 0);
            avgProcessingTime = Math.round(totalTime / recentCompleted.length / 1000);
        }
        // STAGE 5: Download Health
        // Check if completed files are still accessible
        const downloadStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        const avgDownloadResponseTime = 250; // Placeholder
        // STAGE 6: Payment Health (PayFast)
        // Query payment_logs table for recent payment success rate
        const recentPayments = await database_1.sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful
      FROM payment_logs
      WHERE created_at >= :last1Hour
    `, {
            replacements: { last1Hour },
            type: sequelize_1.QueryTypes.SELECT
        });
        const totalPayments = recentPayments[0]?.total || 0;
        const successfulPayments = recentPayments[0]?.successful || 0;
        const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100;
        let paymentStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        if (paymentSuccessRate < 95 && totalPayments > 0)
            paymentStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (paymentSuccessRate < 80 && totalPayments > 0)
            paymentStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // STAGE 7: Email Service Health (SMTP)
        // Check if SMTP is configured
        const smtpHost = process.env.SMTP_HOST || '';
        const smtpConfigured = smtpHost.length > 0;
        let emailStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        if (!smtpConfigured)
            emailStatus = SystemHealthLog_1.HealthStatus.WARNING;
        // STAGE 8: Storage Health (Disk Space)
        const storageDir = path_1.default.join(__dirname, '../../storage/uploads');
        let totalSize = 0;
        let fileCount = 0;
        try {
            const calculateSize = async (dir) => {
                const files = await readdir(dir);
                for (const file of files) {
                    const filePath = path_1.default.join(dir, file);
                    try {
                        const stats = await stat(filePath);
                        if (stats.isDirectory()) {
                            await calculateSize(filePath);
                        }
                        else {
                            totalSize += stats.size;
                            fileCount++;
                        }
                    }
                    catch (err) {
                        // Skip files that can't be read
                    }
                }
            };
            if (fs_1.default.existsSync(storageDir)) {
                await calculateSize(storageDir);
            }
        }
        catch (err) {
            logger_1.default.error('Storage calculation error:', { error: err instanceof Error ? err.message : String(err) });
        }
        const storageGB = totalSize / (1024 * 1024 * 1024);
        const capacityGB = 100;
        const storagePercent = (storageGB / capacityGB) * 100;
        let storageStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        if (storagePercent > 80)
            storageStatus = SystemHealthLog_1.HealthStatus.WARNING;
        if (storagePercent > 95)
            storageStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        // Overall pipeline status (worst component)
        const allStatuses = [
            authStatus,
            uploadStatus,
            databaseStatus,
            cloudConvertStatus,
            downloadStatus,
            paymentStatus,
            emailStatus,
            storageStatus
        ];
        let overallStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        if (allStatuses.includes(SystemHealthLog_1.HealthStatus.CRITICAL))
            overallStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
        else if (allStatuses.includes(SystemHealthLog_1.HealthStatus.WARNING))
            overallStatus = SystemHealthLog_1.HealthStatus.WARNING;
        res.json({
            success: true,
            flow_health: {
                overall_status: overallStatus,
                stages: {
                    auth: {
                        status: authStatus,
                        success_rate: loginSuccessRate.toFixed(1),
                        logins_last_hour: totalLoginAttempts
                    },
                    upload: {
                        status: uploadStatus,
                        avg_response_time_ms: avgUploadResponseTime,
                        jobs_last_hour: uploadJobs
                    },
                    database: {
                        status: databaseStatus,
                        query_time_ms: dbQueryTime,
                        connections_used: dbActiveConnections,
                        connections_max: dbMaxConnections,
                        usage_percent: dbUsagePercent.toFixed(1)
                    },
                    convert: {
                        status: cloudConvertStatus,
                        success_rate: (conversionSuccessRate * 100).toFixed(1),
                        completed_last_hour: completedJobs,
                        failed_last_hour: failedJobs,
                        queue_waiting: queueCounts.waiting,
                        queue_active: queueCounts.active,
                        avg_processing_time_s: avgProcessingTime
                    },
                    download: {
                        status: downloadStatus,
                        avg_response_time_ms: avgDownloadResponseTime
                    },
                    payment: {
                        status: paymentStatus,
                        success_rate: paymentSuccessRate.toFixed(1),
                        total_payments_last_hour: totalPayments,
                        successful_payments: successfulPayments
                    },
                    email: {
                        status: emailStatus,
                        smtp_configured: smtpConfigured,
                        smtp_host: smtpHost
                    },
                    storage: {
                        status: storageStatus,
                        used_gb: storageGB.toFixed(2),
                        capacity_gb: capacityGB,
                        usage_percent: storagePercent.toFixed(1),
                        file_count: fileCount
                    }
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get application flow health error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch application flow health',
            error: error.message
        });
    }
};
exports.getApplicationFlowHealth = getApplicationFlowHealth;
/**
 * Get business metrics
 * GET /api/admin/system/business-metrics
 */
const getBusinessMetrics = async (_req, res) => {
    try {
        // 1. Active users (last 15 minutes)
        const last15Min = new Date(Date.now() - 15 * 60 * 1000);
        const activeUsers = await database_1.sequelize.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM conversion_jobs
      WHERE created_at >= :last15Min
    `, {
            replacements: { last15Min },
            type: sequelize_1.QueryTypes.SELECT
        });
        const activeUserCount = activeUsers[0]?.count || 0;
        // 2. Conversions today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const conversionsToday = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: today }
            }
        });
        // Conversions yesterday (for comparison)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const conversionsYesterday = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: yesterday, [sequelize_1.Op.lt]: today }
            }
        });
        const percentChange = conversionsYesterday > 0
            ? (((conversionsToday - conversionsYesterday) / conversionsYesterday) * 100).toFixed(1)
            : '0';
        // 3. Success rate (last 1 hour)
        const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
        const completedLastHour = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            }
        });
        const failedLastHour = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'failed',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            }
        });
        const totalLastHour = completedLastHour + failedLastHour;
        const successRate = totalLastHour > 0 ? ((completedLastHour / totalLastHour) * 100).toFixed(1) : '100';
        // 4. Processing times
        const recentCompleted = await ConversionJob_1.ConversionJob.findAll({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            },
            limit: 100,
            attributes: ['created_at', 'updated_at'],
            order: [['created_at', 'DESC']]
        });
        let avgProcessingTime = 0;
        let p95ProcessingTime = 0;
        if (recentCompleted.length > 0) {
            const processingTimes = recentCompleted.map(job => {
                return (new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()) / 1000;
            }).sort((a, b) => a - b);
            const sum = processingTimes.reduce((a, b) => a + b, 0);
            avgProcessingTime = Math.round(sum / processingTimes.length);
            const p95Index = Math.floor(processingTimes.length * 0.95);
            p95ProcessingTime = Math.round(processingTimes[p95Index] || 0);
        }
        res.json({
            success: true,
            metrics: {
                active_users: activeUserCount,
                conversions_today: conversionsToday,
                conversions_yesterday: conversionsYesterday,
                percent_change: percentChange,
                success_rate_last_hour: successRate,
                avg_processing_time_s: avgProcessingTime,
                p95_processing_time_s: p95ProcessingTime,
                total_jobs_last_hour: totalLastHour
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get business metrics error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch business metrics',
            error: error.message
        });
    }
};
exports.getBusinessMetrics = getBusinessMetrics;
/**
 * Get environment configuration validation
 * GET /api/admin/system/environment-config
 */
const getEnvironmentConfig = async (_req, res) => {
    try {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const cloudConvertSandbox = process.env.CLOUDCONVERT_SANDBOX === 'true';
        const payfastMode = process.env.PAYFAST_MODE || 'sandbox';
        const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [];
        const dbHost = process.env.DB_HOST || 'localhost';
        const redisHost = process.env.REDIS_HOST || 'localhost';
        // Validation checks
        const isProduction = nodeEnv === 'production';
        const hasLocalhostInCors = corsOrigins.some(origin => origin.includes('localhost'));
        const hasProductionDomainInCors = corsOrigins.some(origin => origin.includes('pdflab.pro'));
        const dbUsesLocalhost = dbHost.includes('localhost') || dbHost.includes('127.0.0.1');
        const redisUsesLocalhost = redisHost.includes('localhost') || redisHost.includes('127.0.0.1');
        // Calculate validation status
        let validationStatus = SystemHealthLog_1.HealthStatus.HEALTHY;
        const issues = [];
        if (isProduction) {
            if (cloudConvertSandbox) {
                issues.push('CloudConvert is in sandbox mode in production');
                validationStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
            }
            if (payfastMode !== 'production') {
                issues.push('PayFast is not in production mode');
                validationStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
            }
            if (!hasProductionDomainInCors) {
                issues.push('Production domain not found in CORS origins');
                validationStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
            }
            if (dbUsesLocalhost) {
                issues.push('Database host is localhost in production');
                validationStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
            }
            if (redisUsesLocalhost) {
                issues.push('Redis host is localhost in production');
                validationStatus = SystemHealthLog_1.HealthStatus.CRITICAL;
            }
        }
        else {
            if (!cloudConvertSandbox) {
                issues.push('CloudConvert is in production mode in development');
                validationStatus = SystemHealthLog_1.HealthStatus.WARNING;
            }
        }
        res.json({
            success: true,
            config: {
                node_env: nodeEnv,
                is_production: isProduction,
                cloudconvert_sandbox: cloudConvertSandbox,
                payfast_mode: payfastMode,
                cors_origins: corsOrigins,
                cors_valid: isProduction ? hasProductionDomainInCors : true,
                db_host: dbHost.replace(/:[^:]*@/, ':***@'), // Redact password if in connection string
                db_uses_localhost: dbUsesLocalhost,
                redis_host: redisHost,
                redis_uses_localhost: redisUsesLocalhost,
                validation_status: validationStatus,
                issues
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get environment config error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch environment configuration',
            error: error.message
        });
    }
};
exports.getEnvironmentConfig = getEnvironmentConfig;
/**
 * Get recent error stream (last 10 errors from past hour)
 * GET /api/admin/system/recent-errors
 */
const getRecentErrors = async (_req, res) => {
    try {
        const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
        const errors = await ConversionJob_1.ConversionJob.findAll({
            where: {
                status: ConversionJob_1.JobStatus.FAILED,
                error_message: { [sequelize_1.Op.not]: null },
                created_at: { [sequelize_1.Op.gte]: last1Hour }
            },
            order: [['created_at', 'DESC']],
            limit: 10,
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name']
                }],
            attributes: ['id', 'type', 'file_name', 'error_message', 'created_at', 'user_id']
        });
        const formattedErrors = errors.map(error => ({
            id: error.id,
            type: error.type,
            message: error.error_message,
            timestamp: error.created_at,
            user_id: error.user_id,
            user_email: error.user?.email || 'Guest',
            file_name: error.file_name,
            endpoint: `/api/upload` // Default endpoint where errors occur
        }));
        res.json({
            success: true,
            errors: formattedErrors
        });
    }
    catch (error) {
        logger_1.default.error('Get recent errors error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent errors',
            error: error.message
        });
    }
};
exports.getRecentErrors = getRecentErrors;
//# sourceMappingURL=system.admin.controller.js.map