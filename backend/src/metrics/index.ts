/**
 * Metrics Module Index
 *
 * Central export point for all metrics modules
 */

// Export conversion funnel metrics
export * from './conversion-funnel.metrics'

// Export error rate metrics
export * from './error-rate.metrics'

// Export queue metrics
export * from './queue.metrics'

// Export SLO metrics
export * from './slo.metrics'

import logger from '../config/logger'
import { startQueueMonitoring } from './queue.metrics'

/**
 * Initialize all metrics modules
 */
export function initializeMetrics(): () => void {
  logger.info('[Metrics] Initializing advanced monitoring')

  // Start queue monitoring (every 10 seconds)
  const queueMonitoringInterval = startQueueMonitoring(10000)

  logger.info('[Metrics] Advanced monitoring initialized', {
    queueMonitoring: 'enabled',
    interval: '10s'
  })

  // Return cleanup function
  return () => {
    clearInterval(queueMonitoringInterval)
    logger.info('[Metrics] Advanced monitoring stopped')
  }
}

logger.info('[Metrics] Metrics module loaded')
