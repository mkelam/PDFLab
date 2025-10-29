import rateLimit from 'express-rate-limit'
// import RedisStore from 'rate-limit-redis'
// import { redisClient } from '../config/redis'
import { Request } from 'express'

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 * Note: Using in-memory store for now. TODO: Switch to Redis store when ready for production
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
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
})

/**
 * Upload rate limiter
 * Tier-based limits per hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: Request) => {
    // Dynamic limit based on user plan
    const userPlan = req.userPlan || 'free'

    switch (userPlan) {
      case 'pro':
      case 'enterprise':
        return 1000 // 1000 uploads per hour
      case 'starter':
        return 100 // 100 uploads per hour
      case 'free':
      default:
        return 10 // 10 uploads per hour
    }
  },
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.userId || req.ip || 'unknown'
  },
  message: {
    error: 'Upload limit exceeded',
    message: 'You have exceeded your hourly upload limit. Please upgrade your plan or try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
  // TODO: Add Redis store in production
})

/**
 * Authentication rate limiter
 * Prevents brute force attacks on login/register
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many failed login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
  // TODO: Add Redis store in production
})

/**
 * Download rate limiter
 * 50 downloads per 10 minutes per user
 */
export const downloadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50,
  keyGenerator: (req: Request) => {
    return req.userId || req.ip || 'unknown'
  },
  message: {
    error: 'Download limit exceeded',
    message: 'Too many download requests. Please wait a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
  // TODO: Add Redis store in production
})
