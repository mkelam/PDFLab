import { Request, Response } from 'express'
import { Op, QueryTypes } from 'sequelize'
import { sequelize } from '../config/database'
import { User } from '../models/User'
import { ConversionJob } from '../models/ConversionJob'
import { Subscription, SubscriptionStatus } from '../models/subscription.model'
import { PaymentLog, PaymentStatus } from '../models/payment-log.model'

/**
 * Get analytics overview
 * GET /api/admin/analytics/overview
 */
export const getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to as string) : new Date()

    // Previous period (for comparison)
    const periodLength = toDate.getTime() - fromDate.getTime()
    const prevFrom = new Date(fromDate.getTime() - periodLength)
    const prevTo = new Date(fromDate.getTime())

    // Total users
    const totalUsers = await User.count()
    const prevTotalUsers = await User.count({
      where: { created_at: { [Op.lt]: fromDate } }
    })
    const usersChange = prevTotalUsers > 0 ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : 0

    // Active users (users who made conversions in period)
    const activeUsers = await ConversionJob.count({
      distinct: true,
      col: 'user_id',
      where: { created_at: { [Op.between]: [fromDate, toDate] } }
    })

    // Total conversions
    const totalConversions = await ConversionJob.count({
      where: { created_at: { [Op.between]: [fromDate, toDate] } }
    })
    const prevConversions = await ConversionJob.count({
      where: { created_at: { [Op.between]: [prevFrom, prevTo] } }
    })
    const conversionsChange = prevConversions > 0 ? ((totalConversions - prevConversions) / prevConversions) * 100 : 0

    // MRR
    const activeSubs = await Subscription.findAll({
      where: { status: SubscriptionStatus.ACTIVE }
    })
    const mrr = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0)

    // User growth chart (daily signups)
    const userGrowth = await sequelize.query(`
      SELECT DATE(created_at) as date, COUNT(*) as signups
      FROM users
      WHERE created_at BETWEEN :from AND :to
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, {
      replacements: { from: fromDate, to: toDate },
      type: QueryTypes.SELECT
    })

    // Conversion volume chart
    const conversionVolume = await sequelize.query(`
      SELECT DATE(created_at) as date, COUNT(*) as conversions
      FROM conversion_jobs
      WHERE created_at BETWEEN :from AND :to
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, {
      replacements: { from: fromDate, to: toDate },
      type: QueryTypes.SELECT
    })

    // Conversion types distribution
    const conversionTypes = await sequelize.query(`
      SELECT type, COUNT(*) as count
      FROM conversion_jobs
      WHERE created_at BETWEEN :from AND :to
      GROUP BY type
    `, {
      replacements: { from: fromDate, to: toDate },
      type: QueryTypes.SELECT
    })

    const totalConversionCount = conversionTypes.reduce((sum: number, item: any) => sum + parseInt(item.count), 0)
    const conversionTypesWithPercentage = conversionTypes.map((item: any) => ({
      type: item.type,
      count: parseInt(item.count),
      percentage: totalConversionCount > 0 ? ((parseInt(item.count) / totalConversionCount) * 100).toFixed(1) : 0
    }))

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
    })
  } catch (error: any) {
    console.error('Get analytics overview error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview',
      error: error.message
    })
  }
}

/**
 * Get user analytics
 * GET /api/admin/analytics/users
 */
export const getUserAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to as string) : new Date()

    // User distribution by plan
    const usersByPlan = await sequelize.query(`
      SELECT plan, COUNT(*) as count
      FROM users
      GROUP BY plan
    `, { type: QueryTypes.SELECT })

    // Churn rate (last 12 months)
    const churnData = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const activeStart = await Subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          created_at: { [Op.lt]: monthStart }
        }
      })

      const canceled = await Subscription.count({
        where: {
          status: SubscriptionStatus.CANCELED,
          canceled_at: { [Op.between]: [monthStart, monthEnd] }
        }
      })

      const churnRate = activeStart > 0 ? (canceled / activeStart) * 100 : 0

      churnData.push({
        month: monthStart.toISOString().substring(0, 7),
        churn_rate: churnRate.toFixed(2)
      })
    }

    res.json({
      success: true,
      users: {
        distribution_by_plan: usersByPlan,
        churn_rate_trend: churnData
      }
    })
  } catch (error: any) {
    console.error('Get user analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics',
      error: error.message
    })
  }
}

