import { Router, Request, Response } from 'express'
import { cloudConvertService } from '../services/cloudconvert.service'
import { requireAuth } from '../middleware/auth.middleware'
import logger from '../config/logger'

const router = Router()

/**
 * GET /api/admin/circuit-breakers
 * Get circuit breaker statistics for all CloudConvert operations
 * Requires authentication
 */
router.get('/circuit-breakers', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = cloudConvertService.getCircuitBreakerStats()

    logger.info('Circuit breaker stats requested', {
      userId: (req as any).user?.id,
      requestId: (req as any).id
    })

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        cloudconvert: stats
      }
    })
  } catch (error: any) {
    logger.error('Failed to fetch circuit breaker stats', {
      error: error.message,
      requestId: (req as any).id
    })

    res.status(500).json({
      error: 'Failed to fetch circuit breaker stats',
      message: error.message
    })
  }
})

/**
 * GET /api/admin/circuit-breakers/health
 * Get simple health status based on circuit breaker states
 * Requires authentication
 */
router.get('/circuit-breakers/health', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = cloudConvertService.getCircuitBreakerStats()

    // Check if any circuit breaker is open
    const openCircuits = []
    if (stats.convert.isOpen) openCircuits.push('convert')
    if (stats.merge.isOpen) openCircuits.push('merge')
    if (stats.compress.isOpen) openCircuits.push('compress')
    if (stats.download.isOpen) openCircuits.push('download')

    const healthy = openCircuits.length === 0

    res.json({
      healthy,
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      openCircuits: openCircuits.length > 0 ? openCircuits : undefined,
      details: {
        convert: stats.convert.state,
        merge: stats.merge.state,
        compress: stats.compress.state,
        download: stats.download.state
      }
    })
  } catch (error: any) {
    logger.error('Failed to fetch circuit breaker health', {
      error: error.message,
      requestId: (req as any).id
    })

    res.status(500).json({
      healthy: false,
      status: 'error',
      error: error.message
    })
  }
})

export default router
