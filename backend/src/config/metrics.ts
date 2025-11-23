import client from 'prom-client'

/**
 * Prometheus Metrics Configuration
 *
 * This module defines all custom metrics for PDFLab monitoring.
 * Metrics are collected and exposed at /metrics endpoint for Prometheus scraping.
 */

// Create registry
export const register = new client.Registry()

// Default metrics (CPU, memory, event loop)
client.collectDefaultMetrics({
  register,
  prefix: 'pdflab_'
})

// =====================
// HTTP Request Metrics
// =====================

export const httpRequestDuration = new client.Histogram({
  name: 'pdflab_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
})

export const httpRequestTotal = new client.Counter({
  name: 'pdflab_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

// =====================
// PDF Conversion Metrics
// =====================

export const conversionTotal = new client.Counter({
  name: 'pdflab_conversions_total',
  help: 'Total number of PDF conversions',
  labelNames: ['status', 'format', 'conversion_type']
})

export const conversionDuration = new client.Histogram({
  name: 'pdflab_conversion_duration_seconds',
  help: 'Duration of PDF conversions in seconds',
  labelNames: ['format', 'conversion_type'],
  buckets: [5, 10, 30, 60, 120, 300, 600] // Up to 10 minutes
})

export const conversionFileSize = new client.Histogram({
  name: 'pdflab_conversion_file_size_bytes',
  help: 'Size of converted files in bytes',
  labelNames: ['format'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600] // 1KB to 100MB
})

// =====================
// Bull Queue Metrics
// =====================

export const queueSize = new client.Gauge({
  name: 'pdflab_queue_size',
  help: 'Number of jobs in Bull queue',
  labelNames: ['queue', 'status']
})

export const queueJobDuration = new client.Histogram({
  name: 'pdflab_queue_job_duration_seconds',
  help: 'Time jobs spend in queue before processing',
  labelNames: ['queue'],
  buckets: [1, 5, 10, 30, 60, 120, 300]
})

// =====================
// User Activity Metrics
// =====================

export const activeUsers = new client.Gauge({
  name: 'pdflab_active_users_total',
  help: 'Number of active users (logged in last 24h)'
})

export const guestSessions = new client.Gauge({
  name: 'pdflab_guest_sessions_total',
  help: 'Number of active guest sessions'
})

export const userRegistrations = new client.Counter({
  name: 'pdflab_user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['tier']
})

// =====================
// Subscription Metrics
// =====================

export const activeSubscriptions = new client.Gauge({
  name: 'pdflab_active_subscriptions',
  help: 'Number of active paid subscriptions',
  labelNames: ['tier']
})

export const subscriptionEvents = new client.Counter({
  name: 'pdflab_subscription_events_total',
  help: 'Total number of subscription events',
  labelNames: ['event_type', 'tier'] // event_type: created, cancelled, expired, upgraded
})

// =====================
// Error Metrics
// =====================

export const errorTotal = new client.Counter({
  name: 'pdflab_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route', 'status_code']
})

export const cloudconvertErrors = new client.Counter({
  name: 'pdflab_cloudconvert_errors_total',
  help: 'Total number of CloudConvert API errors',
  labelNames: ['error_type']
})

// =====================
// Storage Metrics
// =====================

export const storageUsed = new client.Gauge({
  name: 'pdflab_storage_used_bytes',
  help: 'Total storage used in bytes',
  labelNames: ['type'] // type: uploads, outputs, temp
})

// =====================
// Database Metrics
// =====================

export const databaseQueryDuration = new client.Histogram({
  name: 'pdflab_database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
})

export const databaseConnections = new client.Gauge({
  name: 'pdflab_database_connections',
  help: 'Number of active database connections'
})

// =====================
// Redis Metrics
// =====================

export const redisCommandDuration = new client.Histogram({
  name: 'pdflab_redis_command_duration_seconds',
  help: 'Duration of Redis commands',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
})

// Register all custom metrics
register.registerMetric(httpRequestDuration)
register.registerMetric(httpRequestTotal)
register.registerMetric(conversionTotal)
register.registerMetric(conversionDuration)
register.registerMetric(conversionFileSize)
register.registerMetric(queueSize)
register.registerMetric(queueJobDuration)
register.registerMetric(activeUsers)
register.registerMetric(guestSessions)
register.registerMetric(userRegistrations)
register.registerMetric(activeSubscriptions)
register.registerMetric(subscriptionEvents)
register.registerMetric(errorTotal)
register.registerMetric(cloudconvertErrors)
register.registerMetric(storageUsed)
register.registerMetric(databaseQueryDuration)
register.registerMetric(databaseConnections)
register.registerMetric(redisCommandDuration)

/**
 * Helper function to record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
) {
  httpRequestDuration.observe(
    { method, route, status_code: statusCode.toString() },
    durationSeconds
  )
  httpRequestTotal.inc({ method, route, status_code: statusCode.toString() })
}

/**
 * Helper function to record conversion metrics
 */
export function recordConversion(
  status: 'success' | 'failed',
  format: string,
  conversionType: string,
  durationSeconds?: number,
  fileSizeBytes?: number
) {
  conversionTotal.inc({ status, format, conversion_type: conversionType })

  if (durationSeconds !== undefined) {
    conversionDuration.observe(
      { format, conversion_type: conversionType },
      durationSeconds
    )
  }

  if (fileSizeBytes !== undefined) {
    conversionFileSize.observe({ format }, fileSizeBytes)
  }
}

/**
 * Helper function to update queue metrics
 */
export async function updateQueueMetrics(
  queueName: string,
  getQueueCounts: () => Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
  }>
) {
  const counts = await getQueueCounts()

  queueSize.set({ queue: queueName, status: 'waiting' }, counts.waiting)
  queueSize.set({ queue: queueName, status: 'active' }, counts.active)
  queueSize.set({ queue: queueName, status: 'completed' }, counts.completed)
  queueSize.set({ queue: queueName, status: 'failed' }, counts.failed)
}

/**
 * Helper function to record errors
 */
export function recordError(
  type: string,
  route: string,
  statusCode?: number
) {
  errorTotal.inc({
    type,
    route,
    status_code: statusCode?.toString() || 'unknown'
  })
}
