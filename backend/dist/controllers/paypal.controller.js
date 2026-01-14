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
exports.lookupPayment = exports.processRefund = exports.validateConnection = exports.getConfig = exports.cancelSubscription = exports.getSubscription = exports.handleCancel = exports.handleReturn = exports.handleWebhook = exports.capturePayment = exports.initializePayment = exports.getPlans = void 0;
const uuid_1 = require("uuid");
const paypal_service_1 = __importStar(require("../services/paypal.service"));
const email_service_1 = __importDefault(require("../services/email.service"));
const User_1 = require("../models/User");
const subscription_model_1 = require("../models/subscription.model");
const payment_log_model_1 = require("../models/payment-log.model");
const quota_utils_1 = require("../utils/quota.utils");
const logger_1 = __importDefault(require("../config/logger"));
// Pricing plans configuration - Founder's Edition Pricing
const PRICING_PLANS = {
    free: {
        name: 'Free',
        price: 0,
        originalPrice: 0,
        conversions: 10, // 10 conversions per month
        maxFileSize: 10485760,
        features: {
            conversionsPerMonth: 10,
            maxFileSize: 10485760,
            ocrOverlayAccess: false,
            advancedFeatures: false,
            priorityProcessing: false,
            apiAccess: false
        }
    },
    starter: {
        name: 'Starter',
        price: 4.55, // Founder's Edition: $4.55/month (was $9.99)
        originalPrice: 9.99,
        conversions: 100,
        maxFileSize: 26214400,
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
        price: 13.50, // Founder's Edition: $13.50/month (was $29.99)
        originalPrice: 29.99,
        conversions: -1,
        maxFileSize: 104857600,
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
        price: 0, // Custom pricing - contact sales
        originalPrice: 99.99,
        conversions: -1,
        maxFileSize: 524288000,
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
// PayPal Plan IDs (set these after creating billing plans in PayPal)
// These should be stored in environment variables in production
const PAYPAL_PLAN_IDS = {
    starter: process.env.PAYPAL_PLAN_STARTER || '',
    pro: process.env.PAYPAL_PLAN_PRO || '',
    enterprise: process.env.PAYPAL_PLAN_ENTERPRISE || ''
};
/**
 * GET /api/paypal/plans
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
 * POST /api/paypal/initialize
 * Initialize a PayPal payment - returns approval URL
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
        const subscriptionRef = `PAYPAL-SUB-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
        // Check if PayPal is configured
        if (!paypal_service_1.default.isConfigured()) {
            res.status(500).json({
                error: 'Payment gateway not configured',
                message: 'PayPal credentials are missing. Please contact support.'
            });
            return;
        }
        // Create subscription record (PENDING until webhook confirms)
        const subscription = await subscription_model_1.Subscription.create({
            user_id: user.id,
            plan: planId,
            status: subscription_model_1.SubscriptionStatus.PENDING,
            payment_provider: 'paypal',
            amount: plan.price,
            currency: 'USD',
            started_at: new Date(),
            paypal_subscription_id: subscriptionRef
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
            payment_provider: 'paypal',
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
                paypal_reference: subscriptionRef,
                price_usd: plan.price
            }
        });
        // Get redirect URLs
        const urls = paypal_service_1.default.getDefaultUrls();
        // Check if we have a PayPal plan ID for subscriptions
        const paypalPlanId = PAYPAL_PLAN_IDS[planId];
        let result;
        if (paypalPlanId) {
            // Create a subscription for recurring payments
            const subscriptionResult = await paypal_service_1.default.createSubscription({
                planId: paypalPlanId,
                reference: transactionId,
                email: userEmail || user.email,
                firstName,
                lastName,
                returnUrl: `${urls.success}?transaction_id=${transactionId}&subscription_id=${subscription.id}&provider=paypal`,
                cancelUrl: `${urls.cancel}?transaction_id=${transactionId}&provider=paypal`
            });
            // Update subscription with PayPal subscription ID
            subscription.paypal_subscription_id = subscriptionResult.id;
            await subscription.save();
            result = {
                approveUrl: subscriptionResult.approveUrl,
                paypalId: subscriptionResult.id
            };
        }
        else {
            // Fallback to one-time order if no subscription plan configured
            const orderResult = await paypal_service_1.default.createOrder({
                reference: transactionId,
                amount: plan.price,
                currency: 'USD',
                description: `PDFLab ${plan.name} Plan - Monthly Subscription`,
                returnUrl: `${urls.success}?transaction_id=${transactionId}&subscription_id=${subscription.id}&provider=paypal`,
                cancelUrl: `${urls.cancel}?transaction_id=${transactionId}&provider=paypal`
            });
            // Update payment log with PayPal order ID
            await payment_log_model_1.PaymentLog.update({ paypal_payment_id: orderResult.id }, { where: { transaction_id: transactionId } });
            result = {
                approveUrl: orderResult.approveUrl,
                paypalId: orderResult.id
            };
        }
        res.json({
            success: true,
            message: 'Payment initialized',
            approveUrl: result.approveUrl,
            transactionId: transactionId,
            subscriptionId: subscription.id,
            paypalId: result.paypalId
        });
    }
    catch (error) {
        logger_1.default.error('Initialize PayPal payment error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to initialize payment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.initializePayment = initializePayment;
/**
 * POST /api/paypal/capture
 * Capture payment after user approval (for one-time orders)
 */
const capturePayment = async (req, res) => {
    try {
        const { orderId, transactionId } = req.body;
        if (!orderId) {
            res.status(400).json({ error: 'Order ID is required' });
            return;
        }
        // Capture the order
        const captureResult = await paypal_service_1.default.captureOrder(orderId);
        if (captureResult.status !== 'COMPLETED') {
            res.status(400).json({
                error: 'Payment not completed',
                status: captureResult.status
            });
            return;
        }
        // Find and update payment log
        const paymentLog = await payment_log_model_1.PaymentLog.findOne({
            where: transactionId ? { transaction_id: transactionId } : { paypal_payment_id: orderId }
        });
        if (paymentLog) {
            paymentLog.status = payment_log_model_1.PaymentStatus.COMPLETE;
            paymentLog.paypal_payment_id = captureResult.captureId || orderId;
            paymentLog.processed_at = new Date();
            if (captureResult.amount) {
                const estimatedFee = captureResult.amount * 0.0349 + 0.49; // PayPal standard rate
                paymentLog.amount_gross = captureResult.amount;
                paymentLog.amount_fee = estimatedFee;
                paymentLog.amount_net = captureResult.amount - estimatedFee;
            }
            await paymentLog.save();
            // Update subscription and user
            const customData = paymentLog.custom_data;
            if (customData?.user_id && customData?.plan_id) {
                await activateSubscription(customData.user_id, customData.plan_id, paymentLog);
            }
        }
        res.json({
            success: true,
            message: 'Payment captured successfully',
            captureId: captureResult.captureId
        });
    }
    catch (error) {
        logger_1.default.error('Capture payment error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to capture payment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.capturePayment = capturePayment;
/**
 * POST /api/paypal/webhook
 * Handle PayPal webhook notifications
 */
const handleWebhook = async (req, res) => {
    try {
        logger_1.default.info('PayPal webhook received:', { eventType: req.body?.event_type });
        const webhookEvent = req.body;
        // Verify webhook signature
        const headers = {
            'paypal-auth-algo': req.headers['paypal-auth-algo'],
            'paypal-cert-url': req.headers['paypal-cert-url'],
            'paypal-transmission-id': req.headers['paypal-transmission-id'],
            'paypal-transmission-sig': req.headers['paypal-transmission-sig'],
            'paypal-transmission-time': req.headers['paypal-transmission-time']
        };
        const isValid = await paypal_service_1.default.verifyWebhookSignature(headers, JSON.stringify(req.body));
        if (!isValid) {
            logger_1.default.warn('Invalid PayPal webhook signature');
            // Don't reject - continue processing but log the warning
        }
        const eventType = webhookEvent.event_type;
        const resource = webhookEvent.resource;
        switch (eventType) {
            // Payment events
            case paypal_service_1.PayPalWebhookEvent.PAYMENT_CAPTURE_COMPLETED:
                await handlePaymentComplete(resource, webhookEvent);
                break;
            case paypal_service_1.PayPalWebhookEvent.PAYMENT_CAPTURE_DENIED:
                await handlePaymentDenied(resource, webhookEvent);
                break;
            case paypal_service_1.PayPalWebhookEvent.PAYMENT_CAPTURE_REFUNDED:
                await handlePaymentRefunded(resource);
                break;
            case 'PAYMENT.CAPTURE.REVERSED':
                await handlePaymentReversed(resource);
                break;
            case 'PAYMENT.CAPTURE.PENDING':
                await handlePaymentPending(resource);
                break;
            // Subscription events
            case paypal_service_1.PayPalWebhookEvent.BILLING_SUBSCRIPTION_CREATED:
                await handleSubscriptionCreated(resource);
                break;
            case paypal_service_1.PayPalWebhookEvent.BILLING_SUBSCRIPTION_ACTIVATED:
                await handleSubscriptionActivated(resource);
                break;
            case paypal_service_1.PayPalWebhookEvent.BILLING_SUBSCRIPTION_CANCELLED:
                await handleSubscriptionCancelled(resource);
                break;
            case paypal_service_1.PayPalWebhookEvent.BILLING_SUBSCRIPTION_SUSPENDED:
                await handleSubscriptionSuspended(resource);
                break;
            case 'BILLING.SUBSCRIPTION.EXPIRED':
                await handleSubscriptionExpired(resource);
                break;
            case paypal_service_1.PayPalWebhookEvent.BILLING_SUBSCRIPTION_PAYMENT_FAILED:
                await handlePaymentFailed(resource);
                break;
            // Order events
            case 'CHECKOUT.ORDER.APPROVED':
                await handleOrderApproved(resource, webhookEvent);
                break;
            case 'CHECKOUT.ORDER.COMPLETED':
                await handleOrderCompleted(resource, webhookEvent);
                break;
            default:
                logger_1.default.info('Unhandled PayPal webhook event:', { eventType, resourceId: resource?.id });
        }
        // Always acknowledge webhook
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.default.error('PayPal webhook error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).send('Webhook processing failed');
    }
};
exports.handleWebhook = handleWebhook;
/**
 * Handle successful payment capture
 */
async function handlePaymentComplete(resource, webhookEvent) {
    const paymentId = resource.id;
    const customId = resource.custom_id;
    logger_1.default.info('Processing PAYMENT.CAPTURE.COMPLETED:', { paymentId, customId });
    // Find payment log
    const paymentLog = await payment_log_model_1.PaymentLog.findOne({
        where: customId ? { transaction_id: customId } : { paypal_payment_id: paymentId }
    });
    if (!paymentLog) {
        logger_1.default.warn('Payment log not found for PayPal capture:', { paymentId, customId });
        return;
    }
    // Update payment log
    paymentLog.status = payment_log_model_1.PaymentStatus.COMPLETE;
    paymentLog.paypal_payment_id = paymentId;
    paymentLog.webhook_data = webhookEvent;
    paymentLog.processed_at = new Date();
    if (resource.amount?.value) {
        const amount = parseFloat(resource.amount.value);
        const estimatedFee = amount * 0.0349 + 0.49;
        paymentLog.amount_gross = amount;
        paymentLog.amount_fee = estimatedFee;
        paymentLog.amount_net = amount - estimatedFee;
    }
    await paymentLog.save();
    // Activate subscription
    const customData = paymentLog.custom_data;
    if (customData?.user_id && customData?.plan_id) {
        await activateSubscription(customData.user_id, customData.plan_id, paymentLog);
    }
    logger_1.default.info('Payment capture completed successfully:', { paymentId, userId: customData?.user_id });
}
/**
 * Handle payment denied
 */
async function handlePaymentDenied(resource, webhookEvent) {
    const paymentId = resource.id;
    const customId = resource.custom_id;
    logger_1.default.warn('Processing PAYMENT.CAPTURE.DENIED:', { paymentId, customId });
    const paymentLog = await payment_log_model_1.PaymentLog.findOne({
        where: customId ? { transaction_id: customId } : { paypal_payment_id: paymentId }
    });
    if (paymentLog) {
        paymentLog.status = payment_log_model_1.PaymentStatus.FAILED;
        paymentLog.error_message = 'Payment capture denied by PayPal';
        paymentLog.webhook_data = webhookEvent;
        await paymentLog.save();
    }
    logger_1.default.error('Payment denied:', { paymentId, customId });
}
/**
 * Handle payment reversed (chargeback)
 */
async function handlePaymentReversed(resource) {
    const paymentId = resource.id;
    logger_1.default.warn('Processing PAYMENT.CAPTURE.REVERSED (chargeback):', { paymentId });
    const paymentLog = await payment_log_model_1.PaymentLog.findOne({
        where: { paypal_payment_id: paymentId }
    });
    if (paymentLog) {
        paymentLog.status = payment_log_model_1.PaymentStatus.CANCELLED;
        paymentLog.error_message = 'Payment reversed (chargeback)';
        await paymentLog.save();
        // Consider suspending the subscription on chargeback
        if (paymentLog.subscription_id) {
            const subscription = await subscription_model_1.Subscription.findByPk(paymentLog.subscription_id);
            if (subscription) {
                subscription.status = subscription_model_1.SubscriptionStatus.PAST_DUE;
                await subscription.save();
            }
        }
    }
    logger_1.default.error('Payment reversed (chargeback):', { paymentId });
}
/**
 * Handle payment pending
 */
async function handlePaymentPending(resource) {
    const paymentId = resource.id;
    const customId = resource.custom_id;
    logger_1.default.info('Processing PAYMENT.CAPTURE.PENDING:', { paymentId, customId });
    const paymentLog = await payment_log_model_1.PaymentLog.findOne({
        where: customId ? { transaction_id: customId } : { paypal_payment_id: paymentId }
    });
    if (paymentLog) {
        paymentLog.status = payment_log_model_1.PaymentStatus.PENDING;
        paymentLog.paypal_payment_id = paymentId;
        await paymentLog.save();
    }
}
/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(resource) {
    const subscriptionId = resource.id;
    const customId = resource.custom_id;
    logger_1.default.info('Processing BILLING.SUBSCRIPTION.CREATED:', { subscriptionId, customId });
    // Find payment log by custom reference
    if (customId) {
        const paymentLog = await payment_log_model_1.PaymentLog.findOne({
            where: { transaction_id: customId }
        });
        if (paymentLog?.subscription_id) {
            const subscription = await subscription_model_1.Subscription.findByPk(paymentLog.subscription_id);
            if (subscription) {
                subscription.paypal_subscription_id = subscriptionId;
                await subscription.save();
                logger_1.default.info('Subscription linked to PayPal:', { subscriptionId, localId: subscription.id });
            }
        }
    }
}
/**
 * Handle subscription expired
 */
async function handleSubscriptionExpired(resource) {
    const subscriptionId = resource.id;
    logger_1.default.info('Processing BILLING.SUBSCRIPTION.EXPIRED:', { subscriptionId });
    const subscription = await subscription_model_1.Subscription.findOne({
        where: { paypal_subscription_id: subscriptionId }
    });
    if (!subscription) {
        logger_1.default.warn('Subscription not found for expiration:', { subscriptionId });
        return;
    }
    subscription.status = subscription_model_1.SubscriptionStatus.CANCELED;
    subscription.ended_at = new Date();
    await subscription.save();
    // Update user status
    const user = await User_1.User.findByPk(subscription.user_id);
    if (user) {
        user.subscription_status = User_1.SubscriptionStatus.CANCELED;
        await user.save();
    }
    logger_1.default.info('Subscription expired:', { subscriptionId });
}
/**
 * Handle order approved (customer approved payment)
 */
async function handleOrderApproved(resource, webhookEvent) {
    const orderId = resource.id;
    logger_1.default.info('Processing CHECKOUT.ORDER.APPROVED:', { orderId });
    // Order is approved, can be captured
    // Note: For auto-capture, this may be followed by PAYMENT.CAPTURE.COMPLETED
}
/**
 * Handle order completed
 */
async function handleOrderCompleted(resource, webhookEvent) {
    const orderId = resource.id;
    const purchaseUnits = resource.purchase_units || [];
    logger_1.default.info('Processing CHECKOUT.ORDER.COMPLETED:', { orderId });
    for (const unit of purchaseUnits) {
        const reference = unit.reference_id;
        const captures = unit.payments?.captures || [];
        for (const capture of captures) {
            if (capture.status === 'COMPLETED') {
                // Find and update payment log
                const paymentLog = await payment_log_model_1.PaymentLog.findOne({
                    where: { transaction_id: reference }
                });
                if (paymentLog) {
                    paymentLog.status = payment_log_model_1.PaymentStatus.COMPLETE;
                    paymentLog.paypal_payment_id = capture.id;
                    paymentLog.paypal_order_id = orderId;
                    paymentLog.webhook_data = webhookEvent;
                    paymentLog.processed_at = new Date();
                    if (capture.amount?.value) {
                        const amount = parseFloat(capture.amount.value);
                        const estimatedFee = amount * 0.0349 + 0.49;
                        paymentLog.amount_gross = amount;
                        paymentLog.amount_fee = estimatedFee;
                        paymentLog.amount_net = amount - estimatedFee;
                    }
                    await paymentLog.save();
                    // Activate subscription
                    const customData = paymentLog.custom_data;
                    if (customData?.user_id && customData?.plan_id) {
                        await activateSubscription(customData.user_id, customData.plan_id, paymentLog);
                    }
                }
            }
        }
    }
}
/**
 * Handle subscription activated
 */
async function handleSubscriptionActivated(resource) {
    const subscriptionId = resource.id;
    const customId = resource.custom_id;
    // Find subscription by PayPal subscription ID or custom reference
    const subscription = await subscription_model_1.Subscription.findOne({
        where: { paypal_subscription_id: subscriptionId }
    });
    if (!subscription) {
        // Try finding by payment log
        const paymentLog = await payment_log_model_1.PaymentLog.findOne({
            where: { transaction_id: customId }
        });
        if (paymentLog?.subscription_id) {
            const sub = await subscription_model_1.Subscription.findByPk(paymentLog.subscription_id);
            if (sub) {
                sub.paypal_subscription_id = subscriptionId;
                sub.status = subscription_model_1.SubscriptionStatus.ACTIVE;
                sub.billing_date = new Date();
                const nextBilling = new Date();
                nextBilling.setMonth(nextBilling.getMonth() + 1);
                sub.next_billing_date = nextBilling;
                await sub.save();
                // Update user
                const customData = paymentLog.custom_data;
                if (customData?.user_id && customData?.plan_id) {
                    await activateSubscription(customData.user_id, customData.plan_id, paymentLog);
                }
            }
        }
        return;
    }
    subscription.status = subscription_model_1.SubscriptionStatus.ACTIVE;
    subscription.billing_date = new Date();
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    subscription.next_billing_date = nextBilling;
    await subscription.save();
    logger_1.default.info('PayPal subscription activated:', { subscriptionId });
}
/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(resource) {
    const subscriptionId = resource.id;
    const subscription = await subscription_model_1.Subscription.findOne({
        where: { paypal_subscription_id: subscriptionId }
    });
    if (!subscription) {
        logger_1.default.warn('Subscription not found for PayPal cancellation:', { subscriptionId });
        return;
    }
    subscription.status = subscription_model_1.SubscriptionStatus.CANCELED;
    subscription.canceled_at = new Date();
    subscription.ended_at = subscription.next_billing_date || new Date();
    await subscription.save();
    // Update user status
    const user = await User_1.User.findByPk(subscription.user_id);
    if (user) {
        user.subscription_status = User_1.SubscriptionStatus.CANCELED;
        await user.save();
    }
    logger_1.default.info('PayPal subscription cancelled:', { subscriptionId });
}
/**
 * Handle subscription suspended
 */
async function handleSubscriptionSuspended(resource) {
    const subscriptionId = resource.id;
    const subscription = await subscription_model_1.Subscription.findOne({
        where: { paypal_subscription_id: subscriptionId }
    });
    if (!subscription) {
        return;
    }
    subscription.status = subscription_model_1.SubscriptionStatus.PAST_DUE;
    await subscription.save();
    logger_1.default.info('PayPal subscription suspended:', { subscriptionId });
}
/**
 * Handle payment failed
 */
async function handlePaymentFailed(resource) {
    const subscriptionId = resource.id;
    const subscription = await subscription_model_1.Subscription.findOne({
        where: { paypal_subscription_id: subscriptionId }
    });
    if (!subscription) {
        return;
    }
    subscription.status = subscription_model_1.SubscriptionStatus.PAST_DUE;
    await subscription.save();
    // Create failed payment log
    await payment_log_model_1.PaymentLog.create({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        transaction_id: (0, uuid_1.v4)(),
        payment_provider: 'paypal',
        payment_type: payment_log_model_1.PaymentType.SUBSCRIPTION_PAYMENT,
        status: payment_log_model_1.PaymentStatus.FAILED,
        amount_gross: subscription.amount,
        amount_fee: 0,
        amount_net: 0,
        currency: 'USD',
        plan: subscription.plan,
        name_first: 'Unknown',
        email_address: 'unknown',
        item_name: `PDFLab ${subscription.plan} Plan`,
        error_message: 'PayPal payment failed',
        webhook_data: resource
    });
    logger_1.default.info('PayPal subscription payment failed:', { subscriptionId });
}
/**
 * Handle payment refunded
 */
async function handlePaymentRefunded(resource) {
    const captureId = resource.id;
    const paymentLog = await payment_log_model_1.PaymentLog.findOne({
        where: { paypal_payment_id: captureId }
    });
    if (paymentLog) {
        paymentLog.status = payment_log_model_1.PaymentStatus.CANCELLED;
        paymentLog.webhook_data = resource;
        await paymentLog.save();
    }
    logger_1.default.info('PayPal payment refunded:', { captureId });
}
/**
 * Activate subscription and update user plan
 */
async function activateSubscription(userId, planId, paymentLog) {
    const user = await User_1.User.findByPk(userId);
    if (!user) {
        logger_1.default.error('User not found for subscription activation:', { userId });
        return;
    }
    const subscription = await subscription_model_1.Subscription.findByPk(paymentLog.subscription_id);
    if (subscription) {
        subscription.status = subscription_model_1.SubscriptionStatus.ACTIVE;
        subscription.billing_date = new Date();
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        subscription.next_billing_date = nextBilling;
        await subscription.save();
    }
    // Update user
    user.subscription_id = paymentLog.paypal_payment_id || paymentLog.transaction_id;
    user.subscription_status = User_1.SubscriptionStatus.ACTIVE;
    await (0, quota_utils_1.updateUserPlan)(user, planId, true);
    logger_1.default.info(`PayPal payment successful for user ${user.email} - Plan: ${planId}`);
    // Send payment receipt email
    if (subscription) {
        const planName = PRICING_PLANS[planId]?.name || planId;
        email_service_1.default.sendPaymentReceiptEmail(user.email, {
            plan: planName,
            amount: paymentLog.amount_gross.toString(),
            currency: 'USD',
            transactionId: paymentLog.transaction_id,
            billingDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            nextBillingDate: subscription.next_billing_date?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'
        }).catch((error) => {
            logger_1.default.error('Failed to send payment receipt email:', { error: error instanceof Error ? error.message : String(error) });
        });
    }
}
/**
 * GET /api/paypal/return
 * Handle successful payment return
 */
const handleReturn = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        const queryString = req.url.split('?')[1] || '';
        res.redirect(`${frontendUrl}/payment/success?${queryString}`);
    }
    catch (error) {
        logger_1.default.error('PayPal return handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process return' });
    }
};
exports.handleReturn = handleReturn;
/**
 * GET /api/paypal/cancel
 * Handle cancelled payment
 */
const handleCancel = async (req, res) => {
    try {
        const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000';
        const queryString = req.url.split('?')[1] || '';
        res.redirect(`${frontendUrl}/payment/cancel?${queryString}`);
    }
    catch (error) {
        logger_1.default.error('PayPal cancel handler error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to process cancellation' });
    }
};
exports.handleCancel = handleCancel;
/**
 * GET /api/paypal/subscription/:id
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
        // Optionally fetch fresh data from PayPal
        if (subscription.paypal_subscription_id) {
            try {
                const paypalSub = await paypal_service_1.default.getSubscription(subscription.paypal_subscription_id);
                // Could update local record with PayPal data if needed
            }
            catch (err) {
                // Ignore PayPal API errors, return local data
            }
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
 * POST /api/paypal/cancel-subscription
 * Cancel active subscription
 */
const cancelSubscription = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
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
        // Cancel with PayPal if we have a subscription ID
        if (subscription.paypal_subscription_id) {
            const result = await paypal_service_1.default.cancelSubscription(subscription.paypal_subscription_id);
            if (!result.success) {
                logger_1.default.warn('PayPal cancellation failed:', { message: result.message });
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
        // Send cancellation email
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
 * GET /api/paypal/config
 * Get PayPal configuration status
 */
const getConfig = async (_req, res) => {
    try {
        const config = paypal_service_1.default.getConfig();
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
 * GET /api/paypal/validate
 * Test API connection
 */
const validateConnection = async (_req, res) => {
    try {
        const result = await paypal_service_1.default.validateConnection();
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
/**
 * POST /api/paypal/refund
 * Process a refund
 */
const processRefund = async (req, res) => {
    try {
        const { captureId, amount } = req.body;
        if (!captureId) {
            res.status(400).json({ error: 'Capture ID is required' });
            return;
        }
        const result = await paypal_service_1.default.refundPayment(captureId, amount, 'USD');
        if (result.success) {
            // Update payment log
            await payment_log_model_1.PaymentLog.update({
                status: payment_log_model_1.PaymentStatus.CANCELLED,
                payment_type: payment_log_model_1.PaymentType.REFUND
            }, { where: { paypal_payment_id: captureId } });
            res.json({
                success: true,
                message: 'Refund processed successfully',
                refundId: result.refundId
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
 * GET /api/paypal/payment/:reference
 * Lookup payment status
 */
const lookupPayment = async (req, res) => {
    try {
        const { reference } = req.params;
        // Check database first
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
        res.status(404).json({ error: 'Payment not found' });
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
//# sourceMappingURL=paypal.controller.js.map