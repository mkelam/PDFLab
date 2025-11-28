/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP (production)
 * 10000 requests per 15 minutes (development - essentially unlimited)
 * Uses Redis store in production for distributed rate limiting
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Upload rate limiter
 * Tier-based limits per hour
 * Uses Redis store in production for distributed rate limiting
 */
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Authentication rate limiter
 * Prevents brute force attacks on login/register
 * 5 attempts per 15 minutes per IP (production/test)
 * 1000 attempts per 15 minutes (development only)
 * Uses Redis store in production for distributed rate limiting
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 * Uses Redis store in production for distributed rate limiting
 */
export declare const downloadLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=ratelimit.middleware.d.ts.map