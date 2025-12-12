"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayGeniusTransactionStatus = exports.PAYGENIUS_RESPONSE_CODES = void 0;
exports.generateSignature = generateSignature;
exports.createRedirectPayment = createRedirectPayment;
exports.lookupPayment = lookupPayment;
exports.getTransaction = getTransaction;
exports.refundPaymentFull = refundPaymentFull;
exports.refundPaymentPartial = refundPaymentPartial;
exports.cancelSubscription = cancelSubscription;
exports.editSubscription = editSubscription;
exports.registerCard = registerCard;
exports.validateWebhookSignature = validateWebhookSignature;
exports.validateConnection = validateConnection;
exports.isConfigured = isConfigured;
exports.getConfig = getConfig;
exports.getDefaultUrls = getDefaultUrls;
exports.dollarsToCents = dollarsToCents;
exports.centsToDollars = centsToDollars;
exports.mapPayGeniusStatus = mapPayGeniusStatus;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * PayGenius Payment Gateway Service
 * Handles payment initialization, signature generation, and webhook verification
 *
 * API Reference: https://developer.paygenius.co.za/docs/reference.html
 */
// PayGenius configuration from environment
const PAYGENIUS_CONFIG = {
    apiToken: process.env.PAYGENIUS_API_TOKEN || '',
    apiKey: process.env.PAYGENIUS_API_KEY || '',
    mode: process.env.PAYGENIUS_MODE || 'sandbox',
    baseUrl: process.env.PAYGENIUS_MODE === 'production'
        ? 'https://www.paygenius.co.za'
        : 'https://developer.paygenius.co.za',
    successUrl: process.env.PAYGENIUS_SUCCESS_URL || '',
    cancelUrl: process.env.PAYGENIUS_CANCEL_URL || '',
    errorUrl: process.env.PAYGENIUS_ERROR_URL || '',
    notifyUrl: process.env.PAYGENIUS_WEBHOOK_URL || ''
};
// Response codes from PayGenius
exports.PAYGENIUS_RESPONSE_CODES = {
    APPROVED: 1,
    PENDING_3DS: 2,
    ERROR: 3,
    FAILURE: -1,
    PENDING_REFUND: 7,
    PAGE_NOT_CONFIGURED: 19
};
// Transaction statuses from PayGenius
var PayGeniusTransactionStatus;
(function (PayGeniusTransactionStatus) {
    PayGeniusTransactionStatus["AUTHORIZED"] = "AUTHORIZED";
    PayGeniusTransactionStatus["SETTLED"] = "SETTLED";
    PayGeniusTransactionStatus["CANCELLED"] = "CANCELLED";
    PayGeniusTransactionStatus["REFUNDED"] = "REFUNDED";
    PayGeniusTransactionStatus["THREE_D_SECURE"] = "THREE_D_SECURE";
    PayGeniusTransactionStatus["FAILED"] = "FAILED";
    PayGeniusTransactionStatus["REVERSED"] = "REVERSED";
    PayGeniusTransactionStatus["NEW"] = "NEW";
})(PayGeniusTransactionStatus || (exports.PayGeniusTransactionStatus = PayGeniusTransactionStatus = {}));
/**
 * Generate HMAC-SHA256 signature for PayGenius API requests
 *
 * For GET requests: Sign the full request URI
 * For POST requests: Sign `{full_uri}\n{json_body}`
 */
function generateSignature(method, fullUri, body) {
    let dataToSign;
    if (method === 'GET') {
        dataToSign = fullUri.trim();
    }
    else {
        // For POST: concatenate URI + newline + JSON body (no extra whitespace)
        const jsonBody = body ? JSON.stringify(body) : '';
        dataToSign = `${fullUri.trim()}\n${jsonBody}`;
    }
    // Generate HMAC-SHA256 using the API key as secret
    const hmac = crypto_1.default.createHmac('sha256', PAYGENIUS_CONFIG.apiKey);
    hmac.update(dataToSign);
    // Return hex-encoded signature (64 characters)
    return hmac.digest('hex');
}
/**
 * Make authenticated API request to PayGenius
 */
async function makeApiRequest(method, endpoint, body) {
    const fullUrl = `${PAYGENIUS_CONFIG.baseUrl}${endpoint}`;
    const signature = generateSignature(method, fullUrl, body);
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Token': PAYGENIUS_CONFIG.apiToken,
        'X-Signature': signature
    };
    const options = {
        method,
        headers
    };
    if (method === 'POST' && body) {
        options.body = JSON.stringify(body);
    }
    logger_1.default.debug('PayGenius API request:', {
        method,
        endpoint,
        body: body ? JSON.stringify(body) : undefined
    });
    const response = await fetch(fullUrl, options);
    const data = await response.json();
    logger_1.default.debug('PayGenius API response:', {
        status: response.status,
        data
    });
    if (!response.ok) {
        throw new Error(`PayGenius API error: ${response.status} - ${JSON.stringify(data)}`);
    }
    return data;
}
/**
 * Create a redirect payment (hosted payment page)
 * This is the primary payment method - redirects user to PayGenius for payment
 */
