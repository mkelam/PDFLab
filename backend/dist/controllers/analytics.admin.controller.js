"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeatureAnalytics = exports.getRevenueAnalytics = exports.getConversionAnalytics = exports.getUserAnalytics = exports.getAnalyticsOverview = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const ConversionJob_1 = require("../models/ConversionJob");
const subscription_model_1 = require("../models/subscription.model");
/**
 * Get analytics overview
 * GET /api/admin/analytics/overview
 */
const getAnalyticsOverview = async (req, res) => {
    try {
        const { from, to } = req.query;
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        // Previous period (for comparison)
        const periodLength = toDate.getTime() - fromDate.getTime();
        const prevFrom = new Date(fromDate.getTime() - periodLength);
        const prevTo = new Date(fromDate.getTime());
        // Total users
        const totalUsers = await User_1.User.count();
        const prevTotalUsers = await User_1.User.count({
            where: { created_at: { [sequelize_1.Op.lt]: fromDate } }
        });
        const usersChange = prevTotalUsers > 0 ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : 0;
        // Active users (users who made conversions in period)
        const activeUsers = await ConversionJob_1.ConversionJob.count({
            distinct: true,
            col: 'user_id',
            where: { created_at: { [sequelize_1.Op.between]: [fromDate, toDate] } }
        });
        // Total conversions
        const totalConversions = await ConversionJob_1.ConversionJob.count({
            where: { created_at: { [sequelize_1.Op.between]: [fromDate, toDate] } }
        });
        const prevConversions = await ConversionJob_1.ConversionJob.count({
            where: { created_at: { [sequelize_1.Op.between]: [prevFrom, prevTo] } }
        });
        const conversionsChange = prevConversions > 0 ? ((totalConversions - prevConversions) / prevConversions) * 100 : 0;
        // MRR
        const activeSubs = await subscription_model_1.Subscription.findAll({
            where: { status: subscription_model_1.SubscriptionStatus.ACTIVE }
        });
        const mrr = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0);
        // User growth chart (daily signups)
        const userGrowth = await database_1.sequelize.query(`
      SELECT DATE(created_at) as date, COUNT(*) as signups
      FROM users
      WHERE created_at BETWEEN :from AND :to
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, {
            replacements: { from: fromDate, to: toDate },
            type: sequelize_1.QueryTypes.SELECT
        });
        // Conversion volume chart
        const conversionVolume = await database_1.sequelize.query(`
      SELECT DATE(created_at) as date, COUNT(*) as conversions
      FROM conversion_jobs
      WHERE created_at BETWEEN :from AND :to
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, {
            replacements: { from: fromDate, to: toDate },
            type: sequelize_1.QueryTypes.SELECT
        });
        // Conversion types distribution
        const conversionTypes = await database_1.sequelize.query(`
      SELECT type, COUNT(*) as count
      FROM conversion_jobs
      WHERE created_at BETWEEN :from AND :to
      GROUP BY type
    `, {
            replacements: { from: fromDate, to: toDate },
            type: sequelize_1.QueryTypes.SELECT
        });
        const totalConversionCount = conversionTypes.reduce((sum, item) => sum + parseInt(item.count), 0);
        const conversionTypesWithPercentage = conversionTypes.map((item) => ({
            type: item.type,
            count: parseInt(item.count),
            percentage: totalConversionCount > 0 ? ((parseInt(item.count) / totalConversionCount) * 100).toFixed(1) : 0
        }));
        res.json({
            success: true,
            analytics: {
                metrics: {
                    total_users: { value: totalUsers, change_percent: usersChange.toFixed(1) },
                    active_users: { value: activeUsers, change_percent: 0 },
                    total_conversions: { value: totalConversions, change_percent: conversionsChange.toFixed(1) },
                    mrr: { value: mrr.toFixed(2), change_percent: 0 }
                },
                charts: {
                    user_growth: userGrowth,
                    conversion_volume: conversionVolume
                },
                conversion_types: conversionTypesWithPercentage
            }
        });
    }
    catch (error) {
        console.error('Get analytics overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics overview',
            error: error.message
        });
    }
};
exports.getAnalyticsOverview = getAnalyticsOverview;
/**
 * Get user analytics
 * GET /api/admin/analytics/users
 */
const getUserAnalytics = async (req, res) => {
    try {
        const { from, to } = req.query;
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        // User distribution by plan
        const usersByPlan = await database_1.sequelize.query(`
      SELECT plan, COUNT(*) as count
      FROM users
      GROUP BY plan
    `, { type: sequelize_1.QueryTypes.SELECT });
        // Churn rate (last 12 months)
        const churnData = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            const activeStart = await subscription_model_1.Subscription.count({
                where: {
                    status: subscription_model_1.SubscriptionStatus.ACTIVE,
                    created_at: { [sequelize_1.Op.lt]: monthStart }
                }
            });
            const canceled = await subscription_model_1.Subscription.count({
                where: {
                    status: subscription_model_1.SubscriptionStatus.CANCELED,
                    canceled_at: { [sequelize_1.Op.between]: [monthStart, monthEnd] }
                }
            });
            const churnRate = activeStart > 0 ? (canceled / activeStart) * 100 : 0;
            churnData.push({
                month: monthStart.toISOString().substring(0, 7),
                churn_rate: churnRate.toFixed(2)
            });
        }
        res.json({
            success: true,
            users: {
                distribution_by_plan: usersByPlan,
                churn_rate_trend: churnData
            }
        });
    }
    catch (error) {
        console.error('Get user analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user analytics',
            error: error.message
        });
    }
};
exports.getUserAnalytics = getUserAnalytics;
/**
 * Get conversion analytics
 * GET /api/admin/analytics/conversions
 */
