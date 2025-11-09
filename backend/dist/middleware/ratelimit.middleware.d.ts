/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP (production)
 * 10000 requests per 15 minutes (development - essentially unlimited)
 * Note: Using in-memory store for now. TODO: Switch to Redis store when ready for production
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Upload rate limiter
 * Tier-based limits per hour
 */
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Authentication rate limiter
 * Prevents brute force attacks on login/register
 * 5 attempts per 15 minutes per IP (production)
 * 1000 attempts per 15 minutes (development)
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 */
export declare const downloadLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=ratelimit.middleware.d.ts.map