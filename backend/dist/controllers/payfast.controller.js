"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.cancelSubscription = exports.getSubscription = exports.handleCancel = exports.handleReturn = exports.handleWebhook = exports.initializePayment = exports.getPlans = void 0;
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const payfast_service_1 = __importDefault(require("../services/payfast.service"));
const email_service_1 = __importDefault(require("../services/email.service"));
const User_1 = require("../models/User");
const subscription_model_1 = require("../models/subscription.model");
const payment_log_model_1 = require("../models/payment-log.model");
const quota_utils_1 = require("../utils/quota.utils");
const logger_1 = __importDefault(require("../config/logger"));
// Helper function to render with layout
const renderWithLayout = async (view, data = {}) => {
    const layoutPath = path_1.default.join(__dirname, '..', 'views', 'layouts', 'main.ejs');
    const viewPath = path_1.default.join(__dirname, '..', 'views', 'pages', `${view}.ejs`);
    const body = await ejs_1.default.renderFile(viewPath, data);
    return ejs_1.default.renderFile(layoutPath, { ...data, body });
};
// Pricing plans configuration
// PayFast supports multi-currency via dashboard settings (Settings > Multi-currency)
// Once enabled, PayFast automatically handles currency conversion and display
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
 * GET /api/payfast/plans
 * Get all available pricing plans
 */