async function createRedirectPayment(params) {
    const endpoint = '/pg/api/v2/redirect/create';
    const requestBody = {
        transaction: {
            reference: params.transaction.reference,
            currency: params.transaction.currency,
            amount: params.transaction.amount // Amount in cents
        },
        consumer: {
            name: params.consumer.name,
            surname: params.consumer.surname,
            email: params.consumer.email
        },
        urls: {
            success: params.urls.success,
            cancel: params.urls.cancel,
            error: params.urls.error,
            notify: params.urls.notify
        }
    };
    // Add subscription data if provided (for recurring payments)
    if (params.subscription) {
        requestBody.subscription = {
            reference: params.subscription.reference,
            interval: params.subscription.interval,
            firstname: params.subscription.firstname,
            lastname: params.subscription.lastname,
            email: params.subscription.email
        };
        if (params.subscription.trialDays) {
            requestBody.subscription.trialDays = params.subscription.trialDays;
        }
    }
    const response = await makeApiRequest('POST', endpoint, requestBody);
    if (response.code !== exports.PAYGENIUS_RESPONSE_CODES.APPROVED || !response.redirectUrl) {
        throw new Error(`Failed to create payment: ${response.message || 'Unknown error'}`);
    }
    return {
        redirectUrl: response.redirectUrl,
        reference: response.reference || params.transaction.reference
    };
}
/**
 * Lookup payment status by reference
 */
async function lookupPayment(reference) {
    const endpoint = `/pg/api/v2/redirect/${reference}`;
    const response = await makeApiRequest('GET', endpoint);
    if (!response.transaction) {
        throw new Error(`Payment not found: ${reference}`);
    }
    return {
        reference: response.transaction.reference,
        amount: response.transaction.amount,
        currency: response.transaction.currency,
        status: response.transaction.status,
        pending: response.transaction.pending
    };
}
/**
 * Get transaction details by reference
 */
async function getTransaction(reference) {
    const endpoint = `/pg/api/v2/payment/${reference}`;
    const response = await makeApiRequest('GET', endpoint);
    if (!response.transaction) {
        throw new Error(`Transaction not found: ${reference}`);
    }
    return {
        reference: response.transaction.reference,
        amount: response.transaction.amount,
        currency: response.transaction.currency,
        status: response.transaction.status,
        pending: response.transaction.pending
    };
}
/**
 * Process a full refund
 */
async function refundPaymentFull(reference) {
    const endpoint = `/pg/api/v2/payment/${reference}/refund`;
    const response = await makeApiRequest('GET', endpoint);
    return {
        success: response.code === exports.PAYGENIUS_RESPONSE_CODES.APPROVED,
        code: response.code,
        message: response.message,
        pending: response.code === exports.PAYGENIUS_RESPONSE_CODES.PENDING_REFUND
    };
}
/**
 * Process a partial refund
 */
async function refundPaymentPartial(reference, amount) {
    const endpoint = `/pg/api/v2/payment/${reference}/refund`;
    const response = await makeApiRequest('POST', endpoint, { amount });
    return {
        success: response.code === exports.PAYGENIUS_RESPONSE_CODES.APPROVED,
        code: response.code,
        message: response.message,
        pending: response.code === exports.PAYGENIUS_RESPONSE_CODES.PENDING_REFUND
    };
}
/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionReference) {
    const endpoint = '/pg/api/v2/subscription/cancel';
    try {
        const response = await makeApiRequest('POST', endpoint, {
            reference: subscriptionReference
        });
        return {
            success: response.code === exports.PAYGENIUS_RESPONSE_CODES.APPROVED,
            message: response.message || 'Subscription cancelled successfully'
        };
    }
    catch (error) {
        logger_1.default.error('PayGenius subscription cancellation error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to cancel subscription'
        };
    }
}
/**
 * Edit/update a subscription (e.g., link new card)
 */
async function editSubscription(subscriptionReference, cardToken) {
    const endpoint = '/pg/api/v2/subscription/edit';
    const body = {
        reference: subscriptionReference
    };
    if (cardToken) {
        body.creditCard = { token: cardToken };
    }
    try {
        const response = await makeApiRequest('POST', endpoint, body);
        return {
            success: response.code === exports.PAYGENIUS_RESPONSE_CODES.APPROVED,
            message: response.message || 'Subscription updated successfully'
        };
    }
    catch (error) {
        logger_1.default.error('PayGenius subscription edit error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update subscription'
        };
    }
}
/**
 * Register a card for future use (card vaulting)
 */
