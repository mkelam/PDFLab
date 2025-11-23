"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryFailedPayment = exports.getRevenueAnalytics = exports.getITNLogs = exports.processRefund = exports.getTransactionById = exports.getAllTransactions = exports.resumeSubscription = exports.pauseSubscription = exports.cancelSubscription = exports.updateSubscription = exports.getSubscriptionById = exports.getAllSubscriptions = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const payment_log_model_1 = require("../models/payment-log.model");
const User_1 = require("../models/User");
const subscription_model_1 = require("../models/subscription.model");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Get all subscriptions with filters, search, and pagination
 * GET /api/admin/payments/subscriptions
 */
const getAllSubscriptions = async (req, res) => {
    try {
        const { search = '', status, plan, page = '1', limit = '25', sortBy = 'created_at', sortOrder = 'DESC', billingDateFrom, billingDateTo } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }
        if (plan && plan !== 'all') {
            where.plan = plan;
        }
        if (billingDateFrom || billingDateTo) {
            where.next_billing_date = {};
            if (billingDateFrom)
                where.next_billing_date[sequelize_1.Op.gte] = new Date(billingDateFrom);
            if (billingDateTo)
                where.next_billing_date[sequelize_1.Op.lte] = new Date(billingDateTo);
        }
        // Search across multiple fields
        const userWhere = {};
        if (search) {
            userWhere[sequelize_1.Op.or] = [
                { email: { [sequelize_1.Op.like]: `%${search}%` } },
                { name: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
            // Also search by subscription ID or PayFast token
            where[sequelize_1.Op.or] = [
                { id: { [sequelize_1.Op.like]: `%${search}%` } },
                { payfast_token: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        // Get subscriptions with user info
        const { count, rows: subscriptions } = await subscription_model_1.Subscription.findAndCountAll({
            where,
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name'],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    required: Object.keys(userWhere).length > 0
                }],
            order: [[sortBy, sortOrder]],
            limit: limitNum,
            offset
        });
        // Calculate stats
        const activeCount = await subscription_model_1.Subscription.count({ where: { status: subscription_model_1.SubscriptionStatus.ACTIVE } });
        const canceledCount = await subscription_model_1.Subscription.count({ where: { status: subscription_model_1.SubscriptionStatus.CANCELED } });
        const pastDueCount = await subscription_model_1.Subscription.count({ where: { status: subscription_model_1.SubscriptionStatus.PAST_DUE } });
        // Calculate MRR (Monthly Recurring Revenue)
        const activeSubs = await subscription_model_1.Subscription.findAll({
            where: { status: subscription_model_1.SubscriptionStatus.ACTIVE }
        });
        const mrr = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0);
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
        });
    }
    catch (error) {
        logger_1.default.error('Get all subscriptions error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
};
exports.getAllSubscriptions = getAllSubscriptions;
/**
 * Get subscription details with payment history
 * GET /api/admin/payments/subscriptions/:id
 */
const getSubscriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await subscription_model_1.Subscription.findByPk(id, {
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name', 'plan', 'conversions_used', 'conversions_limit']
                }]
        });
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
            return;
        }
        // Get payment history for this subscription
        const paymentHistory = await payment_log_model_1.PaymentLog.findAll({
            where: { subscription_id: id },
            order: [['created_at', 'DESC']],
            limit: 50
        });
        res.json({
            success: true,
            subscription,
            paymentHistory
        });
    }
    catch (error) {
        logger_1.default.error('Get subscription by ID error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription',
            error: error.message
        });
    }
};
exports.getSubscriptionById = getSubscriptionById;
/**
 * Update subscription (manual plan change)
 * PUT /api/admin/payments/subscriptions/:id
 */
const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, amount, next_billing_date, status } = req.body;
        const subscription = await subscription_model_1.Subscription.findByPk(id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
            return;
        }
        // Update subscription fields
        const updates = {};
        if (plan)
            updates.plan = plan;
        if (amount !== undefined)
            updates.amount = amount;
        if (next_billing_date)
            updates.next_billing_date = new Date(next_billing_date);
        if (status)
            updates.status = status;
        await subscription.update(updates);
        // Also update user's plan if changed
        if (plan) {
            await User_1.User.update({ plan }, { where: { id: subscription.user_id } });
        }
        res.json({
            success: true,
            message: 'Subscription updated successfully',
            subscription
        });
    }
    catch (error) {
        logger_1.default.error('Update subscription error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to update subscription',
            error: error.message
        });
    }
};
exports.updateSubscription = updateSubscription;
/**
 * Cancel subscription
 * POST /api/admin/payments/subscriptions/:id/cancel
 */
const cancelSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { immediately = false } = req.body;
        const subscription = await subscription_model_1.Subscription.findByPk(id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
            return;
        }
        if (subscription.status === subscription_model_1.SubscriptionStatus.CANCELED) {
            res.status(400).json({
                success: false,
                message: 'Subscription is already canceled'
            });
            return;
        }
        // Update subscription
        const updates = {
            status: subscription_model_1.SubscriptionStatus.CANCELED,
            canceled_at: new Date()
        };
        if (immediately) {
            updates.ended_at = new Date();
            // Downgrade user to free plan immediately
            await User_1.User.update({
                plan: User_1.UserPlan.FREE,
                conversions_limit: 3 // Free plan limit
            }, { where: { id: subscription.user_id } });
        }
        else {
            // Cancel at end of billing cycle
            updates.cancel_at = subscription.next_billing_date;
            updates.ended_at = subscription.next_billing_date;
        }
        await subscription.update(updates);
        res.json({
            success: true,
            message: immediately
                ? 'Subscription canceled immediately'
                : 'Subscription will be canceled at end of billing cycle',
            subscription
        });
    }
    catch (error) {
        logger_1.default.error('Cancel subscription error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message
        });
    }
};
exports.cancelSubscription = cancelSubscription;
/**
 * Pause subscription
 * POST /api/admin/payments/subscriptions/:id/pause
 */
const pauseSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await subscription_model_1.Subscription.findByPk(id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
            return;
        }
        if (subscription.status !== subscription_model_1.SubscriptionStatus.ACTIVE) {
            res.status(400).json({
                success: false,
                message: 'Only active subscriptions can be paused'
            });
            return;
        }
        // Note: PayFast doesn't have native pause functionality
        // We'll mark it as pending and skip billing
        await subscription.update({
            status: subscription_model_1.SubscriptionStatus.PENDING
        });
        res.json({
            success: true,
            message: 'Subscription paused successfully',
            subscription
        });
    }
    catch (error) {
        logger_1.default.error('Pause subscription error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to pause subscription',
            error: error.message
        });
    }
};
exports.pauseSubscription = pauseSubscription;
/**
 * Resume subscription
 * POST /api/admin/payments/subscriptions/:id/resume
 */
const resumeSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await subscription_model_1.Subscription.findByPk(id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
            return;
        }
        if (subscription.status !== subscription_model_1.SubscriptionStatus.PENDING) {
            res.status(400).json({
                success: false,
                message: 'Only paused subscriptions can be resumed'
            });
            return;
        }
        await subscription.update({
            status: subscription_model_1.SubscriptionStatus.ACTIVE
        });
        res.json({
            success: true,
            message: 'Subscription resumed successfully',
            subscription
        });
    }
    catch (error) {
        logger_1.default.error('Resume subscription error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to resume subscription',
            error: error.message
        });
    }
};
exports.resumeSubscription = resumeSubscription;
/**
 * Get all payment transactions with filters
 * GET /api/admin/payments/transactions
 */
