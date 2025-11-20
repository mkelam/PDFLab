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
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Upload rate limiter
 * Tier-based limits per hour
 */
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Authentication rate limiter
 * Prevents brute force attacks on login/register
 *
 * Environment-aware limits:
 * - Production: 5 failed attempts per 15 minutes (very strict)
 * - Staging: 50 failed attempts per 15 minutes (reasonable for testing)
 * - Development/Test: Skipped via shouldSkipRateLimit()
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 *
 * Environment-aware limits:
 * - Production: 50 downloads per 10 minutes
 * - Staging: 500 downloads per 10 minutes (reasonable for testing)
 * - Development/Test: Skipped via shouldSkipRateLimit()
 */
export declare const downloadLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=ratelimit.middleware.d.ts.map