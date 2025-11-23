/**
 * Queue Depth and Performance Metrics
 *
 * Tracks:
 * - Queue depth (number of jobs waiting)
 * - Queue processing latency
 * - Job completion rate
 * - Queue worker status
 * - Job retry attempts
 * - Queue backup situations
 */

import { Gauge, Counter, Histogram } from 'prom-client'
import logger from '../config/logger'
import { conversionQueue, cleanupQueue } from '../config/redis'

// ============================================================================
// Queue Depth Gauges
// ============================================================================

/**
 * Current queue depth (jobs waiting to be processed)
 */
export const queueDepth = new Gauge({
  name: 'pdflab_queue_depth',
  help: 'Current number of jobs in the queue',
  labelNames: ['queue_name', 'state'] // state: waiting, active, delayed, failed
})

/**
 * Queue worker count (number of active workers)
 */
export const queueWorkers = new Gauge({
  name: 'pdflab_queue_workers',
  help: 'Number of active queue workers',
  labelNames: ['queue_name', 'status'] // status: active, idle, stalled
})

/**
 * Queue age (oldest job waiting time)
 */
export const queueOldestJobAge = new Gauge({
  name: 'pdflab_queue_oldest_job_age_seconds',
  help: 'Age of the oldest job in the queue',
  labelNames: ['queue_name']
})

// ============================================================================
// Queue Performance Metrics
// ============================================================================

/**
 * Job processing duration
 */
export const jobProcessingDuration = new Histogram({
  name: 'pdflab_job_processing_duration_seconds',
  help: 'Time taken to process a job',
  labelNames: ['queue_name', 'job_type', 'conversion_type'],
  buckets: [1, 3, 5, 10, 20, 30, 60, 120, 300, 600] // 1s to 10min
})

/**
 * Job wait time (time from submission to start)
 */
export const jobWaitTime = new Histogram({
  name: 'pdflab_job_wait_time_seconds',
  help: 'Time a job spends waiting before processing starts',
  labelNames: ['queue_name', 'priority'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600] // 0.1s to 10min
})

/**
 * Job completion rate
 */
export const jobCompletions = new Counter({
  name: 'pdflab_job_completions_total',
  help: 'Total number of completed jobs',
  labelNames: ['queue_name', 'job_type', 'status'] // status: completed, failed
})

/**
 * Job retry attempts
 */
export const jobRetries = new Counter({
  name: 'pdflab_job_retries_total',
  help: 'Total number of job retry attempts',
  labelNames: ['queue_name', 'job_type', 'retry_reason', 'attempt_number']
})

/**
 * Job failures
 */
export const jobFailures = new Counter({
  name: 'pdflab_job_failures_total',
  help: 'Total number of job failures',
  labelNames: ['queue_name', 'job_type', 'failure_reason', 'is_permanent']
})

// ============================================================================
// Queue Backup and Alerts
// ============================================================================

/**
 * Queue backup events (when queue depth exceeds threshold)
 */
export const queueBackups = new Counter({
  name: 'pdflab_queue_backups_total',
  help: 'Number of times queue depth exceeded threshold',
  labelNames: ['queue_name', 'threshold']
})

/**
 * Queue stalled jobs
 */
export const queueStalledJobs = new Counter({
  name: 'pdflab_queue_stalled_jobs_total',
  help: 'Number of stalled jobs detected',
  labelNames: ['queue_name']
})

/**
 * Queue circuit breaker state
 */
export const queueCircuitBreakerState = new Gauge({
  name: 'pdflab_queue_circuit_breaker_state',
  help: 'Circuit breaker state for queue (0=closed, 1=open, 2=half_open)',
  labelNames: ['queue_name']
})

// ============================================================================
// Queue Throughput Metrics
// ============================================================================

/**
 * Jobs processed per second
 */
export const queueThroughput = new Gauge({
  name: 'pdflab_queue_throughput_jobs_per_second',
  help: 'Current queue throughput in jobs per second',
  labelNames: ['queue_name']
})

/**
 * Queue capacity utilization (%)
 */
export const queueCapacityUtilization = new Gauge({
  name: 'pdflab_queue_capacity_utilization_percentage',
  help: 'Queue capacity utilization as percentage',
  labelNames: ['queue_name']
})

// ============================================================================
// Job Priority Metrics
// ============================================================================

/**
 * Jobs by priority level
 */