const getAllTransactions = async (req, res) => {
    try {
        const { search = '', status, type, page = '1', limit = '25', sortBy = 'created_at', sortOrder = 'DESC', dateFrom, dateTo } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }
        if (type && type !== 'all') {
            where.payment_type = type;
        }
        if (dateFrom || dateTo) {
            where.created_at = {};
            if (dateFrom)
                where.created_at[sequelize_1.Op.gte] = new Date(dateFrom);
            if (dateTo)
                where.created_at[sequelize_1.Op.lte] = new Date(dateTo);
        }
        // Search by transaction ID, email, or PayFast ID
        if (search) {
            where[sequelize_1.Op.or] = [
                { transaction_id: { [sequelize_1.Op.like]: `%${search}%` } },
                { payfast_payment_id: { [sequelize_1.Op.like]: `%${search}%` } },
                { email_address: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        // Get transactions with user info
        const { count, rows: transactions } = await payment_log_model_1.PaymentLog.findAndCountAll({
            where,
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name']
                }],
            order: [[sortBy, sortOrder]],
            limit: limitNum,
            offset
        });
        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completeToday = await payment_log_model_1.PaymentLog.count({
            where: {
                status: payment_log_model_1.PaymentStatus.COMPLETE,
                created_at: { [sequelize_1.Op.gte]: today }
            }
        });
        const failedToday = await payment_log_model_1.PaymentLog.count({
            where: {
                status: payment_log_model_1.PaymentStatus.FAILED,
                created_at: { [sequelize_1.Op.gte]: today }
            }
        });
        const totalRevenue = await payment_log_model_1.PaymentLog.sum('amount_net', {
            where: { status: payment_log_model_1.PaymentStatus.COMPLETE }
        }) || 0;
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
        });
    }
    catch (error) {
        logger_1.default.error('Get all transactions error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
};
exports.getAllTransactions = getAllTransactions;
/**
 * Get transaction details
 * GET /api/admin/payments/transactions/:id
 */
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await payment_log_model_1.PaymentLog.findByPk(id, {
            include: [
                {
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name', 'plan']
                },
                {
                    model: subscription_model_1.Subscription,
                    as: 'subscription',
                    attributes: ['id', 'plan', 'status', 'amount']
                }
            ]
        });
        if (!transaction) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
            return;
        }
        res.json({
            success: true,
            transaction
        });
    }
    catch (error) {
        logger_1.default.error('Get transaction by ID error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction',
            error: error.message
        });
    }
};
exports.getTransactionById = getTransactionById;
/**
 * Process refund
 * POST /api/admin/payments/refund
 */