const getPlans = async (_req, res) => {
    try {
        const plans = Object.entries(PRICING_PLANS).map(([id, plan]) => ({
            id,
            name: plan.name,
            price: plan.price, // USD price - PayFast handles multi-currency display
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
        // Return JSON response
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
 * POST /api/payfast/initialize
 * Initialize a PayFast payment
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
        // Check if PayFast is configured
        if (!payfast_service_1.default.isConfigured()) {
            res.status(500).json({
                error: 'Payment gateway not configured',
                message: 'PayFast credentials are missing. Please contact support.'
            });
            return;
        }
        // Create subscription record (USD pricing)
        const subscription = await subscription_model_1.Subscription.create({
            user_id: user.id,
            plan: planId,
            status: subscription_model_1.SubscriptionStatus.PENDING,
            amount: plan.price, // USD price
            currency: 'USD',
            started_at: new Date()
        });
        // Create payment log (USD pricing)
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
            name_first: userName || user.name || user.email.split('@')[0],
            email_address: userEmail || user.email,
            item_name: `PDFLab ${plan.name} Plan`,
            item_description: `PDFLab ${plan.name} monthly subscription`,
            custom_data: {
                plan_id: planId,
                user_id: user.id,
                subscription_id: subscription.id,
                price_usd: plan.price
            }
        });
        // Generate PayFast payment data with subscription (USD pricing)
        // PayFast multi-currency handles conversion automatically
        const paymentData = payfast_service_1.default.createSubscriptionPaymentData({
            userId: user.id,
            userEmail: userEmail || user.email,
            userName: userName || user.name || user.email.split('@')[0],
            planName: plan.name,
            planPrice: plan.price, // USD price - PayFast handles conversion
            transactionId
        });
        res.json({
            success: true,
            message: 'Payment initialized',
            paymentUrl: payfast_service_1.default.getPayFastUrl(),
            paymentData: paymentData,
            transactionId: transactionId,
            subscriptionId: subscription.id
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
 * POST /api/payfast/webhook
 * Handle PayFast ITN (Instant Transaction Notification)
 */
const handleWebhook = async (req, res) => {
    try {
        logger_1.default.info('PayFast ITN received:', { body: JSON.stringify(req.body, null, 2) });
        const itnData = req.body;
        // Step 1: Verify the request came from PayFast (OPTIONAL - signature validation is more reliable)
        // Note: PayFast ITN may not always include referer header, so we prioritize signature validation
        const referer = req.headers['referer'] || req.headers['origin'];
        if (referer) {
            try {
                const host = new URL(referer).hostname;
                if (payfast_service_1.default.validatePayFastHost(host)) {
                    logger_1.default.info('✓ Request from valid PayFast host:', { host });
                }
                else {
                    logger_1.default.warn('Request from non-PayFast host - proceeding with signature validation', { host });
                }
            }
            catch (e) {
                logger_1.default.warn('⚠️  Could not parse referer/origin:', { referer });
            }
        }
        else {
            logger_1.default.info('ℹ️  No referer/origin header (common for PayFast ITN) - proceeding with signature validation');
        }
        // Step 2: Validate signature (PRIMARY security check)
        const receivedSignature = itnData.signature;
        delete itnData.signature; // Remove signature before validation
        if (!payfast_service_1.default.validateSignature(itnData, receivedSignature)) {
            logger_1.default.error('Invalid signature');
            res.status(403).send('Invalid signature');
            return;
        }
        // Step 3: Verify payment with PayFast server
        const isValid = await payfast_service_1.default.verifyPaymentWithPayFast(itnData);
        if (!isValid) {
            logger_1.default.error('Payment verification failed');
            res.status(403).send('Payment verification failed');
            return;
        }
        // Step 4: Process the payment
        const { m_payment_id, pf_payment_id, payment_status, amount_gross, amount_fee, amount_net, custom_str1, custom_str2, token } = itnData;
        // Find the payment log
        const paymentLog = await payment_log_model_1.PaymentLog.findOne({
            where: { transaction_id: m_payment_id }
        });
        if (!paymentLog) {
            logger_1.default.error('Payment log not found:', { m_payment_id });
            res.status(404).send('Payment not found');
            return;
        }
        // Update payment log
        paymentLog.payfast_payment_id = pf_payment_id;
        paymentLog.status = payment_status === 'COMPLETE' ? payment_log_model_1.PaymentStatus.COMPLETE : payment_log_model_1.PaymentStatus.FAILED;
        paymentLog.amount_gross = parseFloat(amount_gross);
        paymentLog.amount_fee = parseFloat(amount_fee);
        paymentLog.amount_net = parseFloat(amount_net);
        paymentLog.itn_data = itnData;
        paymentLog.processed_at = new Date();
        if (payment_status !== 'COMPLETE') {
            paymentLog.error_message = `Payment failed with status: ${payment_status}`;
        }
        await paymentLog.save();
        // If payment successful, update subscription and user
        if (payment_status === 'COMPLETE') {
            const userId = custom_str1;
            const planId = custom_str2;
            // Find user
            const user = await User_1.User.findByPk(userId);
            if (!user) {
                logger_1.default.error('User not found:', { userId });
                res.status(404).send('User not found');
                return;
            }
            // Find subscription
            const subscription = await subscription_model_1.Subscription.findByPk(paymentLog.subscription_id);
            if (subscription) {
                subscription.status = subscription_model_1.SubscriptionStatus.ACTIVE;
                subscription.payfast_token = token;
                subscription.payfast_subscription_id = pf_payment_id;
                subscription.billing_date = new Date();
                // Set next billing date (30 days from now)
                const nextBilling = new Date();
                nextBilling.setDate(nextBilling.getDate() + 30);
                subscription.next_billing_date = nextBilling;
                await subscription.save();
            }
            // Update user subscription metadata
            user.subscription_id = pf_payment_id;
            user.subscription_status = User_1.SubscriptionStatus.ACTIVE;
            // Update user plan and sync quota (this ensures quota is correct)
            await (0, quota_utils_1.updateUserPlan)(user, planId, true); // true = reset usage on new subscription
            logger_1.default.info(`✓ Subscription activated for user ${user.email} - Plan: ${planId} - Quota synced`);
            // Send payment receipt email (non-blocking)
            if (subscription) {
                const planName = PRICING_PLANS[planId]?.name || planId;
                email_service_1.default.sendPaymentReceiptEmail(user.email, {
                    plan: planName,
                    amount: amount_gross,
                    currency: 'USD',
                    transactionId: m_payment_id,
                    billingDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    nextBillingDate: subscription.next_billing_date?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'
                }).catch((error) => {
                    logger_1.default.error('Failed to send payment receipt email:', { error: error instanceof Error ? error.message : String(error) });
                    // Don't fail webhook if email fails
                });
            }
        }
        // Send 200 OK response to PayFast
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.default.error('Webhook error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).send('Webhook processing failed');
    }
};
exports.handleWebhook = handleWebhook;
/**
 * GET /api/payfast/return
 * Handle successful payment return
 */
const handleReturn = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        // Redirect to success page
        res.redirect(`${frontendUrl}/payment/success?${req.url.split('?')[1] || ''}`);
    }
    catch (error) {
        logger_1.default.error('Return handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process return' });
    }
};
exports.handleReturn = handleReturn;
/**
 * GET /api/payfast/cancel
 * Handle cancelled payment
 */
const handleCancel = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        // Redirect to cancel page
        res.redirect(`${frontendUrl}/payment/cancel?${req.url.split('?')[1] || ''}`);
    }
    catch (error) {
        logger_1.default.error('Cancel handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process cancellation' });
    }
};
exports.handleCancel = handleCancel;
/**
 * GET /api/payfast/subscription/:id
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
 * POST /api/payfast/cancel-subscription
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
        // Update subscription status
        subscription.status = subscription_model_1.SubscriptionStatus.CANCELED;
        subscription.canceled_at = new Date();
        subscription.ended_at = subscription.next_billing_date || new Date(); // Access until next billing
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
            // Don't fail cancellation if email fails
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
 * GET /api/payfast/config
 * Get PayFast configuration status
 */
const getConfig = async (req, res) => {
    try {
        const config = payfast_service_1.default.getConfig();
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
// Functions are exported inline above
//# sourceMappingURL=payfast.controller.js.map