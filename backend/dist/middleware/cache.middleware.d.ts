import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';
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
declare const cache: NodeCache;
/**
 * Get cache statistics
 */
export declare function getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
    hitRate: number;
};
/**
 * Clear cache by pattern or completely
 */
export declare function clearCache(pattern?: string): number;
/**
 * Cache middleware factory
 *
 * @param ttl - Time to live in seconds (default: 600 = 10 minutes)
 * @returns Express middleware function
 */
export declare function cacheMiddleware(ttl?: number): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Cache invalidation middleware
 *
 * Automatically invalidate cache when data changes
 * Use after POST, PUT, DELETE, PATCH requests
 */
export declare function invalidateCacheMiddleware(pattern: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Export cache instance for direct access
 */
export default cache;
//# sourceMappingURL=cache.middleware.d.ts.map