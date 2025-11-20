"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadLimiter = exports.authLimiter = exports.uploadLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// DEBUG: Log module initialization
console.error(`[RATELIMIT MODULE] Loading at ${new Date().toISOString()}`);
console.error(`[RATELIMIT MODULE] NODE_ENV = ${process.env.NODE_ENV}`);
console.error(`[RATELIMIT MODULE] TEST_ENV = ${process.env.TEST_ENV}`);
const EXEMPTION_CONFIG = {
    production: {
        envExempt: false, // Enforce all rate limits in production
        whitelistedIPs: process.env.RATE_LIMIT_WHITELIST?.split(',') || [],
        testModeEnabled: false, // Never allow test mode bypass in production
    },
    staging: {
        envExempt: false, // Don't exempt everything - we want to test rate limiting works
        whitelistedIPs: [],
        testModeEnabled: true, // Allow X-Test-Mode header for non-rate-limit tests
    },
    development: {
        envExempt: true, // Skip all rate limiting in development
        whitelistedIPs: ['127.0.0.1', '::1', 'localhost'],
        testModeEnabled: false,
    },
    test: {
        envExempt: true, // Skip all rate limiting in CI/CD
        whitelistedIPs: [],
        testModeEnabled: false,
    },
};
const currentEnv = process.env.NODE_ENV || 'development';
const exemptionConfig = EXEMPTION_CONFIG[currentEnv] || EXEMPTION_CONFIG.development;
console.error(`[RATELIMIT MODULE] Environment: ${currentEnv}`);
console.error(`[RATELIMIT MODULE] Config:`, JSON.stringify(exemptionConfig, null, 2));
/**
 * Intelligent IP extraction with proxy detection
 * Handles: Nginx, Cloudflare, AWS ALB, multiple proxies
 */
function getClientIP(req) {
    // Priority order for IP extraction
    const ipSources = [
        req.headers['cf-connecting-ip'], // Cloudflare
        req.headers['x-real-ip'], // Nginx
        req.headers['x-forwarded-for']?.split(',')[0]?.trim(), // Proxy chain
        req.ip, // Express default
        req.socket?.remoteAddress, // Fallback
    ];
    const clientIP = ipSources.find(ip => ip && ip !== 'unknown') || 'unknown';
    // Validate IP format (prevent header injection)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (ipv4Regex.test(clientIP) || ipv6Regex.test(clientIP)) {
        return clientIP;
    }
    console.warn(`[Rate Limit] Invalid IP format: ${clientIP}`);
    return 'unknown';
}
/**
 * Comprehensive exemption logic
 * Returns: true if request should skip rate limiting
 *
 * Elite rate limiting best practice: Environment-aware exemptions
 * - See: ELITE_RATE_LIMIT_ARCHITECT_SPECIALIST.SKILL.md:234-271
 */
function shouldSkipRateLimit(req) {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    // 1. Environment-based exemption (development, test/CI)
    if (exemptionConfig.envExempt) {
        console.error(`[RATE LIMIT] ✓ SKIPPING for ${currentEnv} environment (IP: ${ip})`);
        return true;
    }
    // 2. Test mode header exemption (staging only, for non-rate-limit tests)
    // This allows comprehensive testing while still validating rate limiting works
    const testModeHeader = req.headers['x-test-mode'];
    const testSecret = process.env.TEST_SECRET;
    if (exemptionConfig.testModeEnabled && testModeHeader && testSecret && testModeHeader === testSecret) {
        console.error(`[RATE LIMIT] ✓ SKIPPING for test mode header (IP: ${ip})`);
        return true;
    }
    // 3. IP whitelist exemption
    if (exemptionConfig.whitelistedIPs.length > 0 && exemptionConfig.whitelistedIPs.includes(ip)) {
        console.error(`[RATE LIMIT] ✓ SKIPPING for whitelisted IP: ${ip}`);
        return true;
    }
    // 4. Health check exemption (monitoring, load balancers)
    if (req.path === '/health' || req.path === '/ping' || req.path === '/api/health') {
        return true;
    }
    // 5. Internal service exemption (API key check)
    const apiKey = req.headers['x-api-key'];
    if (apiKey && process.env.INTERNAL_API_KEYS?.split(',').includes(apiKey)) {
        console.error(`[RATE LIMIT] ✓ SKIPPING for internal service (API Key)`);
        return true;
    }
    console.error(`[RATE LIMIT] ✗ ENFORCING limits (IP: ${ip}, Env: ${currentEnv})`);
    return false;
}
/**
 * General API rate limiter
 *
 * Environment-aware limits:
 * - Production: 100 req/15min (strict)
 * - Staging: 1000 req/15min (reasonable for testing)
 * - Development/Test: Skipped via shouldSkipRateLimit()
 *
 * Elite best practice: Environment-specific limits with intelligent exemptions
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: process.env.NODE_ENV === 'staging'
        ? 1000 // Reasonable staging limit (not unlimited)
        : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skip: shouldSkipRateLimit,
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return getClientIP(req);
    }
    // TODO: Add Redis store in production
    // store: new RedisStore({
    //   client: redisClient,
    //   prefix: 'rate-limit:api:'
    // })
});
console.error(`[RATELIMIT MODULE] apiLimiter created - max: ${process.env.NODE_ENV === 'staging' ? 1000 : 100}`);
/**
 * Upload rate limiter
 * Tier-based limits per hour
 */
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: async (req) => {
        // Dynamic limit based on user plan
        const userPlan = req.userPlan || 'free';
        switch (userPlan) {
            case 'pro':
            case 'enterprise':
                return 1000; // 1000 uploads per hour
            case 'starter':
                return 100; // 100 uploads per hour
            case 'free':
            default:
                return 10; // 10 uploads per hour
        }
    },
    skip: shouldSkipRateLimit, // ✅ Apply same environment exemptions
    keyGenerator: (req) => {
        // Rate limit by user ID if authenticated, otherwise by IP
        return req.userId || req.ip || 'unknown';
    },
    message: {
        error: 'Upload limit exceeded',
        message: 'You have exceeded your hourly upload limit. Please upgrade your plan or try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
    // TODO: Add Redis store in production
});
/**
 * Authentication rate limiter
 * Prevents brute force attacks on login/register
 *
 * Environment-aware limits:
 * - Production: 5 failed attempts per 15 minutes (very strict)
 * - Staging: 50 failed attempts per 15 minutes (reasonable for testing)
 * - Development/Test: Skipped via shouldSkipRateLimit()
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'staging'
        ? 50 // Reasonable staging limit for login test scenarios
        : 5, // Very strict for production (brute force protection)
    skip: shouldSkipRateLimit,
    skipSuccessfulRequests: true, // Only count failed attempts
    message: {
        error: 'Too many authentication attempts',
        message: 'Too many failed login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return getClientIP(req);
    }
    // TODO: Add Redis store in production
});
/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 *
 * Environment-aware limits:
 * - Production: 50 downloads per 10 minutes
 * - Staging: 500 downloads per 10 minutes (reasonable for testing)
 * - Development/Test: Skipped via shouldSkipRateLimit()
 */
exports.downloadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: process.env.NODE_ENV === 'staging' ? 500 : 50,
    skip: shouldSkipRateLimit,
    keyGenerator: (req) => {
        return req.userId || getClientIP(req);
    },
    message: {
        error: 'Download limit exceeded',
        message: 'Too many download requests. Please wait a few minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
    // TODO: Add Redis store in production
});
//# sourceMappingURL=ratelimit.middleware.js.map