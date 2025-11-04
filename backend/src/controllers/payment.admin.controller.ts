import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { sequelize } from '../config/database'
import { PaymentLog, PaymentStatus, PaymentType } from '../models/payment-log.model'
import { User, UserPlan } from '../models/User'
import { Subscription, SubscriptionStatus } from '../models/subscription.model'

/**
 * Get all subscriptions with filters, search, and pagination
 * GET /api/admin/payments/subscriptions
 */
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      status,
      plan,
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      billingDateFrom,
      billingDateTo
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (plan && plan !== 'all') {
      where.plan = plan
    }

    if (billingDateFrom || billingDateTo) {
      where.next_billing_date = {}
      if (billingDateFrom) where.next_billing_date[Op.gte] = new Date(billingDateFrom as string)
      if (billingDateTo) where.next_billing_date[Op.lte] = new Date(billingDateTo as string)
    }

    // Search across multiple fields
    const userWhere: any = {}
    if (search) {
      userWhere[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ]

      // Also search by subscription ID or PayFast token
      where[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { payfast_token: { [Op.like]: `%${search}%` } }
      ]
    }

    // Get subscriptions with user info
    const { count, rows: subscriptions } = await Subscription.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name'],
        where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        required: Object.keys(userWhere).length > 0
      }],
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    // Calculate stats
    const activeCount = await Subscription.count({ where: { status: SubscriptionStatus.ACTIVE } })
    const canceledCount = await Subscription.count({ where: { status: SubscriptionStatus.CANCELED } })
    const pastDueCount = await Subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } })

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubs = await Subscription.findAll({
      where: { status: SubscriptionStatus.ACTIVE }
    })
    const mrr = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0)

    res.json({
      success: true,
      subscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      },
      stats: {
        active: activeCount,
        canceled: canceledCount,
        past_due: pastDueCount,
        mrr: mrr.toFixed(2)
      }
    })
  } catch (error: any) {
    console.error('Get all subscriptions error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    })
  }
}

/**
 * Get subscription details with payment history
 * GET /api/admin/payments/subscriptions/:id
 */
export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const subscription = await Subscription.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name', 'plan', 'conversions_used', 'conversions_limit']
      }]
    })

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
      return
    }

    // Get payment history for this subscription
    const paymentHistory = await PaymentLog.findAll({
      where: { subscription_id: id },
      order: [['created_at', 'DESC']],
      limit: 50
    })

    res.json({
      success: true,
      subscription,
      paymentHistory
    })
  } catch (error: any) {
    console.error('Get subscription by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message
    })
  }
}

/**
 * Update subscription (manual plan change)
 * PUT /api/admin/payments/subscriptions/:id
 */
export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { plan, amount, next_billing_date, status } = req.body

    const subscription = await Subscription.findByPk(id)
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
      return
    }

    // Update subscription fields
    const updates: any = {}
    if (plan) updates.plan = plan
    if (amount !== undefined) updates.amount = amount
    if (next_billing_date) updates.next_billing_date = new Date(next_billing_date)
    if (status) updates.status = status

    await subscription.update(updates)

    // Also update user's plan if changed
    if (plan) {
      await User.update(
        { plan },
        { where: { id: subscription.user_id } }
      )
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription
    })
  } catch (error: any) {
    console.error('Update subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    })
  }
}

/**
 * Cancel subscription
 * POST /api/admin/payments/subscriptions/:id/cancel
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { immediately = false } = req.body

    const subscription = await Subscription.findByPk(id)
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
      return
    }

    if (subscription.status === SubscriptionStatus.CANCELED) {
      res.status(400).json({
        success: false,
        message: 'Subscription is already canceled'
      })
      return
    }

    // Update subscription
    const updates: any = {
      status: SubscriptionStatus.CANCELED,
      canceled_at: new Date()
    }

    if (immediately) {
      updates.ended_at = new Date()
      // Downgrade user to free plan immediately
      await User.update(
        {
          plan: UserPlan.FREE,
          conversions_limit: 3 // Free plan limit
        },
        { where: { id: subscription.user_id } }
      )
    } else {
      // Cancel at end of billing cycle
      updates.cancel_at = subscription.next_billing_date
      updates.ended_at = subscription.next_billing_date
    }

    await subscription.update(updates)

    res.json({
      success: true,
      message: immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at end of billing cycle',
      subscription
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    })
  }
}

/**
 * Pause subscription
 * POST /api/admin/payments/subscriptions/:id/pause
 */