async function registerCard(cardData) {
    const endpoint = '/pg/api/v2/card/register';
    try {
        const response = await makeApiRequest('POST', endpoint, {
            creditCard: {
                number: cardData.number,
                cardHolder: cardData.cardHolder,
                expiryYear: cardData.expiryYear,
                expiryMonth: cardData.expiryMonth,
                cvv: cardData.cvv,
                type: cardData.type
            }
        });
        return {
            success: response.code === exports.PAYGENIUS_RESPONSE_CODES.APPROVED,
            token: response.token,
            message: response.message
        };
    }
    catch (error) {
        logger_1.default.error('PayGenius card registration error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to register card'
        };
    }
}
/**
 * Validate webhook request signature
 * PayGenius sends webhook notifications to the notify URL
 */
function validateWebhookSignature(requestUri, body, receivedSignature) {
    // Webhook is a POST, so sign URI + newline + body
    const dataToSign = `${requestUri.trim()}\n${body}`;
    const hmac = crypto_1.default.createHmac('sha256', PAYGENIUS_CONFIG.apiKey);
    hmac.update(dataToSign);
    const calculatedSignature = hmac.digest('hex');
    return calculatedSignature === receivedSignature;
}
/**
 * Test API connection and signature generation
 */
async function validateConnection() {
    const endpoint = '/pg/api/v2/util/validate';
    try {
        await makeApiRequest('GET', endpoint);
        return {
            success: true,
            message: 'API connection validated successfully'
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
 * Check if PayGenius is properly configured
 */
function isConfigured() {
    return !!(PAYGENIUS_CONFIG.apiToken && PAYGENIUS_CONFIG.apiKey);
}
/**
 * Get PayGenius configuration (without sensitive data)
 */
function getConfig() {
    return {
        mode: PAYGENIUS_CONFIG.mode,
        baseUrl: PAYGENIUS_CONFIG.baseUrl,
        configured: isConfigured(),
        successUrl: PAYGENIUS_CONFIG.successUrl,
        cancelUrl: PAYGENIUS_CONFIG.cancelUrl,
        errorUrl: PAYGENIUS_CONFIG.errorUrl,
        notifyUrl: PAYGENIUS_CONFIG.notifyUrl
    };
}
/**
 * Get default URLs from configuration
 */
function getDefaultUrls() {
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const apiUrl = process.env['API_URL'] || 'http://localhost:3006';
    return {
        success: PAYGENIUS_CONFIG.successUrl || `${frontendUrl}/payment/success`,
        cancel: PAYGENIUS_CONFIG.cancelUrl || `${frontendUrl}/payment/cancel`,
        error: PAYGENIUS_CONFIG.errorUrl || `${frontendUrl}/payment/error`,
        notify: PAYGENIUS_CONFIG.notifyUrl || `${apiUrl}/api/paygenius/webhook`
    };
}
/**
 * Convert dollars to cents (PayGenius uses cents)
 */
function dollarsToCents(dollars) {
    return Math.round(dollars * 100);
}
/**
 * Convert cents to dollars
 */
function centsToDollars(cents) {
    return cents / 100;
}
/**
 * Map PayGenius status to our internal status
 */
function mapPayGeniusStatus(pgStatus) {
    switch (pgStatus) {
        case PayGeniusTransactionStatus.SETTLED:
            return 'complete';
        case PayGeniusTransactionStatus.AUTHORIZED:
            return 'pending'; // Authorized but not yet settled
        case PayGeniusTransactionStatus.CANCELLED:
            return 'cancelled';
        case PayGeniusTransactionStatus.FAILED:
            return 'failed';
        case PayGeniusTransactionStatus.REFUNDED:
            return 'complete'; // Refund completed
        case PayGeniusTransactionStatus.REVERSED:
            return 'cancelled';
        case PayGeniusTransactionStatus.THREE_D_SECURE:
            return 'pending';
        case PayGeniusTransactionStatus.NEW:
            return 'pending';
        default:
            return 'pending';
    }
}
exports.default = {
    generateSignature,
    createRedirectPayment,
    lookupPayment,
    getTransaction,
    refundPaymentFull,
    refundPaymentPartial,
    cancelSubscription,
    editSubscription,
    registerCard,
    validateWebhookSignature,
    validateConnection,
    isConfigured,
    getConfig,
    getDefaultUrls,
    dollarsToCents,
    centsToDollars,
    mapPayGeniusStatus,
    PAYGENIUS_RESPONSE_CODES: exports.PAYGENIUS_RESPONSE_CODES,
    PayGeniusTransactionStatus
};
//# sourceMappingURL=paygenius.service.js.map