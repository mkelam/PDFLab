"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPalWebhookEvent = exports.PayPalSubscriptionStatus = exports.PayPalOrderStatus = void 0;
exports.createOrder = createOrder;
exports.captureOrder = captureOrder;
exports.getOrder = getOrder;
exports.createBillingPlan = createBillingPlan;
exports.createSubscription = createSubscription;
exports.getSubscription = getSubscription;
exports.cancelSubscription = cancelSubscription;
exports.suspendSubscription = suspendSubscription;
exports.activateSubscription = activateSubscription;
exports.refundPayment = refundPayment;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.isConfigured = isConfigured;
exports.getConfig = getConfig;
exports.getDefaultUrls = getDefaultUrls;
exports.validateConnection = validateConnection;
exports.mapPayPalSubscriptionStatus = mapPayPalSubscriptionStatus;
exports.mapPayPalOrderStatus = mapPayPalOrderStatus;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * PayPal Payment Gateway Service
 * Handles payment initialization, webhook verification, and subscription management
 *
 * API Reference: https://developer.paypal.com/docs/api/overview/
 */
// PayPal configuration from environment
const PAYPAL_CONFIG = {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: process.env.PAYPAL_MODE || 'sandbox',
    baseUrl: process.env.PAYPAL_MODE === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    successUrl: process.env.PAYPAL_SUCCESS_URL || '',
    cancelUrl: process.env.PAYPAL_CANCEL_URL || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
};
// PayPal order statuses
var PayPalOrderStatus;
(function (PayPalOrderStatus) {
    PayPalOrderStatus["CREATED"] = "CREATED";
    PayPalOrderStatus["SAVED"] = "SAVED";
    PayPalOrderStatus["APPROVED"] = "APPROVED";
    PayPalOrderStatus["VOIDED"] = "VOIDED";
    PayPalOrderStatus["COMPLETED"] = "COMPLETED";
    PayPalOrderStatus["PAYER_ACTION_REQUIRED"] = "PAYER_ACTION_REQUIRED";
})(PayPalOrderStatus || (exports.PayPalOrderStatus = PayPalOrderStatus = {}));
// PayPal subscription statuses
var PayPalSubscriptionStatus;
(function (PayPalSubscriptionStatus) {
    PayPalSubscriptionStatus["APPROVAL_PENDING"] = "APPROVAL_PENDING";
    PayPalSubscriptionStatus["APPROVED"] = "APPROVED";
    PayPalSubscriptionStatus["ACTIVE"] = "ACTIVE";
    PayPalSubscriptionStatus["SUSPENDED"] = "SUSPENDED";
    PayPalSubscriptionStatus["CANCELLED"] = "CANCELLED";
    PayPalSubscriptionStatus["EXPIRED"] = "EXPIRED";
})(PayPalSubscriptionStatus || (exports.PayPalSubscriptionStatus = PayPalSubscriptionStatus = {}));
// PayPal webhook event types
var PayPalWebhookEvent;
(function (PayPalWebhookEvent) {
    // Payment events
    PayPalWebhookEvent["PAYMENT_CAPTURE_COMPLETED"] = "PAYMENT.CAPTURE.COMPLETED";
    PayPalWebhookEvent["PAYMENT_CAPTURE_DENIED"] = "PAYMENT.CAPTURE.DENIED";
    PayPalWebhookEvent["PAYMENT_CAPTURE_REFUNDED"] = "PAYMENT.CAPTURE.REFUNDED";
    PayPalWebhookEvent["PAYMENT_CAPTURE_REVERSED"] = "PAYMENT.CAPTURE.REVERSED";
    PayPalWebhookEvent["PAYMENT_CAPTURE_PENDING"] = "PAYMENT.CAPTURE.PENDING";
    // Subscription events
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_CREATED"] = "BILLING.SUBSCRIPTION.CREATED";
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_ACTIVATED"] = "BILLING.SUBSCRIPTION.ACTIVATED";
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_UPDATED"] = "BILLING.SUBSCRIPTION.UPDATED";
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_CANCELLED"] = "BILLING.SUBSCRIPTION.CANCELLED";
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_SUSPENDED"] = "BILLING.SUBSCRIPTION.SUSPENDED";
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_EXPIRED"] = "BILLING.SUBSCRIPTION.EXPIRED";
    PayPalWebhookEvent["BILLING_SUBSCRIPTION_PAYMENT_FAILED"] = "BILLING.SUBSCRIPTION.PAYMENT.FAILED";
    // Order events
    PayPalWebhookEvent["CHECKOUT_ORDER_APPROVED"] = "CHECKOUT.ORDER.APPROVED";
    PayPalWebhookEvent["CHECKOUT_ORDER_COMPLETED"] = "CHECKOUT.ORDER.COMPLETED";
})(PayPalWebhookEvent || (exports.PayPalWebhookEvent = PayPalWebhookEvent = {}));
// Cache access token to avoid repeated auth calls
let cachedToken = null;
/**
 * Get PayPal OAuth access token
 */