export const pauseSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const subscription = await Subscription.findByPk(id)
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
      return
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'Only active subscriptions can be paused'
      })
      return
    }

    // Note: PayFast doesn't have native pause functionality
    // We'll mark it as pending and skip billing
    await subscription.update({
      status: SubscriptionStatus.PENDING
    })

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      subscription
    })
  } catch (error: any) {
    console.error('Pause subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to pause subscription',
      error: error.message
    })
  }
}

/**
 * Resume subscription
 * POST /api/admin/payments/subscriptions/:id/resume
 */
export const resumeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const subscription = await Subscription.findByPk(id)
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
      return
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: 'Only paused subscriptions can be resumed'
      })
      return
    }

    await subscription.update({
      status: SubscriptionStatus.ACTIVE
    })

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription
    })
  } catch (error: any) {
    console.error('Resume subscription error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to resume subscription',
      error: error.message
    })
  }
}

/**
 * Get all payment transactions with filters
 * GET /api/admin/payments/transactions
 */
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      status,
      type,
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

    if (status && status !== 'all') {
      where.status = status
    }

    if (type && type !== 'all') {
      where.payment_type = type
    }

    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom as string)
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo as string)
    }

    // Search by transaction ID, email, or PayFast ID
    if (search) {
      where[Op.or] = [
        { transaction_id: { [Op.like]: `%${search}%` } },
        { payfast_payment_id: { [Op.like]: `%${search}%` } },
        { email_address: { [Op.like]: `%${search}%` } }
      ]
    }

    // Get transactions with user info
    const { count, rows: transactions } = await PaymentLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name']
      }],
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    // Calculate stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completeToday = await PaymentLog.count({
      where: {
        status: PaymentStatus.COMPLETE,
        created_at: { [Op.gte]: today }
      }
    })

    const failedToday = await PaymentLog.count({
      where: {
        status: PaymentStatus.FAILED,
        created_at: { [Op.gte]: today }
      }
    })

    const totalRevenue = await PaymentLog.sum('amount_net', {
      where: { status: PaymentStatus.COMPLETE }
    }) || 0

    res.json({
      success: true,
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      },
      stats: {
        complete_today: completeToday,
        failed_today: failedToday,
        total_revenue: parseFloat(totalRevenue.toString()).toFixed(2)
      }
    })
  } catch (error: any) {
    console.error('Get all transactions error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    })
  }
}

/**
 * Get transaction details
 * GET /api/admin/payments/transactions/:id
 */
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const transaction = await PaymentLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'plan']
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'plan', 'status', 'amount']
        }
      ]
    })

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
      return
    }

    res.json({
      success: true,
      transaction
    })
  } catch (error: any) {
    console.error('Get transaction by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message
    })
  }
}

/**
 * Process refund
 * POST /api/admin/payments/refund
 */
export const processRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id, amount, reason } = req.body

    if (!transaction_id || !amount || !reason) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID, amount, and reason are required'
      })
      return
    }

    const transaction = await PaymentLog.findByPk(transaction_id)
    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
      return
    }

    if (transaction.status !== PaymentStatus.COMPLETE) {
      res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      })
      return
    }

    const refundAmount = parseFloat(amount)
    const originalAmount = parseFloat(transaction.amount_gross.toString())

    if (refundAmount > originalAmount) {
      res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed original payment amount'
      })
      return
    }

    // TODO: Integrate with PayFast refund API when available
    // For now, we'll create a refund log entry

    const refundLog = await PaymentLog.create({
      user_id: transaction.user_id,
      subscription_id: transaction.subscription_id,
      transaction_id: `refund-${Date.now()}-${transaction.id.substring(0, 8)}`,
      payfast_payment_id: transaction.payfast_payment_id,
      payment_type: PaymentType.REFUND,
      status: PaymentStatus.COMPLETE,
      amount_gross: -refundAmount,
      amount_fee: 0,
      amount_net: -refundAmount,
      currency: transaction.currency,
      plan: transaction.plan,
      name_first: transaction.name_first,
      name_last: transaction.name_last,
      email_address: transaction.email_address,
      item_name: `Refund: ${transaction.item_name}`,
      item_description: `Refund reason: ${reason}`,
      custom_data: {
        original_transaction_id: transaction.id,
        refund_reason: reason,
        refund_type: refundAmount === originalAmount ? 'full' : 'partial'
      },
      processed_at: new Date()
    })

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: refundLog
    })
  } catch (error: any) {
    console.error('Process refund error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    })
  }
}

