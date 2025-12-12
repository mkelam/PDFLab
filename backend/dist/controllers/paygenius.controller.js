"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = exports.processRefund = exports.lookupPayment = exports.getConfig = exports.cancelSubscription = exports.getSubscription = exports.handleError = exports.handleCancel = exports.handleReturn = exports.handleWebhook = exports.initializePayment = exports.getPlans = void 0;
const uuid_1 = require("uuid");
const paygenius_service_1 = __importStar(require("../services/paygenius.service"));
const email_service_1 = __importDefault(require("../services/email.service"));
const User_1 = require("../models/User");
const subscription_model_1 = require("../models/subscription.model");
const payment_log_model_1 = require("../models/payment-log.model");
const quota_utils_1 = require("../utils/quota.utils");
const logger_1 = __importDefault(require("../config/logger"));
// Pricing plans configuration (same as before)
const PRICING_PLANS = {
    free: {
        name: 'Free',
        price: 0, // $0/month USD
        conversions: 3,
        maxFileSize: 10485760, // 10MB
        features: {
            conversionsPerMonth: 3,
            maxFileSize: 10485760,
            ocrOverlayAccess: false,
            advancedFeatures: false,
            priorityProcessing: false,
            apiAccess: false
        }
    },
    starter: {
        name: 'Starter',
        price: 9.99, // $9.99/month USD
        conversions: 100,
        maxFileSize: 26214400, // 25MB
        features: {
            conversionsPerMonth: 100,
            maxFileSize: 26214400,
            ocrOverlayAccess: true,
            advancedFeatures: false,
            priorityProcessing: false,
            apiAccess: false
        }
    },
    pro: {
        name: 'Pro',
        price: 29.99, // $29.99/month USD
        conversions: -1, // Unlimited
        maxFileSize: 104857600, // 100MB
        features: {
            conversionsPerMonth: -1,
            maxFileSize: 104857600,
            ocrOverlayAccess: true,
            advancedFeatures: true,
            priorityProcessing: true,
            apiAccess: false
        }
    },
    enterprise: {
        name: 'Enterprise',
        price: 99.99, // $99.99/month USD
        conversions: -1, // Unlimited
        maxFileSize: 524288000, // 500MB
        features: {
            conversionsPerMonth: -1,
            maxFileSize: 524288000,
            ocrOverlayAccess: true,
            advancedFeatures: true,
            priorityProcessing: true,
            apiAccess: true
        }
    }
};
/**
 * GET /api/paygenius/plans
 * Get all available pricing plans
 */
