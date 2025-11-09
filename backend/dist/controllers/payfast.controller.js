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
const User_1 = require("../models/User");
const subscription_model_1 = require("../models/subscription.model");
const payment_log_model_1 = require("../models/payment-log.model");
// Helper function to render with layout
const renderWithLayout = async (view, data = {}) => {
    const layoutPath = path_1.default.join(__dirname, '..', 'views', 'layouts', 'main.ejs');
    const viewPath = path_1.default.join(__dirname, '..', 'views', 'pages', `${view}.ejs`);
    const body = await ejs_1.default.renderFile(viewPath, data);
    return ejs_1.default.renderFile(layoutPath, { ...data, body });
};
// Pricing plans configuration
// NOTE: PayFast ONLY accepts ZAR currency
// Display prices are in USD on frontend, but PayFast processes in ZAR
const PRICING_PLANS = {
    free: {
        name: 'Free',
        displayPrice: 0, // USD for display
        payfastPrice: 0, // ZAR for PayFast processing
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
        displayPrice: 4.55, // $4.55/month USD (display only)
        payfastPrice: 85, // R85/month ZAR (PayFast processing)
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
        displayPrice: 13.50, // $13.50/month USD (display only)
        payfastPrice: 250, // R250/month ZAR (PayFast processing)
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
        displayPrice: 99.99, // $99.99/month USD (display only)
        payfastPrice: 1850, // R1850/month ZAR (PayFast processing)
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
            price: plan.displayPrice, // Display price in USD
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
        console.error('Get plans error:', error);
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
        // Create subscription record (store display price in USD)
        const subscription = await subscription_model_1.Subscription.create({
            user_id: user.id,
            plan: planId,
            status: subscription_model_1.SubscriptionStatus.PENDING,
            amount: plan.displayPrice, // Store display price for records
            currency: 'USD',
            started_at: new Date()
        });
        // Create payment log (store display price for tracking)
        await payment_log_model_1.PaymentLog.create({
            user_id: user.id,
            subscription_id: subscription.id,
            transaction_id: transactionId,
            payment_type: payment_log_model_1.PaymentType.SUBSCRIPTION,
            status: payment_log_model_1.PaymentStatus.PENDING,
            amount_gross: plan.displayPrice,
            amount_fee: 0,
            amount_net: plan.displayPrice,
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
                display_price_usd: plan.displayPrice,
                payfast_price_zar: plan.payfastPrice
            }
        });
        // Generate PayFast payment data with subscription (use ZAR price for PayFast)
        const paymentData = payfast_service_1.default.createSubscriptionPaymentData({
            userId: user.id,
            userEmail: userEmail || user.email,
            userName: userName || user.name || user.email.split('@')[0],
            planName: plan.name,
            planPrice: plan.payfastPrice, // CRITICAL: Use ZAR price for PayFast
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
        console.error('Initialize payment error:', error);
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
        console.log('🔔 PayFast ITN received:', JSON.stringify(req.body, null, 2));
        const itnData = req.body;
        // Step 1: Verify the request came from PayFast (OPTIONAL - signature validation is more reliable)
        // Note: PayFast ITN may not always include referer header, so we prioritize signature validation
        const referer = req.headers['referer'] || req.headers['origin'];
        if (referer) {
            try {
                const host = new URL(referer).hostname;
                if (payfast_service_1.default.validatePayFastHost(host)) {
                    console.log('✓ Request from valid PayFast host:', host);
                }
                else {
                    console.warn('⚠️  Request from non-PayFast host:', host, '- proceeding with signature validation');
                }
            }
            catch (e) {
                console.warn('⚠️  Could not parse referer/origin:', referer);
            }
        }
        else {
            console.log('ℹ️  No referer/origin header (common for PayFast ITN) - proceeding with signature validation');
        }
        // Step 2: Validate signature (PRIMARY security check)
        const receivedSignature = itnData.signature;
        delete itnData.signature; // Remove signature before validation
        if (!payfast_service_1.default.validateSignature(itnData, receivedSignature)) {
            console.error('Invalid signature');
            res.status(403).send('Invalid signature');
            return;
        }
        // Step 3: Verify payment with PayFast server
        const isValid = await payfast_service_1.default.verifyPaymentWithPayFast(itnData);
        if (!isValid) {
            console.error('Payment verification failed');
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
            console.error('Payment log not found:', m_payment_id);
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
                console.error('User not found:', userId);
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
            // Update user plan
            user.plan = planId;
            user.subscription_id = pf_payment_id;
            user.subscription_status = User_1.SubscriptionStatus.ACTIVE;
            // Update conversion limits based on plan
            const plan = PRICING_PLANS[planId];
            if (plan) {
                user.conversions_limit = plan.conversions;
                user.conversions_used = 0; // Reset usage on new subscription
            }
            await user.save();
            console.log(`✓ Subscription activated for user ${user.email} - Plan: ${planId}`);
        }
        // Send 200 OK response to PayFast
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Webhook error:', error);
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
        console.error('Return handler error:', error);
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
        console.error('Cancel handler error:', error);
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
        console.error('Get subscription error:', error);
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
        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription
        });
    }
    catch (error) {
        console.error('Cancel subscription error:', error);
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
        console.error('Get config error:', error);
        res.status(500).json({
            error: 'Failed to get configuration',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getConfig = getConfig;
// Functions are exported inline above
//# sourceMappingURL=payfast.controller.js.map