async function getAccessToken() {
    // Return cached token if still valid
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.access_token;
    }
    const auth = Buffer.from(`${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`).toString('base64');
    const response = await fetch(`${PAYPAL_CONFIG.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal auth failed: ${error}`);
    }
    const data = await response.json();
    // Cache token with 5-minute buffer before expiry
    cachedToken = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000
    };
    return cachedToken.access_token;
}
/**
 * Make authenticated API request to PayPal
 */
async function makeApiRequest(method, endpoint, body) {
    const accessToken = await getAccessToken();
    const fullUrl = `${PAYPAL_CONFIG.baseUrl}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
    // PayPal requires this header for some endpoints
    if (method === 'POST') {
        headers['PayPal-Request-Id'] = crypto_1.default.randomUUID();
    }
    const options = {
        method,
        headers
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    logger_1.default.debug('PayPal API request:', {
        method,
        endpoint,
        body: body ? JSON.stringify(body) : undefined
    });
    const response = await fetch(fullUrl, options);
    const data = await response.json();
    logger_1.default.debug('PayPal API response:', {
        status: response.status,
        data
    });
    if (!response.ok) {
        throw new Error(`PayPal API error: ${response.status} - ${JSON.stringify(data)}`);
    }
    return data;
}
/**
 * Create a PayPal order for one-time payment
 */
async function createOrder(params) {
    const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [{
                reference_id: params.reference,
                description: params.description,
                amount: {
                    currency_code: params.currency,
                    value: params.amount.toFixed(2)
                }
            }],
        application_context: {
            brand_name: 'PDFLab',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl
        }
    };
    const response = await makeApiRequest('POST', '/v2/checkout/orders', orderPayload);
    // Find approval URL
    const approveLink = response.links?.find((link) => link.rel === 'approve');
    if (!approveLink) {
        throw new Error('No approval URL returned from PayPal');
    }
    return {
        id: response.id,
        status: response.status,
        approveUrl: approveLink.href
    };
}
/**
 * Capture a PayPal order after approval
 */
async function captureOrder(orderId) {
    const response = await makeApiRequest('POST', `/v2/checkout/orders/${orderId}/capture`, {});
    const capture = response.purchase_units?.[0]?.payments?.captures?.[0];
    return {
        id: response.id,
        status: response.status,
        captureId: capture?.id,
        amount: capture?.amount ? parseFloat(capture.amount.value) : undefined,
        currency: capture?.amount?.currency_code
    };
}
/**
 * Get order details
 */
async function getOrder(orderId) {
    return makeApiRequest('GET', `/v2/checkout/orders/${orderId}`);
}
/**
 * Create a billing plan for subscriptions
 * Call this once during setup to create plans
 */
async function createBillingPlan(params) {
    const planPayload = {
        product_id: params.productId,
        name: params.name,
        description: params.description,
        status: 'ACTIVE',
        billing_cycles: [{
                frequency: {
                    interval_unit: params.interval,
                    interval_count: 1
                },
                tenure_type: 'REGULAR',
                sequence: 1,
                total_cycles: 0, // Unlimited
                pricing_scheme: {
                    fixed_price: {
                        value: params.amount.toFixed(2),
                        currency_code: params.currency
                    }
                }
            }],
        payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3
        }
    };
    const response = await makeApiRequest('POST', '/v1/billing/plans', planPayload);
    return { planId: response.id };
}
/**
 * Create a subscription for recurring payments
 */
async function createSubscription(params) {
    const subscriptionPayload = {
        plan_id: params.planId,
        custom_id: params.reference,
        subscriber: {
            name: {
                given_name: params.firstName,
                surname: params.lastName
            },
            email_address: params.email
        },
        application_context: {
            brand_name: 'PDFLab',
            locale: 'en-US',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            payment_method: {
                payer_selected: 'PAYPAL',
                payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
            },
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl
        }
    };
    const response = await makeApiRequest('POST', '/v1/billing/subscriptions', subscriptionPayload);
    // Find approval URL
    const approveLink = response.links?.find((link) => link.rel === 'approve');
    if (!approveLink) {
        throw new Error('No approval URL returned from PayPal');
    }
    return {
        id: response.id,
        status: response.status,
        approveUrl: approveLink.href
    };
}
/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
    return makeApiRequest('GET', `/v1/billing/subscriptions/${subscriptionId}`);
}
/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
    try {
        await makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
            reason
        });
        return {
            success: true,
            message: 'Subscription cancelled successfully'
        };
    }
    catch (error) {
        logger_1.default.error('PayPal subscription cancellation error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to cancel subscription'
        };
    }
}
/**
 * Suspend a subscription (pause billing)
 */
async function suspendSubscription(subscriptionId, reason = 'User requested pause') {
    try {
        await makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/suspend`, {
            reason
        });
        return {
            success: true,
            message: 'Subscription suspended successfully'
        };
    }
    catch (error) {
        logger_1.default.error('PayPal subscription suspension error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to suspend subscription'
        };
    }
}
/**
 * Activate/resume a suspended subscription
 */
