"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignature = generateSignature;
exports.createPaymentData = createPaymentData;
exports.createSubscriptionPaymentData = createSubscriptionPaymentData;
exports.validateSignature = validateSignature;
exports.verifyPaymentWithPayFast = verifyPaymentWithPayFast;
exports.validatePayFastHost = validatePayFastHost;
exports.validateAmount = validateAmount;
exports.getPayFastUrl = getPayFastUrl;
exports.isConfigured = isConfigured;
exports.getConfig = getConfig;
exports.cancelSubscription = cancelSubscription;
exports.pauseSubscription = pauseSubscription;
const crypto_1 = __importDefault(require("crypto"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * PayFast Payment Gateway Service
 * Handles payment initialization, signature generation, and ITN verification
 */
// PayFast configuration from environment
const PAYFAST_CONFIG = {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    mode: process.env.PAYFAST_MODE || 'sandbox',
    apiUrl: process.env.PAYFAST_MODE === 'production'
        ? 'https://www.payfast.co.za'
        : 'https://sandbox.payfast.co.za'
};
// PayFast valid IP addresses for ITN validation
const PAYFAST_HOSTS = [
    'www.payfast.co.za',
    'sandbox.payfast.co.za',
    'w1w.payfast.co.za',
    'w2w.payfast.co.za'
];
/**
 * PayFast parameter order - MUST be in this exact order per PayFast API spec
 * Reference: https://developers.payfast.co.za/docs#signature_generation
 */
const PAYFAST_PARAM_ORDER = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'cell_number',
    'm_payment_id',
    'amount',
    'item_name',
    'item_description',
    'custom_int1',
    'custom_int2',
    'custom_int3',
    'custom_int4',
    'custom_int5',
    'custom_str1',
    'custom_str2',
    'custom_str3',
    'custom_str4',
    'custom_str5',
    'email_confirmation',
    'confirmation_address',
    'payment_method',
    'subscription_type',
    'billing_date',
    'recurring_amount',
    'frequency',
    'cycles'
];
/**
 * Generate MD5 signature for PayFast payment data
 * CRITICAL: Parameters MUST be in PayFast's exact specified order (not alphabetical)
 */
function generateSignature(data, passphrase = '') {
    // Create parameter string using PayFast's required parameter order
    // IMPORTANT: PayFast requires URL-encoded values for signature generation
    // Use encodeURIComponent and replace %20 with + (PayFast uses + for spaces)
    let paramString = '';
    for (const key of PAYFAST_PARAM_ORDER) {
        // Skip signature field and empty/null/undefined values
        if (key !== 'signature' && data[key] !== '' && data[key] !== null && data[key] !== undefined) {
            // URL encode the value and replace %20 with + for PayFast compatibility
            paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`;
        }
    }
    // Remove last ampersand
    paramString = paramString.slice(0, -1);
    // Add passphrase if configured (required for both sandbox and production if set in PayFast dashboard)
    if (passphrase) {
        paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
    }
    // Generate MD5 hash and return lowercase hex
    return crypto_1.default.createHash('md5').update(paramString).digest('hex').toLowerCase();
}
/**
 * Create payment data for one-time payment
 */
function createPaymentData(params) {
    const apiUrl = process.env['API_URL'] || 'http://localhost:3006';
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const paymentData = {
        merchant_id: PAYFAST_CONFIG.merchantId,
        merchant_key: PAYFAST_CONFIG.merchantKey,
        return_url: `${frontendUrl}/payment/success`,
        cancel_url: `${frontendUrl}/payment/cancel`,
        notify_url: process.env['PAYFAST_ITN_URL'] || `${apiUrl}/api/payfast/webhook`,
        name_first: params.userName,
        email_address: params.userEmail,
        m_payment_id: params.transactionId,
        amount: params.planPrice.toFixed(2),
        item_name: `PDFLab ${params.planName} Plan`,
        item_description: `PDFLab ${params.planName} subscription`,
        custom_str1: params.userId,
        custom_str2: params.planName.toLowerCase(),
        email_confirmation: '1',
        confirmation_address: params.userEmail
    };
    const signature = generateSignature(paymentData, PAYFAST_CONFIG.passphrase);
    return {
        ...paymentData,
        signature
    };
}
/**
 * Create subscription payment data for recurring billing
 */
function createSubscriptionPaymentData(params) {
    const apiUrl = process.env['API_URL'] || 'http://localhost:3006';
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const billingDate = params.billingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    // Split userName into first and last name (PayFast requires both)
    const nameParts = params.userName.trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Account';
    const paymentData = {
        merchant_id: PAYFAST_CONFIG.merchantId,
        merchant_key: PAYFAST_CONFIG.merchantKey,
        return_url: `${frontendUrl}/payment/success`,
        cancel_url: `${frontendUrl}/payment/cancel`,
        notify_url: process.env['PAYFAST_ITN_URL'] || `${apiUrl}/api/payfast/webhook`,
        name_first: firstName,
        name_last: lastName,
        email_address: params.userEmail,
        m_payment_id: params.transactionId,
        amount: params.planPrice.toFixed(2),
        item_name: `PDFLab ${params.planName} Plan`,
        item_description: `PDFLab ${params.planName} monthly subscription`,
        custom_str1: params.userId,
        custom_str2: params.planName.toLowerCase(),
        email_confirmation: '1',
        confirmation_address: params.userEmail,
        // Subscription specific fields
        subscription_type: '1', // Recurring
        billing_date: billingDate.toISOString().split('T')[0], // YYYY-MM-DD
        recurring_amount: params.planPrice.toFixed(2),
        frequency: '3', // Monthly
        cycles: '0' // Unlimited (0 = continue until cancelled)
    };
    const signature = generateSignature(paymentData, PAYFAST_CONFIG.passphrase);
    return {
        ...paymentData,
        signature
    };
}
/**
 * Validate PayFast ITN signature
 */
function validateSignature(data, receivedSignature) {
    const calculatedSignature = generateSignature(data, PAYFAST_CONFIG.passphrase);
    return calculatedSignature === receivedSignature;
}
/**
 * Verify payment with PayFast server
 * Makes a request back to PayFast to confirm the payment is legitimate
 */
async function verifyPaymentWithPayFast(data) {
    return new Promise((resolve, reject) => {
        const paramString = new url_1.URLSearchParams(data).toString();
        const options = {
            hostname: PAYFAST_CONFIG.mode === 'production' ? 'www.payfast.co.za' : 'sandbox.payfast.co.za',
            port: 443,
            path: '/eng/query/validate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(paramString)
            }
        };
        const req = https_1.default.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                // PayFast returns "VALID" if the payment is legitimate
                resolve(body.trim() === 'VALID');
            });
        });
        req.on('error', (error) => {
            logger_1.default.error('PayFast verification error:', { error: error instanceof Error ? error.message : String(error) });
            reject(error);
        });
        req.write(paramString);
        req.end();
    });
}
/**
 * Validate that the request came from PayFast servers
 */
function validatePayFastHost(host) {
    return PAYFAST_HOSTS.includes(host);
}
/**
 * Validate payment amount matches expected amount
 */
function validateAmount(receivedAmount, expectedAmount) {
    const received = parseFloat(receivedAmount);
    const expected = parseFloat(expectedAmount.toFixed(2));
    // Allow for small floating point differences (within 1 cent)
    return Math.abs(received - expected) < 0.01;
}
/**
 * Get PayFast payment URL
 */
function getPayFastUrl() {
    return `${PAYFAST_CONFIG.apiUrl}/eng/process`;
}
/**
 * Check if PayFast is properly configured
 */
function isConfigured() {
    return !!(PAYFAST_CONFIG.merchantId && PAYFAST_CONFIG.merchantKey);
}
/**
 * Get PayFast configuration (without sensitive data)
 */
function getConfig() {
    return {
        mode: PAYFAST_CONFIG.mode,
        apiUrl: PAYFAST_CONFIG.apiUrl,
        configured: isConfigured()
    };
}
/**
 * Cancel a PayFast subscription
 * Note: PayFast uses token-based subscription cancellation
 */
async function cancelSubscription(token) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        // Build cancellation request
        const data = {
            'merchant-id': PAYFAST_CONFIG.merchantId,
            'version': 'v1',
            'timestamp': timestamp
        };
        // Generate signature for API authentication
        const signature = generateApiSignature(data);
        const requestData = {
            ...data,
            'signature': signature
        };
        const paramString = new url_1.URLSearchParams(requestData).toString();
        const hostname = PAYFAST_CONFIG.mode === 'production' ? 'api.payfast.co.za' : 'api.payfast.co.za';
        const options = {
            hostname,
            port: 443,
            path: `/subscriptions/${token}/cancel?${paramString}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'merchant-id': PAYFAST_CONFIG.merchantId,
                'version': 'v1',
                'timestamp': timestamp,
                'signature': signature
            }
        };
        const req = https_1.default.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (res.statusCode === 200 && response.status === 'success') {
                        resolve({
                            success: true,
                            message: 'Subscription cancelled successfully'
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            message: response.message || `Failed to cancel subscription (HTTP ${res.statusCode})`
                        });
                    }
                }
                catch (error) {
                    reject(new Error(`Failed to parse PayFast response: ${body}`));
                }
            });
        });
        req.on('error', (error) => {
            logger_1.default.error('PayFast subscription cancellation error:', { error: error instanceof Error ? error.message : String(error) });
            reject(error);
        });
        req.end();
    });
}
/**
 * Generate API signature for PayFast API requests (different from payment signature)
 */