const processRefund = async (req, res) => {
    try {
        const { transaction_id, amount, reason } = req.body;
        if (!transaction_id || !amount || !reason) {
            res.status(400).json({
                success: false,
                message: 'Transaction ID, amount, and reason are required'
            });
            return;
        }
        const transaction = await payment_log_model_1.PaymentLog.findByPk(transaction_id);
        if (!transaction) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
            return;
        }
        if (transaction.status !== payment_log_model_1.PaymentStatus.COMPLETE) {
            res.status(400).json({
                success: false,
                message: 'Only completed payments can be refunded'
            });
            return;
        }
        const refundAmount = parseFloat(amount);
        const originalAmount = parseFloat(transaction.amount_gross.toString());
        if (refundAmount > originalAmount) {
            res.status(400).json({
                success: false,
                message: 'Refund amount cannot exceed original payment amount'
            });
            return;
        }
        // TODO: Integrate with PayFast refund API when available
        // For now, we'll create a refund log entry
        const refundLog = await payment_log_model_1.PaymentLog.create({
            user_id: transaction.user_id,
            subscription_id: transaction.subscription_id,
            transaction_id: `refund-${Date.now()}-${transaction.id.substring(0, 8)}`,
            payfast_payment_id: transaction.payfast_payment_id,
            payment_type: payment_log_model_1.PaymentType.REFUND,
            status: payment_log_model_1.PaymentStatus.COMPLETE,
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
        });
        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: refundLog
        });
    }
    catch (error) {
        logger_1.default.error('Process refund error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
};
exports.processRefund = processRefund;
/**
 * Get ITN logs for debugging
 * GET /api/admin/payments/itn-logs
 */
const getITNLogs = async (req, res) => {
    try {
        const { search = '', status, page = '1', limit = '25', dateFrom, dateTo } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const where = {
            itn_data: { [sequelize_1.Op.ne]: null } // Only logs with ITN data
        };
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.created_at = {};
            if (dateFrom)
                where.created_at[sequelize_1.Op.gte] = new Date(dateFrom);
            if (dateTo)
                where.created_at[sequelize_1.Op.lte] = new Date(dateTo);
        }
        if (search) {
            where[sequelize_1.Op.or] = [
                { transaction_id: { [sequelize_1.Op.like]: `%${search}%` } },
                { payfast_payment_id: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        const { count, rows: logs } = await payment_log_model_1.PaymentLog.findAndCountAll({
            where,
            attributes: [
                'id', 'transaction_id', 'payfast_payment_id', 'status',
                'amount_gross', 'currency', 'itn_data', 'created_at'
            ],
            order: [['created_at', 'DESC']],
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
        logger_1.default.error('Get ITN logs error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ITN logs',
            error: error.message
        });
    }
};
exports.getITNLogs = getITNLogs;
/**
 * Get revenue analytics (MRR, churn rate, LTV)
 * GET /api/admin/payments/analytics
 */
const getRevenueAnalytics = async (req, res) => {
    try {
        // Calculate MRR (Monthly Recurring Revenue)
        const activeSubs = await subscription_model_1.Subscription.findAll({
            where: { status: subscription_model_1.SubscriptionStatus.ACTIVE }
        });
        const mrr = activeSubs.reduce((sum, sub) => {
            return sum + parseFloat(sub.amount.toString());
        }, 0);
        // Calculate churn rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeStartOfMonth = await subscription_model_1.Subscription.count({
            where: {
                status: subscription_model_1.SubscriptionStatus.ACTIVE,
                created_at: { [sequelize_1.Op.lt]: thirtyDaysAgo }
            }
        });
        const canceledThisMonth = await subscription_model_1.Subscription.count({
            where: {
                status: subscription_model_1.SubscriptionStatus.CANCELED,
                canceled_at: { [sequelize_1.Op.gte]: thirtyDaysAgo }
            }
        });
        const churnRate = activeStartOfMonth > 0
            ? (canceledThisMonth / activeStartOfMonth) * 100
            : 0;
        // Calculate revenue by plan
        const revenueByPlan = await subscription_model_1.Subscription.findAll({
            where: { status: subscription_model_1.SubscriptionStatus.ACTIVE },
            attributes: [
                'plan',
                [database_1.sequelize.fn('SUM', database_1.sequelize.col('amount')), 'total'],
                [database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'count']
            ],
            group: ['plan']
        });
        // Get new subscriptions vs cancellations (last 12 months)
        const monthlyTrends = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            const newSubs = await subscription_model_1.Subscription.count({
                where: {
                    created_at: {
                        [sequelize_1.Op.gte]: monthStart,
                        [sequelize_1.Op.lt]: monthEnd
                    }
                }
            });
            const canceled = await subscription_model_1.Subscription.count({
                where: {
                    status: subscription_model_1.SubscriptionStatus.CANCELED,
                    canceled_at: {
                        [sequelize_1.Op.gte]: monthStart,
                        [sequelize_1.Op.lt]: monthEnd
                    }
                }
            });
            const monthRevenue = await payment_log_model_1.PaymentLog.sum('amount_net', {
                where: {
                    status: payment_log_model_1.PaymentStatus.COMPLETE,
                    created_at: {
                        [sequelize_1.Op.gte]: monthStart,
                        [sequelize_1.Op.lt]: monthEnd
                    }
                }
            }) || 0;
            monthlyTrends.push({
                month: monthStart.toISOString().substring(0, 7), // YYYY-MM
                new_subscriptions: newSubs,
                cancellations: canceled,
                revenue: parseFloat(monthRevenue.toString()).toFixed(2)
            });
        }
        // Calculate failed payment stats
        const failedPayments = await payment_log_model_1.PaymentLog.count({
            where: { status: payment_log_model_1.PaymentStatus.FAILED }
        });
        const totalPayments = await payment_log_model_1.PaymentLog.count();
        const failureRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;
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
        });
    }
    catch (error) {
        logger_1.default.error('Get revenue analytics error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};
exports.getRevenueAnalytics = getRevenueAnalytics;
/**
 * Retry failed payment
 * POST /api/admin/payments/retry-failed
 */
const retryFailedPayment = async (req, res) => {
    try {
        const { transaction_id } = req.body;
        if (!transaction_id) {
            res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
            return;
        }
        const transaction = await payment_log_model_1.PaymentLog.findByPk(transaction_id);
        if (!transaction) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
            return;
        }
        if (transaction.status !== payment_log_model_1.PaymentStatus.FAILED) {
            res.status(400).json({
                success: false,
                message: 'Only failed payments can be retried'
            });
            return;
        }
        // TODO: Integrate with PayFast retry API when available
        // For now, we'll mark it for manual review
        await transaction.update({
            status: payment_log_model_1.PaymentStatus.PENDING,
            error_message: `Retry requested on ${new Date().toISOString()}. Original error: ${transaction.error_message}`
        });
        res.json({
            success: true,
            message: 'Payment marked for retry. Manual processing may be required.',
            transaction
        });
    }
    catch (error) {
        logger_1.default.error('Retry failed payment error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: 'Failed to retry payment',
            error: error.message
        });
    }
};
exports.retryFailedPayment = retryFailedPayment;
//# sourceMappingURL=payment.admin.controller.js.map