export const jobsByPriority = new Gauge({
  name: 'pdflab_queue_jobs_by_priority',
  help: 'Number of jobs by priority level',
  labelNames: ['queue_name', 'priority'] // high, normal, low
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get queue state counts from Bull queue
 */
async function getQueueStateCounts(queue: any): Promise<{
  waiting: number
  active: number
  delayed: number
  failed: number
}> {
  try {
    const [waiting, active, delayed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount()
    ])

    return { waiting, active, delayed, failed }
  } catch (error) {
    logger.error('[Metrics] Failed to get queue state counts', { error })
    return { waiting: 0, active: 0, delayed: 0, failed: 0 }
  }
}

/**
 * Get oldest job age in seconds
 */
async function getOldestJobAge(queue: any): Promise<number> {
  try {
    const jobs = await queue.getWaiting(0, 1) // Get first waiting job
    if (jobs.length === 0) return 0

    const oldestJob = jobs[0]
    const age = (Date.now() - oldestJob.timestamp) / 1000
    return age
  } catch (error) {
    logger.error('[Metrics] Failed to get oldest job age', { error })
    return 0
  }
}

// ============================================================================
// Queue Monitoring Functions
// ============================================================================

/**
 * Update queue depth metrics
 */
export async function updateQueueDepth(
  queueName: string,
  queue: any
): Promise<void> {
  try {
    const states = await getQueueStateCounts(queue)

    queueDepth.labels(queueName, 'waiting').set(states.waiting)
    queueDepth.labels(queueName, 'active').set(states.active)
    queueDepth.labels(queueName, 'delayed').set(states.delayed)
    queueDepth.labels(queueName, 'failed').set(states.failed)

    // Update oldest job age
    const oldestAge = await getOldestJobAge(queue)
    queueOldestJobAge.labels(queueName).set(oldestAge)

    logger.debug('[Metrics] Queue depth updated', {
      queueName,
      ...states,
      oldestAge
    })
  } catch (error) {
    logger.error('[Metrics] Failed to update queue depth', { queueName, error })
  }
}

/**
 * Track job processing duration
 */
export function trackJobDuration(
  queueName: string,
  jobType: string,
  conversionType: string,
  durationSeconds: number
): void {
  jobProcessingDuration.labels(queueName, jobType, conversionType).observe(durationSeconds)

  logger.debug('[Metrics] Job duration tracked', {
    queueName,
    jobType,
    conversionType,
    durationSeconds
  })
}

/**
 * Track job wait time
 */
export function trackJobWaitTime(
  queueName: string,
  priority: 'high' | 'normal' | 'low',
  waitTimeSeconds: number
): void {
  jobWaitTime.labels(queueName, priority).observe(waitTimeSeconds)

  logger.debug('[Metrics] Job wait time tracked', {
    queueName,
    priority,
    waitTimeSeconds
  })
}

/**
 * Track job completion
 */
export function trackJobCompletion(
  queueName: string,
  jobType: string,
  status: 'completed' | 'failed'
): void {
  jobCompletions.labels(queueName, jobType, status).inc()

  logger.info('[Metrics] Job completion tracked', {
    queueName,
    jobType,
    status
  })
}

/**
 * Track job retry
 */
export function trackJobRetry(
  queueName: string,
  jobType: string,
  retryReason: string,
  attemptNumber: number
): void {
  jobRetries.labels(queueName, jobType, retryReason, attemptNumber.toString()).inc()

  logger.warn('[Metrics] Job retry tracked', {
    queueName,
    jobType,
    retryReason,
    attemptNumber
  })
}

/**
 * Track job failure
 */
export function trackJobFailure(
  queueName: string,
  jobType: string,
  failureReason: string,
  isPermanent: boolean = false
): void {
  jobFailures.labels(queueName, jobType, failureReason, isPermanent.toString()).inc()

  logger.error('[Metrics] Job failure tracked', {
    queueName,
    jobType,
    failureReason,
    isPermanent
  })
}

/**
 * Track queue backup event
 */
export function trackQueueBackup(
  queueName: string,
  threshold: number,
  currentDepth: number
): void {
  queueBackups.labels(queueName, threshold.toString()).inc()

  logger.error('[Metrics] Queue backup detected', {
    queueName,
    threshold,
    currentDepth
  })
}

/**
 * Track stalled job
 */
export function trackStalledJob(queueName: string): void {
  queueStalledJobs.labels(queueName).inc()

  logger.error('[Metrics] Stalled job detected', { queueName })
}

/**
 * Update queue worker count
 */
export function updateWorkerCount(
  queueName: string,
  status: 'active' | 'idle' | 'stalled',
  count: number
): void {
  queueWorkers.labels(queueName, status).set(count)
}

/**
 * Update queue throughput
 */
export function updateQueueThroughput(
  queueName: string,
  jobsPerSecond: number
): void {
  queueThroughput.labels(queueName).set(jobsPerSecond)
}

/**
 * Update queue capacity utilization
 */
export function updateQueueCapacity(
  queueName: string,
  currentDepth: number,
  maxCapacity: number = 1000 // Default max capacity
): void {
  const utilization = (currentDepth / maxCapacity) * 100
  queueCapacityUtilization.labels(queueName).set(utilization)

  if (utilization > 80) {
    logger.warn('[Metrics] Queue capacity high', {
      queueName,
      utilization,
      currentDepth,
      maxCapacity
    })
  }
}

/**
 * Update jobs by priority
 */
export function updateJobsByPriority(
  queueName: string,
  priority: 'high' | 'normal' | 'low',
  count: number
): void {
  jobsByPriority.labels(queueName, priority).set(count)
}

/**
 * Update circuit breaker state
 */
export function updateCircuitBreakerState(
  queueName: string,
  state: 'closed' | 'open' | 'half_open'
): void {
  const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2
  queueCircuitBreakerState.labels(queueName).set(stateValue)

  if (state === 'open') {
    logger.error('[Metrics] Queue circuit breaker opened', { queueName })
  }
}

// ============================================================================
// Queue Health Check
// ============================================================================

/**
 * Check queue health and update metrics
 */
export async function checkQueueHealth(
  queueName: string,
  queue: any,
  thresholds: {
    maxDepth?: number
    maxWaitTime?: number
    maxFailureRate?: number
  } = {}
): Promise<{
  healthy: boolean
  issues: string[]
}> {
  const issues: string[] = []

  try {
    const states = await getQueueStateCounts(queue)
    const totalJobs = states.waiting + states.active + states.delayed
    const oldestAge = await getOldestJobAge(queue)

    // Check depth threshold
    if (thresholds.maxDepth && totalJobs > thresholds.maxDepth) {
      issues.push(`Queue depth ${totalJobs} exceeds threshold ${thresholds.maxDepth}`)
      trackQueueBackup(queueName, thresholds.maxDepth, totalJobs)
    }

    // Check wait time threshold
    if (thresholds.maxWaitTime && oldestAge > thresholds.maxWaitTime) {
      issues.push(`Oldest job age ${oldestAge}s exceeds threshold ${thresholds.maxWaitTime}s`)
    }

    // Check failure rate
    if (thresholds.maxFailureRate && totalJobs > 0) {
      const failureRate = (states.failed / totalJobs) * 100
      if (failureRate > thresholds.maxFailureRate) {
        issues.push(`Failure rate ${failureRate.toFixed(2)}% exceeds threshold ${thresholds.maxFailureRate}%`)
      }
    }

    const healthy = issues.length === 0

    if (!healthy) {
      logger.warn('[Metrics] Queue health check failed', {
        queueName,
        issues,
        states,
        oldestAge
      })
    }

    return { healthy, issues }
  } catch (error) {
    logger.error('[Metrics] Queue health check error', { queueName, error })
    return {
      healthy: false,
      issues: ['Health check error: ' + (error as Error).message]
    }
  }
}

// ============================================================================
// Periodic Queue Monitoring
// ============================================================================

/**
 * Start periodic queue monitoring
 */
export function startQueueMonitoring(intervalMs: number = 10000): NodeJS.Timeout {
  logger.info('[Metrics] Starting periodic queue monitoring', { intervalMs })

  const interval = setInterval(async () => {
    try {
      // Monitor conversion queue
      if (conversionQueue) {
        await updateQueueDepth('conversion', conversionQueue)

        // Check health with thresholds
        await checkQueueHealth('conversion', conversionQueue, {
          maxDepth: 100,
          maxWaitTime: 300, // 5 minutes
          maxFailureRate: 10 // 10%
        })
      }

      // Monitor cleanup queue
      if (cleanupQueue) {
        await updateQueueDepth('cleanup', cleanupQueue)
      }
    } catch (error) {
      logger.error('[Metrics] Queue monitoring error', { error })
    }
  }, intervalMs)

  return interval
}

logger.info('[Metrics] Queue metrics initialized')