function generateApiSignature(data) {
    const passphrase = PAYFAST_CONFIG.passphrase || '';
    // Sort keys and build parameter string
    const sortedKeys = Object.keys(data).sort();
    let paramString = '';
    for (const key of sortedKeys) {
        if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
            paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`;
        }
    }
    // Remove last ampersand
    paramString = paramString.slice(0, -1);
    // Add passphrase
    if (passphrase) {
        paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
    }
    // Generate MD5 hash
    return crypto_1.default.createHash('md5').update(paramString).digest('hex');
}
/**
 * Pause a PayFast subscription
 * Note: Pausing sets cycles remaining to 0 temporarily
 */
async function pauseSubscription(token, cycles = 0) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        const data = {
            'merchant-id': PAYFAST_CONFIG.merchantId,
            'version': 'v1',
            'timestamp': timestamp
        };
        const signature = generateApiSignature(data);
        const requestData = {
            ...data,
            'signature': signature,
            'cycles': cycles.toString()
        };
        const paramString = new url_1.URLSearchParams(requestData).toString();
        const hostname = PAYFAST_CONFIG.mode === 'production' ? 'api.payfast.co.za' : 'api.payfast.co.za';
        const options = {
            hostname,
            port: 443,
            path: `/subscriptions/${token}/pause`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(paramString)
            },
            body: paramString
        };
        const req = https_1.default.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (res.statusCode === 200 && response.status === 'success') {
                        resolve({
                            success: true,
                            message: 'Subscription paused successfully'
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            message: response.message || `Failed to pause subscription (HTTP ${res.statusCode})`
                        });
                    }
                }
                catch (error) {
                    reject(new Error(`Failed to parse PayFast response: ${body}`));
                }
            });
        });
        req.on('error', (error) => {
            logger_1.default.error('PayFast subscription pause error:', { error: error instanceof Error ? error.message : String(error) });
            reject(error);
        });
        req.write(paramString);
        req.end();
    });
}
exports.default = {
    generateSignature,
    createPaymentData,
    createSubscriptionPaymentData,
    validateSignature,
    verifyPaymentWithPayFast,
    validatePayFastHost,
    validateAmount,
    getPayFastUrl,
    isConfigured,
    getConfig,
    cancelSubscription,
    pauseSubscription
};
//# sourceMappingURL=payfast.service.js.map