const getConversionAnalytics = async (req, res) => {
    try {
        const { from, to } = req.query;
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        // Success rate trend (last 7 days)
        const successRateTrend = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            const total = await ConversionJob_1.ConversionJob.count({
                where: { created_at: { [sequelize_1.Op.between]: [dayStart, dayEnd] } }
            });
            const successful = await ConversionJob_1.ConversionJob.count({
                where: {
                    status: 'completed',
                    created_at: { [sequelize_1.Op.between]: [dayStart, dayEnd] }
                }
            });
            const successRate = total > 0 ? (successful / total) * 100 : 0;
            successRateTrend.push({
                date: dayStart.toISOString().split('T')[0],
                success_rate: successRate.toFixed(1),
                total,
                successful
            });
        }
        // File size distribution
        const fileSizeDistribution = await database_1.sequelize.query(`
      SELECT
        CASE
          WHEN file_size < 1048576 THEN '0-1MB'
          WHEN file_size < 10485760 THEN '1-10MB'
          WHEN file_size < 52428800 THEN '10-50MB'
          ELSE '50MB+'
        END as size_range,
        COUNT(*) as count
      FROM conversion_jobs
      WHERE created_at BETWEEN :from AND :to
      GROUP BY size_range
    `, {
            replacements: { from: fromDate, to: toDate },
            type: sequelize_1.QueryTypes.SELECT
        });
        // Failed conversion reasons
        const failedReasons = await database_1.sequelize.query(`
      SELECT
        SUBSTRING_INDEX(error_message, ':', 1) as error_type,
        COUNT(*) as count
      FROM conversion_jobs
      WHERE status = 'failed'
        AND error_message IS NOT NULL
        AND created_at BETWEEN :from AND :to
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 5
    `, {
            replacements: { from: fromDate, to: toDate },
            type: sequelize_1.QueryTypes.SELECT
        });
        res.json({
            success: true,
            conversions: {
                success_rate_trend: successRateTrend,
                file_size_distribution: fileSizeDistribution,
                failed_reasons: failedReasons
            }
        });
    }
    catch (error) {
        console.error('Get conversion analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversion analytics',
            error: error.message
        });
    }
};
exports.getConversionAnalytics = getConversionAnalytics;
/**
 * Get revenue analytics
 * GET /api/admin/analytics/revenue
 */
const getRevenueAnalytics = async (req, res) => {
    try {
        // MRR trend (last 12 months)
        const mrrTrend = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            const activeSubs = await subscription_model_1.Subscription.findAll({
                where: {
                    status: subscription_model_1.SubscriptionStatus.ACTIVE,
                    created_at: { [sequelize_1.Op.lt]: monthEnd }
                }
            });
            const mrr = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0);
            mrrTrend.push({
                month: monthStart.toISOString().substring(0, 7),
                mrr: mrr.toFixed(2)
            });
        }
        // Revenue by plan
        const revenueByPlan = await database_1.sequelize.query(`
      SELECT plan, SUM(amount) as revenue, COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY plan
    `, { type: sequelize_1.QueryTypes.SELECT });
        // New subscriptions vs cancellations (last 12 months)
        const subTrend = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            const newSubs = await subscription_model_1.Subscription.count({
                where: {
                    created_at: { [sequelize_1.Op.between]: [monthStart, monthEnd] }
                }
            });
            const canceled = await subscription_model_1.Subscription.count({
                where: {
                    status: subscription_model_1.SubscriptionStatus.CANCELED,
                    canceled_at: { [sequelize_1.Op.between]: [monthStart, monthEnd] }
                }
            });
            subTrend.push({
                month: monthStart.toISOString().substring(0, 7),
                new_subscriptions: newSubs,
                cancellations: canceled
            });
        }
        res.json({
            success: true,
            revenue: {
                mrr_trend: mrrTrend,
                revenue_by_plan: revenueByPlan,
                subscription_trend: subTrend
            }
        });
    }
    catch (error) {
        console.error('Get revenue analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue analytics',
            error: error.message
        });
    }
};
exports.getRevenueAnalytics = getRevenueAnalytics;
/**
 * Get feature adoption analytics
 * GET /api/admin/analytics/features
 */
const getFeatureAnalytics = async (req, res) => {
    try {
        // Feature usage (conversion types)
        const featureUsage = await database_1.sequelize.query(`
      SELECT type, COUNT(*) as count
      FROM conversion_jobs
      GROUP BY type
      ORDER BY count DESC
    `, { type: sequelize_1.QueryTypes.SELECT });
        // Power users (top 10 by conversion count)
        const powerUsers = await database_1.sequelize.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.plan,
        COUNT(cj.id) as conversion_count,
        MAX(cj.created_at) as last_active
      FROM users u
      INNER JOIN conversion_jobs cj ON u.id = cj.user_id
      GROUP BY u.id, u.email, u.name, u.plan
      ORDER BY conversion_count DESC
      LIMIT 10
    `, { type: sequelize_1.QueryTypes.SELECT });
        res.json({
            success: true,
            features: {
                usage: featureUsage,
                power_users: powerUsers
            }
        });
    }
    catch (error) {
        console.error('Get feature analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feature analytics',
            error: error.message
        });
    }
};
exports.getFeatureAnalytics = getFeatureAnalytics;
//# sourceMappingURL=analytics.admin.controller.js.map