async function activateSubscription(subscriptionId, reason = 'User resumed subscription') {
    try {
        await makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/activate`, {
            reason
        });
        return {
            success: true,
            message: 'Subscription activated successfully'
        };
    }
    catch (error) {
        logger_1.default.error('PayPal subscription activation error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to activate subscription'
        };
    }
}
/**
 * Refund a captured payment
 */
async function refundPayment(captureId, amount, currency) {
    try {
        const refundPayload = {};
        // Partial refund if amount specified
        if (amount && currency) {
            refundPayload.amount = {
                value: amount.toFixed(2),
                currency_code: currency
            };
        }
        const response = await makeApiRequest('POST', `/v2/payments/captures/${captureId}/refund`, Object.keys(refundPayload).length > 0 ? refundPayload : undefined);
        return {
            success: response.status === 'COMPLETED',
            refundId: response.id,
            message: response.status === 'COMPLETED' ? 'Refund processed successfully' : `Refund status: ${response.status}`
        };
    }
    catch (error) {
        logger_1.default.error('PayPal refund error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to process refund'
        };
    }
}
/**
 * Verify webhook signature
 * PayPal uses a complex verification process
 */
async function verifyWebhookSignature(headers, body) {
    if (!PAYPAL_CONFIG.webhookId) {
        logger_1.default.warn('PayPal webhook ID not configured - skipping signature verification');
        return true;
    }
    try {
        const verificationPayload = {
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: PAYPAL_CONFIG.webhookId,
            webhook_event: JSON.parse(body)
        };
        const response = await makeApiRequest('POST', '/v1/notifications/verify-webhook-signature', verificationPayload);
        return response.verification_status === 'SUCCESS';
    }
    catch (error) {
        logger_1.default.error('PayPal webhook verification error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}
/**
 * Check if PayPal is properly configured
 */
function isConfigured() {
    return !!(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret);
}
/**
 * Get PayPal configuration (without sensitive data)
 */
function getConfig() {
    return {
        mode: PAYPAL_CONFIG.mode,
        baseUrl: PAYPAL_CONFIG.baseUrl,
        configured: isConfigured(),
        successUrl: PAYPAL_CONFIG.successUrl,
        cancelUrl: PAYPAL_CONFIG.cancelUrl
    };
}
/**
 * Get default redirect URLs
 */
function getDefaultUrls() {
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const apiUrl = process.env['API_URL'] || 'http://localhost:3006';
    return {
        success: PAYPAL_CONFIG.successUrl || `${frontendUrl}/payment/success`,
        cancel: PAYPAL_CONFIG.cancelUrl || `${frontendUrl}/payment/cancel`,
        webhook: `${apiUrl}/api/paypal/webhook`
    };
}
/**
 * Test API connection
 */
async function validateConnection() {
    try {
        await getAccessToken();
        return {
            success: true,
            message: 'PayPal API connection validated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to validate API connection'
        };
    }
}
/**
 * Map PayPal subscription status to internal status
 */
function mapPayPalSubscriptionStatus(status) {
    switch (status) {
        case PayPalSubscriptionStatus.ACTIVE:
            return 'active';
        case PayPalSubscriptionStatus.CANCELLED:
        case PayPalSubscriptionStatus.EXPIRED:
            return 'canceled';
        case PayPalSubscriptionStatus.SUSPENDED:
            return 'past_due';
        case PayPalSubscriptionStatus.APPROVAL_PENDING:
        case PayPalSubscriptionStatus.APPROVED:
        default:
            return 'pending';
    }
}
/**
 * Map PayPal order status to internal payment status
 */
function mapPayPalOrderStatus(status) {
    switch (status) {
        case PayPalOrderStatus.COMPLETED:
            return 'complete';
        case PayPalOrderStatus.VOIDED:
            return 'cancelled';
        case PayPalOrderStatus.CREATED:
        case PayPalOrderStatus.SAVED:
        case PayPalOrderStatus.APPROVED:
        case PayPalOrderStatus.PAYER_ACTION_REQUIRED:
        default:
            return 'pending';
    }
}
exports.default = {
    createOrder,
    captureOrder,
    getOrder,
    createBillingPlan,
    createSubscription,
    getSubscription,
    cancelSubscription,
    suspendSubscription,
    activateSubscription,
    refundPayment,
    verifyWebhookSignature,
    isConfigured,
    getConfig,
    getDefaultUrls,
    validateConnection,
    mapPayPalSubscriptionStatus,
    mapPayPalOrderStatus,
    PayPalOrderStatus,
    PayPalSubscriptionStatus,
    PayPalWebhookEvent
};
//# sourceMappingURL=paypal.service.js.map