/**
 * Get ITN logs for debugging
 * GET /api/admin/payments/itn-logs
 */
export const getITNLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      status,
      page = '1',
      limit = '25',
      dateFrom,
      dateTo
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {
      itn_data: { [Op.ne]: null } // Only logs with ITN data
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom as string)
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo as string)
    }

    if (search) {
      where[Op.or] = [
        { transaction_id: { [Op.like]: `%${search}%` } },
        { payfast_payment_id: { [Op.like]: `%${search}%` } }
      ]
    }

    const { count, rows: logs } = await PaymentLog.findAndCountAll({
      where,
      attributes: [
        'id', 'transaction_id', 'payfast_payment_id', 'status',
        'amount_gross', 'currency', 'itn_data', 'created_at'
      ],
      order: [['created_at', 'DESC']],
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
    console.error('Get ITN logs error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ITN logs',
      error: error.message
    })
  }
}

/**
 * Get revenue analytics (MRR, churn rate, LTV)
 * GET /api/admin/payments/analytics
 */
export const getRevenueAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubs = await Subscription.findAll({
      where: { status: SubscriptionStatus.ACTIVE }
    })

    const mrr = activeSubs.reduce((sum, sub) => {
      return sum + parseFloat(sub.amount.toString())
    }, 0)

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeStartOfMonth = await Subscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        created_at: { [Op.lt]: thirtyDaysAgo }
      }
    })

    const canceledThisMonth = await Subscription.count({
      where: {
        status: SubscriptionStatus.CANCELED,
        canceled_at: { [Op.gte]: thirtyDaysAgo }
      }
    })

    const churnRate = activeStartOfMonth > 0
      ? (canceledThisMonth / activeStartOfMonth) * 100
      : 0

    // Calculate revenue by plan
    const revenueByPlan = await Subscription.findAll({
      where: { status: SubscriptionStatus.ACTIVE },
      attributes: [
        'plan',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['plan']
    })

    // Get new subscriptions vs cancellations (last 12 months)
    const monthlyTrends = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const newSubs = await Subscription.count({
        where: {
          created_at: {
            [Op.gte]: monthStart,
            [Op.lt]: monthEnd
          }
        }
      })

      const canceled = await Subscription.count({
        where: {
          status: SubscriptionStatus.CANCELED,
          canceled_at: {
            [Op.gte]: monthStart,
            [Op.lt]: monthEnd
          }
        }
      })

      const monthRevenue = await PaymentLog.sum('amount_net', {
        where: {
          status: PaymentStatus.COMPLETE,
          created_at: {
            [Op.gte]: monthStart,
            [Op.lt]: monthEnd
          }
        }
      }) || 0

      monthlyTrends.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM
        new_subscriptions: newSubs,
        cancellations: canceled,
        revenue: parseFloat(monthRevenue.toString()).toFixed(2)
      })
    }

    // Calculate failed payment stats
    const failedPayments = await PaymentLog.count({
      where: { status: PaymentStatus.FAILED }
    })

    const totalPayments = await PaymentLog.count()
    const failureRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0

    res.json({
      success: true,
      analytics: {
        mrr: mrr.toFixed(2),
        arr: (mrr * 12).toFixed(2), // Annual Recurring Revenue
        active_subscriptions: activeSubs.length,
        churn_rate: churnRate.toFixed(2),
        revenue_by_plan: revenueByPlan,
        monthly_trends: monthlyTrends,
        failed_payment_rate: failureRate.toFixed(2),
        failed_payments_count: failedPayments
      }
    })
  } catch (error: any) {
    console.error('Get revenue analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    })
  }
}

/**
 * Retry failed payment
 * POST /api/admin/payments/retry-failed
 */
export const retryFailedPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id } = req.body

    if (!transaction_id) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      })
      return
    }

    const transaction = await PaymentLog.findByPk(transaction_id)
    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
      return
    }

    if (transaction.status !== PaymentStatus.FAILED) {
      res.status(400).json({
        success: false,
        message: 'Only failed payments can be retried'
      })
      return
    }

    // TODO: Integrate with PayFast retry API when available
    // For now, we'll mark it for manual review

    await transaction.update({
      status: PaymentStatus.PENDING,
      error_message: `Retry requested on ${new Date().toISOString()}. Original error: ${transaction.error_message}`
    })

    res.json({
      success: true,
      message: 'Payment marked for retry. Manual processing may be required.',
      transaction
    })
  } catch (error: any) {
    console.error('Retry failed payment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retry payment',
      error: error.message
    })
  }
}
