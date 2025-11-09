"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadLimiter = exports.authLimiter = exports.uploadLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP (production)
 * 10000 requests per 15 minutes (development - essentially unlimited)
 * Note: Using in-memory store for now. TODO: Switch to Redis store when ready for production
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: process.env.NODE_ENV === 'development'
        ? 10000 // Very high limit for development
        : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
    // TODO: Add Redis store in production
    // store: new RedisStore({
    //   client: redisClient,
    //   prefix: 'rate-limit:api:'
    // })
});
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
 * 5 attempts per 15 minutes per IP (production)
 * 1000 attempts per 15 minutes (development)
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 5,
    skipSuccessfulRequests: true,
    message: {
        error: 'Too many authentication attempts',
        message: 'Too many failed login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
    // TODO: Add Redis store in production
});
/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 */
exports.downloadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50,
    keyGenerator: (req) => {
        return req.userId || req.ip || 'unknown';
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