const getPlans = async (_req, res) => {
    try {
        const plans = Object.entries(PRICING_PLANS).map(([id, plan]) => ({
            id,
            name: plan.name,
            price: plan.price,
            currency: 'USD',
            billing_cycle: 'per month',
            description: `Perfect for ${id === 'free' ? 'getting started' : id === 'starter' ? 'individuals' : id === 'pro' ? 'professionals' : 'businesses'}`,
            conversions_limit: plan.conversions === -1 ? 999999 : plan.conversions,
            max_file_size_mb: Math.floor(plan.maxFileSize / (1024 * 1024)),
            features: [
                `${plan.conversions === -1 ? 'Unlimited' : plan.conversions} conversions per month`,
                `Max file size: ${Math.floor(plan.maxFileSize / (1024 * 1024))}MB`,
                plan.features.ocrOverlayAccess ? 'OCR overlay access' : 'No OCR overlay',
                plan.features.advancedFeatures ? 'Advanced features' : 'Basic features',
                plan.features.priorityProcessing ? 'Priority processing' : 'Standard processing',
                plan.features.apiAccess ? 'API access' : 'No API access'
            ],
            recommended: id === 'pro'
        }));
        res.json({ success: true, plans });
    }
    catch (error) {
        logger_1.default.error('Get plans error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch plans',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPlans = getPlans;
/**
 * POST /api/paygenius/initialize
 * Initialize a PayGenius payment - returns redirect URL for hosted payment page
 */
const initializePayment = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { plan: planId, userEmail, userName } = req.body;
        // Validate plan
        if (!planId || !PRICING_PLANS[planId]) {
            res.status(400).json({ error: 'Invalid plan selected' });
            return;
        }
        // Free plan doesn't require payment
        if (planId === 'free') {
            res.status(400).json({ error: 'Free plan does not require payment' });
            return;
        }
        const plan = PRICING_PLANS[planId];
        const transactionId = (0, uuid_1.v4)();
        const subscriptionRef = `SUB-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
        // Check if PayGenius is configured
        if (!paygenius_service_1.default.isConfigured()) {
            res.status(500).json({
                error: 'Payment gateway not configured',
                message: 'PayGenius credentials are missing. Please contact support.'
            });
            return;
        }
        // Create subscription record (PENDING until webhook confirms)
        const subscription = await subscription_model_1.Subscription.create({
            user_id: user.id,
            plan: planId,
            status: subscription_model_1.SubscriptionStatus.PENDING,
            amount: plan.price,
            currency: 'USD',
            started_at: new Date(),
            // Store PayGenius-specific reference
            paygenius_reference: subscriptionRef
        });
        // Create payment log
        const paymentName = userName || user.name || user.email.split('@')[0];
        const nameParts = paymentName.trim().split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Account';
        await payment_log_model_1.PaymentLog.create({
            user_id: user.id,
            subscription_id: subscription.id,
            transaction_id: transactionId,
            payment_type: payment_log_model_1.PaymentType.SUBSCRIPTION,
            status: payment_log_model_1.PaymentStatus.PENDING,
            amount_gross: plan.price,
            amount_fee: 0,
            amount_net: plan.price,
            currency: 'USD',
            plan: planId,
            name_first: firstName,
            name_last: lastName,
            email_address: userEmail || user.email,
            item_name: `PDFLab ${plan.name} Plan`,
            item_description: `PDFLab ${plan.name} monthly subscription`,
            custom_data: {
                plan_id: planId,
                user_id: user.id,
                subscription_id: subscription.id,
                paygenius_reference: subscriptionRef,
                price_usd: plan.price
            }
        });
        // Get redirect URLs
        const urls = paygenius_service_1.default.getDefaultUrls();
        // Create PayGenius redirect payment
        const { redirectUrl, reference } = await paygenius_service_1.default.createRedirectPayment({
            transaction: {
                reference: transactionId,
                currency: 'USD',
                amount: paygenius_service_1.default.dollarsToCents(plan.price) // PayGenius uses cents
            },
            consumer: {
                name: firstName,
                surname: lastName,
                email: userEmail || user.email
            },
            urls: {
                success: `${urls.success}?transaction_id=${transactionId}&subscription_id=${subscription.id}`,
                cancel: `${urls.cancel}?transaction_id=${transactionId}`,
                error: `${urls.error}?transaction_id=${transactionId}`,
                notify: urls.notify
            },
            subscription: {
                reference: subscriptionRef,
                interval: 'MONTHLY',
                firstname: firstName,
                lastname: lastName,
                email: userEmail || user.email
            }
        });
        // Update payment log with PayGenius reference
        await payment_log_model_1.PaymentLog.update({ paygenius_payment_id: reference }, { where: { transaction_id: transactionId } });
        res.json({
            success: true,
            message: 'Payment initialized',
            redirectUrl: redirectUrl,
            transactionId: transactionId,
            subscriptionId: subscription.id,
            paygeniusReference: reference
        });
    }
    catch (error) {
        logger_1.default.error('Initialize payment error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to initialize payment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.initializePayment = initializePayment;
/**
 * POST /api/paygenius/webhook
 * Handle PayGenius webhook notification
 */
const handleWebhook = async (req, res) => {
    try {
        logger_1.default.info('PayGenius webhook received:', { body: JSON.stringify(req.body, null, 2) });
        const webhookData = req.body;
        // Validate webhook signature (optional but recommended)
        const signature = req.headers['x-signature'];
        if (signature) {
            const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
            const isValid = paygenius_service_1.default.validateWebhookSignature(fullUrl, JSON.stringify(req.body), signature);
            if (!isValid) {
                logger_1.default.warn('Invalid webhook signature - proceeding with caution');
                // Don't reject - PayGenius might send webhooks without signature
            }
        }
        // Extract payment details from webhook
        const { reference, transactionReference, status, amount, currency, subscription } = webhookData;
        // Map PayGenius status to our status
        const paymentReference = reference || transactionReference;
        const pgStatus = status;
        const internalStatus = (0, paygenius_service_1.mapPayGeniusStatus)(pgStatus);
        // Find the payment log by transaction reference
        const paymentLog = await payment_log_model_1.PaymentLog.findOne({
            where: { transaction_id: paymentReference }
        });
        if (!paymentLog) {
            // Try finding by PayGenius payment ID
            const altPaymentLog = await payment_log_model_1.PaymentLog.findOne({
                where: { paygenius_payment_id: paymentReference }
            });
            if (!altPaymentLog) {
                logger_1.default.error('Payment log not found:', { reference: paymentReference });
                res.status(404).send('Payment not found');
                return;
            }
        }
        const targetPaymentLog = paymentLog || await payment_log_model_1.PaymentLog.findOne({
            where: { paygenius_payment_id: paymentReference }
        });
        if (!targetPaymentLog) {
            res.status(404).send('Payment not found');
            return;
        }
        // Update payment log
        targetPaymentLog.paygenius_payment_id = paymentReference;
        targetPaymentLog.status = internalStatus === 'complete' ? payment_log_model_1.PaymentStatus.COMPLETE :
            internalStatus === 'failed' ? payment_log_model_1.PaymentStatus.FAILED :
                internalStatus === 'cancelled' ? payment_log_model_1.PaymentStatus.CANCELLED :
                    payment_log_model_1.PaymentStatus.PENDING;
        targetPaymentLog.webhook_data = webhookData;
        targetPaymentLog.processed_at = new Date();
        if (internalStatus === 'failed') {
            targetPaymentLog.error_message = `Payment failed with status: ${status}`;
        }
        // Calculate fees if provided (PayGenius takes ~3.5% typically)
        if (amount) {
            const amountCents = typeof amount === 'number' ? amount : parseInt(amount);
            const amountDollars = paygenius_service_1.default.centsToDollars(amountCents);
            const estimatedFee = amountDollars * 0.035; // Estimate 3.5% fee
            targetPaymentLog.amount_gross = amountDollars;
            targetPaymentLog.amount_fee = estimatedFee;
            targetPaymentLog.amount_net = amountDollars - estimatedFee;
        }
        await targetPaymentLog.save();
        // If payment successful, update subscription and user
        if (internalStatus === 'complete') {
            const customData = targetPaymentLog.custom_data;
            const userId = customData?.user_id;
            const planId = customData?.plan_id;
            if (!userId || !planId) {
                logger_1.default.error('Missing user_id or plan_id in custom_data');
                res.status(200).send('OK'); // Still acknowledge to PayGenius
                return;
            }
            // Find user
            const user = await User_1.User.findByPk(userId);
            if (!user) {
                logger_1.default.error('User not found:', { userId });
                res.status(200).send('OK');
                return;
            }
            // Find subscription
            const subscriptionRecord = await subscription_model_1.Subscription.findByPk(targetPaymentLog.subscription_id);
            if (subscriptionRecord) {
                subscriptionRecord.status = subscription_model_1.SubscriptionStatus.ACTIVE;
                subscriptionRecord.paygenius_reference = paymentReference;
                // Store subscription reference if provided
                if (subscription?.reference) {
                    subscriptionRecord.paygenius_subscription_id = subscription.reference;
                }
                subscriptionRecord.billing_date = new Date();
                // Set next billing date (30 days from now)
                const nextBilling = new Date();
                nextBilling.setDate(nextBilling.getDate() + 30);
                subscriptionRecord.next_billing_date = nextBilling;
                await subscriptionRecord.save();
            }
            // Update user subscription metadata
            user.subscription_id = paymentReference;
            user.subscription_status = User_1.SubscriptionStatus.ACTIVE;
            // Update user plan and sync quota
            await (0, quota_utils_1.updateUserPlan)(user, planId, true);
            logger_1.default.info(`Payment successful for user ${user.email} - Plan: ${planId}`);
            // Send payment receipt email (non-blocking)
            if (subscriptionRecord) {
                const planName = PRICING_PLANS[planId]?.name || planId;
                email_service_1.default.sendPaymentReceiptEmail(user.email, {
                    plan: planName,
                    amount: targetPaymentLog.amount_gross.toString(),
                    currency: currency || 'USD',
                    transactionId: paymentReference,
                    billingDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    nextBillingDate: subscriptionRecord.next_billing_date?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'
                }).catch((error) => {
                    logger_1.default.error('Failed to send payment receipt email:', { error: error instanceof Error ? error.message : String(error) });
                });
            }
        }
        // Send 200 OK response to PayGenius
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.default.error('Webhook error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).send('Webhook processing failed');
    }
};
exports.handleWebhook = handleWebhook;
/**
 * GET /api/paygenius/return
 * Handle successful payment return
 */
const handleReturn = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        const queryString = req.url.split('?')[1] || '';
        // Redirect to success page
        res.redirect(`${frontendUrl}/payment/success?${queryString}`);
    }
    catch (error) {
        logger_1.default.error('Return handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process return' });
    }
};
exports.handleReturn = handleReturn;
/**
 * GET /api/paygenius/cancel
 * Handle cancelled payment
 */
const handleCancel = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        const queryString = req.url.split('?')[1] || '';
        // Redirect to cancel page
        res.redirect(`${frontendUrl}/payment/cancel?${queryString}`);
    }
    catch (error) {
        logger_1.default.error('Cancel handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process cancellation' });
    }
};
exports.handleCancel = handleCancel;
/**
 * GET /api/paygenius/error
 * Handle payment error
 */
const handleError = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        const queryString = req.url.split('?')[1] || '';
        // Redirect to error page (can use cancel page or dedicated error page)
        res.redirect(`${frontendUrl}/payment/cancel?error=true&${queryString}`);
    }
    catch (error) {
        logger_1.default.error('Error handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process error' });
    }
};
exports.handleError = handleError;
/**
 * GET /api/paygenius/subscription/:id
 * Get subscription details
 */
const getSubscription = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { id } = req.params;
        const subscription = await subscription_model_1.Subscription.findOne({
            where: {
                id,
                user_id: user.id
            }
        });
        if (!subscription) {
            res.status(404).json({ error: 'Subscription not found' });
            return;
        }
        res.json({
            success: true,
            subscription
        });
    }
    catch (error) {
        logger_1.default.error('Get subscription error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch subscription',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getSubscription = getSubscription;
/**
 * POST /api/paygenius/cancel-subscription
 * Cancel active subscription
 */
const cancelSubscription = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Find active subscription
        const subscription = await subscription_model_1.Subscription.findOne({
            where: {
                user_id: user.id,
                status: subscription_model_1.SubscriptionStatus.ACTIVE
            }
        });
        if (!subscription) {
            res.status(404).json({ error: 'No active subscription found' });
            return;
        }
        // Cancel with PayGenius if we have a subscription reference
        if (subscription.paygenius_subscription_id) {
            const result = await paygenius_service_1.default.cancelSubscription(subscription.paygenius_subscription_id);
            if (!result.success) {
                logger_1.default.warn('PayGenius cancellation failed:', { message: result.message });
                // Continue with local cancellation even if PayGenius API fails
            }
        }
        // Update subscription status locally
        subscription.status = subscription_model_1.SubscriptionStatus.CANCELED;
        subscription.canceled_at = new Date();
        subscription.ended_at = subscription.next_billing_date || new Date();
        await subscription.save();
        // Update user status
        user.subscription_status = User_1.SubscriptionStatus.CANCELED;
        await user.save();
        // Send cancellation email (non-blocking)
        const planName = PRICING_PLANS[subscription.plan]?.name || subscription.plan;
        email_service_1.default.sendSubscriptionCancelledEmail(user.email, {
            plan: planName,
            cancellationDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            accessUntil: subscription.ended_at?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'
        }).catch((error) => {
            logger_1.default.error('Failed to send cancellation email:', { error: error instanceof Error ? error.message : String(error) });
        });
        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription
        });
    }
    catch (error) {
        logger_1.default.error('Cancel subscription error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to cancel subscription',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.cancelSubscription = cancelSubscription;
/**
 * GET /api/paygenius/config
 * Get PayGenius configuration status
 */
const getConfig = async (_req, res) => {
    try {
        const config = paygenius_service_1.default.getConfig();
        res.json({
            success: true,
            config
        });
    }
    catch (error) {
        logger_1.default.error('Get config error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to get configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getConfig = getConfig;
/**
 * GET /api/paygenius/payment/:reference
 * Lookup payment status (useful for success page polling)
 */
const lookupPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        // First check our database
        const paymentLog = await payment_log_model_1.PaymentLog.findOne({
            where: { transaction_id: reference }
        });
        if (paymentLog) {
            res.json({
                success: true,
                payment: {
                    reference: paymentLog.transaction_id,
                    status: paymentLog.status,
                    amount: paymentLog.amount_gross,
                    currency: paymentLog.currency,
                    plan: paymentLog.plan,
                    processed_at: paymentLog.processed_at
                }
            });
            return;
        }
        // Fallback: query PayGenius directly
        try {
            const pgPayment = await paygenius_service_1.default.lookupPayment(reference);
            res.json({
                success: true,
                payment: {
                    reference: pgPayment.reference,
                    status: (0, paygenius_service_1.mapPayGeniusStatus)(pgPayment.status),
                    amount: paygenius_service_1.default.centsToDollars(pgPayment.amount),
                    currency: pgPayment.currency,
                    pending: pgPayment.pending
                }
            });
        }
        catch {
            res.status(404).json({ error: 'Payment not found' });
        }
    }
    catch (error) {
        logger_1.default.error('Lookup payment error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to lookup payment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.lookupPayment = lookupPayment;
/**
 * POST /api/paygenius/refund
 * Process a refund (admin only - protected by route middleware)
 */
const processRefund = async (req, res) => {
    try {
        const { reference, amount } = req.body;
        if (!reference) {
            res.status(400).json({ error: 'Payment reference is required' });
            return;
        }
        let result;
        if (amount) {
            // Partial refund
            result = await paygenius_service_1.default.refundPaymentPartial(reference, paygenius_service_1.default.dollarsToCents(amount));
        }
        else {
            // Full refund
            result = await paygenius_service_1.default.refundPaymentFull(reference);
        }
        if (result.success || result.pending) {
            // Update payment log
            await payment_log_model_1.PaymentLog.update({
                status: result.pending ? payment_log_model_1.PaymentStatus.PENDING : payment_log_model_1.PaymentStatus.COMPLETE,
                payment_type: payment_log_model_1.PaymentType.REFUND
            }, { where: { paygenius_payment_id: reference } });
            res.json({
                success: true,
                message: result.pending ? 'Refund is pending' : 'Refund processed successfully',
                pending: result.pending
            });
        }
        else {
            res.status(400).json({
                error: 'Refund failed',
                message: result.message
            });
        }
    }
    catch (error) {
        logger_1.default.error('Refund error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to process refund',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.processRefund = processRefund;
/**
 * GET /api/paygenius/validate
 * Test API connection
 */
const validateConnection = async (_req, res) => {
    try {
        const result = await paygenius_service_1.default.validateConnection();
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Validate connection error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.validateConnection = validateConnection;
//# sourceMappingURL=paygenius.controller.js.map