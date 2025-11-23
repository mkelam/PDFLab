import { Router, Request, Response } from 'express'
import { register } from '../config/metrics'
import logger from '../config/logger'

/**
 * Metrics Routes
 *
 * Exposes Prometheus metrics endpoint for scraping.
 * This endpoint should be accessible only from the Docker network
 * or protected by authentication in production.
 */

const router = Router()

/**
 * GET /metrics
 *
 * Returns all collected metrics in Prometheus format.
 * This endpoint is scraped by Prometheus at regular intervals.
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // Set proper content type for Prometheus
    res.set('Content-Type', register.contentType)

    // Return metrics
    const metrics = await register.metrics()
    res.end(metrics)

    logger.debug('Metrics scraped successfully', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    })
  } catch (error) {
    logger.error('Failed to generate metrics', {
      error: error instanceof Error ? error.message : String(error)
    })

    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})

/**
 * GET /metrics/health
 *
 * Simple health check for the metrics endpoint.
 * Returns basic information about available metrics.
 */
router.get('/metrics/health', async (req: Request, res: Response) => {
  try {
    const metrics = await register.getMetricsAsJSON()

    res.json({
      status: 'OK',
      metricsCount: metrics.length,
      timestamp: Date.now(),
      metrics: metrics.map((m) => ({
        name: m.name,
        type: m.type,
        help: m.help
      }))
    })
  } catch (error) {
    logger.error('Failed to get metrics info', {
      error: error instanceof Error ? error.message : String(error)
    })

    res.status(500).json({
      error: 'Failed to get metrics info',
      message: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router
