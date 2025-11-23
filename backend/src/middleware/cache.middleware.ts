import NodeCache from 'node-cache'
import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'

/**
 * Cache Middleware
 *
 * Implements in-memory caching for GET requests to reduce database load
 * and improve API response times.
 *
 * Features:
 * - Per-user cache keys (prevents data leakage)
 * - Configurable TTL (time-to-live)
 * - Cache statistics tracking
 * - Pattern-based cache invalidation
 */

// Cache instance (TTL in seconds)
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone cached objects (better performance)
})

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats = cache.getStats()
  return {
    keys: cache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
    ksize: stats.ksize,
    vsize: stats.vsize,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0
  }
}

/**
 * Clear cache by pattern or completely
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    const keys = cache.keys().filter(key => key.includes(pattern))
    cache.del(keys)
    logger.info('Cache cleared', { pattern, keysRemoved: keys.length })
    return keys.length
  } else {
    cache.flushAll()
    logger.info('All cache cleared')
    return cache.keys().length
  }
}

/**
 * Cache middleware factory
 *
 * @param ttl - Time to live in seconds (default: 600 = 10 minutes)
 * @returns Express middleware function
 */
export function cacheMiddleware(ttl: number = 600) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Generate cache key from URL + query params + user ID
    const userId = (req as any).user?.id || 'guest'
    const cacheKey = `${req.path}:${JSON.stringify(req.query)}:${userId}`

    // Try to get from cache
    const cachedResponse = cache.get(cacheKey)
    if (cachedResponse) {
      logger.debug('Cache HIT', { cacheKey, path: req.path })
      res.set('X-Cache', 'HIT')
      return res.json(cachedResponse)
    }

    // If not in cache, intercept response
    const originalJson = res.json.bind(res)
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, body, ttl)
        logger.debug('Cache MISS - caching response', { cacheKey, ttl, path: req.path })
        res.set('X-Cache', 'MISS')
      }
      return originalJson(body)
    }

    next()
  }
}

/**
 * Cache invalidation middleware
 *
 * Automatically invalidate cache when data changes
 * Use after POST, PUT, DELETE, PATCH requests
 */
export function invalidateCacheMiddleware(pattern: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send.bind(res)

    // Override send to invalidate cache after successful response
    res.send = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        clearCache(pattern)
        logger.debug('Cache invalidated', { pattern, method: req.method, path: req.path })
      }
      return originalSend(body)
    }

    next()
  }
}

/**
 * Export cache instance for direct access
 */
export default cache