/**
 * Get conversion analytics
 * GET /api/admin/analytics/conversions
 */
export const getConversionAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to as string) : new Date()

    // Success rate trend (last 7 days)
    const successRateTrend = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const total = await ConversionJob.count({
        where: { created_at: { [Op.between]: [dayStart, dayEnd] } }
      })

      const successful = await ConversionJob.count({
        where: {
          status: 'completed',
          created_at: { [Op.between]: [dayStart, dayEnd] }
        }
      })

      const successRate = total > 0 ? (successful / total) * 100 : 0

      successRateTrend.push({
        date: dayStart.toISOString().split('T')[0],
        success_rate: successRate.toFixed(1),
        total,
        successful
      })
    }

    // File size distribution
    const fileSizeDistribution = await sequelize.query(`
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
      type: QueryTypes.SELECT
    })

    // Failed conversion reasons
    const failedReasons = await sequelize.query(`
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
      type: QueryTypes.SELECT
    })

    res.json({
      success: true,
      conversions: {
        success_rate_trend: successRateTrend,
        file_size_distribution: fileSizeDistribution,
        failed_reasons: failedReasons
      }
    })
  } catch (error: any) {
    console.error('Get conversion analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion analytics',
      error: error.message
    })
  }
}

/**
 * Get revenue analytics
 * GET /api/admin/analytics/revenue
 */
export const getRevenueAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // MRR trend (last 12 months)
    const mrrTrend = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const activeSubs = await Subscription.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
          created_at: { [Op.lt]: monthEnd }
        }
      })

      const mrr = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0)

      mrrTrend.push({
        month: monthStart.toISOString().substring(0, 7),
        mrr: mrr.toFixed(2)
      })
    }

    // Revenue by plan
    const revenueByPlan = await sequelize.query(`
      SELECT plan, SUM(amount) as revenue, COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY plan
    `, { type: QueryTypes.SELECT })

    // New subscriptions vs cancellations (last 12 months)
    const subTrend = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const newSubs = await Subscription.count({
        where: {
          created_at: { [Op.between]: [monthStart, monthEnd] }
        }
      })

      const canceled = await Subscription.count({
        where: {
          status: SubscriptionStatus.CANCELED,
          canceled_at: { [Op.between]: [monthStart, monthEnd] }
        }
      })

      subTrend.push({
        month: monthStart.toISOString().substring(0, 7),
        new_subscriptions: newSubs,
        cancellations: canceled
      })
    }

    res.json({
      success: true,
      revenue: {
        mrr_trend: mrrTrend,
        revenue_by_plan: revenueByPlan,
        subscription_trend: subTrend
      }
    })
  } catch (error: any) {
    console.error('Get revenue analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message
    })
  }
}

/**
 * Get feature adoption analytics
 * GET /api/admin/analytics/features
 */
export const getFeatureAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Feature usage (conversion types)
    const featureUsage = await sequelize.query(`
      SELECT type, COUNT(*) as count
      FROM conversion_jobs
      GROUP BY type
      ORDER BY count DESC
    `, { type: QueryTypes.SELECT })

    // Power users (top 10 by conversion count)
    const powerUsers = await sequelize.query(`
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
    `, { type: QueryTypes.SELECT })

    res.json({
      success: true,
      features: {
        usage: featureUsage,
        power_users: powerUsers
      }
    })
  } catch (error: any) {
    console.error('Get feature analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature analytics',
      error: error.message
    })
  }
}
