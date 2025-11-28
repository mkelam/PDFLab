"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadLimiter = exports.authLimiter = exports.uploadLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("../config/redis");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Create a Redis store for rate limiting if Redis is available
 * Falls back to in-memory store if Redis is not connected
 */
const createRedisStore = (prefix) => {
    if (redis_1.redisClient.isOpen) {
        logger_1.default.info(`Creating Redis-backed rate limiter: ${prefix}`);
        return new rate_limit_redis_1.default({
            sendCommand: (...args) => redis_1.redisClient.sendCommand(args),
            prefix: prefix
        });
    }
    if (process.env.NODE_ENV === 'production') {
        logger_1.default.warn(`Redis not available for rate limiter: ${prefix} - falling back to in-memory store. This is NOT recommended for production!`);
    }
    return undefined;
};
/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP (production)
 * 10000 requests per 15 minutes (development - essentially unlimited)
 * Uses Redis store in production for distributed rate limiting
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: process.env.NODE_ENV === 'development' && process.env.TEST_ENV !== 'true'
        ? 10000 // Very high limit for development (but not test mode)
        : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // In production behind nginx, use X-Forwarded-For
        // In development, use socket IP
        return req.ip || req.socket?.remoteAddress || 'unknown';
    },
    store: createRedisStore('rate-limit:api:')
});
/**
 * Upload rate limiter
 * Tier-based limits per hour
 * Uses Redis store in production for distributed rate limiting
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
    legacyHeaders: false,
    store: createRedisStore('rate-limit:upload:')
});
/**
 * Authentication rate limiter
 * Prevents brute force attacks on login/register
 * 5 attempts per 15 minutes per IP (production/test)
 * 1000 attempts per 15 minutes (development only)
 * Uses Redis store in production for distributed rate limiting
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' && process.env.TEST_ENV !== 'true' ? 1000 : 5,
    skipSuccessfulRequests: true,
    message: {
        error: 'Too many authentication attempts',
        message: 'Too many failed login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.socket?.remoteAddress || 'unknown';
    },
    store: createRedisStore('rate-limit:auth:')
});
/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 * Uses Redis store in production for distributed rate limiting
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
    legacyHeaders: false,
    store: createRedisStore('rate-limit:download:')
});
//# sourceMappingURL=ratelimit.middleware.js.map