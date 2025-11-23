/**
 * Error Rate by Endpoint Metrics
 *
 * Tracks:
 * - 4xx errors (client errors) by endpoint
 * - 5xx errors (server errors) by endpoint
 * - Error rate percentage per endpoint
 * - Common error types and patterns
 * - Error response time
 */

import { Counter, Histogram, Gauge } from 'prom-client'
import logger from '../config/logger'

// ============================================================================
// HTTP Error Counters
// ============================================================================

/**
 * Track HTTP errors by status code, endpoint, and method
 */
export const httpErrors = new Counter({
  name: 'pdflab_http_errors_total',
  help: 'Total number of HTTP errors by endpoint',
  labelNames: ['method', 'route', 'status_code', 'error_type', 'user_type']
})

/**
 * Track 4xx client errors specifically
 */
export const http4xxErrors = new Counter({
  name: 'pdflab_http_4xx_errors_total',
  help: 'Total number of 4xx client errors',
  labelNames: ['method', 'route', 'status_code', 'error_reason']
})

/**
 * Track 5xx server errors specifically
 */
export const http5xxErrors = new Counter({
  name: 'pdflab_http_5xx_errors_total',
  help: 'Total number of 5xx server errors',
  labelNames: ['method', 'route', 'status_code', 'error_reason', 'error_id']
})

/**
 * Track error response duration
 */
export const errorResponseDuration = new Histogram({
  name: 'pdflab_error_response_duration_seconds',
  help: 'Duration of error responses',
  labelNames: ['status_code', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10] // 10ms to 10s
})

// ============================================================================
// Error Rate Gauges
// ============================================================================

/**
 * Current error rate (errors per second) by endpoint
 */
export const currentErrorRate = new Gauge({
  name: 'pdflab_current_error_rate',
  help: 'Current error rate per second by endpoint',
  labelNames: ['route', 'error_type']
})

/**
 * Error rate percentage (errors / total requests * 100)
 */
export const errorRatePercentage = new Gauge({
  name: 'pdflab_error_rate_percentage',
  help: 'Error rate as percentage of total requests',
  labelNames: ['route', 'status_range'] // 4xx, 5xx
})

// ============================================================================
// Specific Error Types
// ============================================================================

/**
 * Authentication/Authorization errors
 */
export const authErrors = new Counter({
  name: 'pdflab_auth_errors_total',
  help: 'Total authentication and authorization errors',
  labelNames: ['error_type', 'route', 'user_type']
})

/**
 * Validation errors (bad request data)
 */
export const validationErrors = new Counter({
  name: 'pdflab_validation_errors_total',
  help: 'Total validation errors',
  labelNames: ['route', 'field', 'validation_type']
})

/**
 * Rate limit errors
 */
export const rateLimitErrors = new Counter({
  name: 'pdflab_rate_limit_errors_total',
  help: 'Total rate limit exceeded errors',
  labelNames: ['route', 'user_type', 'limit_type']
})

/**
 * File upload errors
 */
export const fileUploadErrors = new Counter({
  name: 'pdflab_file_upload_errors_total',
  help: 'Total file upload errors',
  labelNames: ['error_reason', 'file_type', 'user_type']
})

/**
 * Conversion processing errors
 */
export const conversionProcessingErrors = new Counter({
  name: 'pdflab_conversion_processing_errors_total',
  help: 'Total conversion processing errors',
  labelNames: ['conversion_type', 'error_reason', 'stage']
})

/**
 * Database errors
 */
export const databaseErrors = new Counter({
  name: 'pdflab_database_errors_total',
  help: 'Total database errors',
  labelNames: ['operation', 'model', 'error_type']
})

/**
 * External API errors (CloudConvert, etc.)
 */
export const externalApiErrors = new Counter({
  name: 'pdflab_external_api_errors_total',
  help: 'Total external API errors',
  labelNames: ['api_name', 'endpoint', 'error_type', 'circuit_breaker_state']
})

// ============================================================================
// Error Pattern Detection
// ============================================================================

/**
 * Track repeated errors (same error occurring multiple times)
 */
export const repeatedErrors = new Counter({
  name: 'pdflab_repeated_errors_total',
  help: 'Errors that occur repeatedly in short time windows',
  labelNames: ['error_id', 'route', 'count_threshold']
})

/**
 * Error bursts (sudden spike in errors)
 */
export const errorBursts = new Counter({
  name: 'pdflab_error_bursts_total',
  help: 'Sudden spikes in error rate',
  labelNames: ['route', 'burst_size']
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get error type from status code
 */
function getErrorType(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) return '4xx_client_error'
  if (statusCode >= 500 && statusCode < 600) return '5xx_server_error'
  return 'unknown'
}

/**
 * Get status range for grouping
 */
function getStatusRange(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) return '4xx'
  if (statusCode >= 500 && statusCode < 600) return '5xx'
  return 'other'
}

/**
 * Normalize route for consistent metrics
 * Converts /api/conversions/123 to /api/conversions/:id
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/[a-f0-9]{24}/gi, '/:id') // MongoDB IDs
}

/**
 * Get user type from request
 */
function getUserType(user?: any, guestSession?: any): string {
  if (guestSession) return 'guest'
  if (!user) return 'anonymous'
  return user.plan || 'free'
}

// ============================================================================
// Error Tracking Functions
// ============================================================================

/**
 * Track general HTTP error
 */
export function trackHttpError(
  method: string,
  route: string,
  statusCode: number,
  errorReason: string,
  user?: any,
  guestSession?: any
): void {
  const normalizedRoute = normalizeRoute(route)
  const errorType = getErrorType(statusCode)
  const userType = getUserType(user, guestSession)

  httpErrors.labels(method, normalizedRoute, statusCode.toString(), errorType, userType).inc()

  // Track 4xx vs 5xx specifically
  if (statusCode >= 400 && statusCode < 500) {
    http4xxErrors.labels(method, normalizedRoute, statusCode.toString(), errorReason).inc()
  } else if (statusCode >= 500 && statusCode < 600) {
    const errorId = `err_${Date.now()}`
    http5xxErrors.labels(method, normalizedRoute, statusCode.toString(), errorReason, errorId).inc()
  }

  logger.debug('[Metrics] HTTP error tracked', {
    method,
    route: normalizedRoute,
    statusCode,
    errorReason,
    userType
  })
}

/**
 * Track error response duration
 */
export function trackErrorDuration(
  route: string,
  statusCode: number,
  durationSeconds: number
): void {
  const normalizedRoute = normalizeRoute(route)
  errorResponseDuration.labels(statusCode.toString(), normalizedRoute).observe(durationSeconds)
}

/**
 * Track authentication error
 */
export function trackAuthError(
  errorType: 'invalid_token' | 'expired_token' | 'missing_token' | 'insufficient_permissions',
  route: string,
  user?: any,
  guestSession?: any
): void {
  const normalizedRoute = normalizeRoute(route)
  const userType = getUserType(user, guestSession)

  authErrors.labels(errorType, normalizedRoute, userType).inc()

  logger.warn('[Metrics] Auth error tracked', {
    errorType,
    route: normalizedRoute,
    userType
  })
}

/**
 * Track validation error
 */
export function trackValidationError(
  route: string,
  field: string,
  validationType: 'required' | 'format' | 'range' | 'type'
): void {
  const normalizedRoute = normalizeRoute(route)
  validationErrors.labels(normalizedRoute, field, validationType).inc()

  logger.debug('[Metrics] Validation error tracked', {
    route: normalizedRoute,
    field,
    validationType
  })
}

/**
 * Track rate limit error
 */
export function trackRateLimitError(
  route: string,
  limitType: 'api' | 'conversion' | 'guest_ip' | 'guest_session',
  user?: any,
  guestSession?: any
): void {
  const normalizedRoute = normalizeRoute(route)
  const userType = getUserType(user, guestSession)

  rateLimitErrors.labels(normalizedRoute, userType, limitType).inc()

  logger.warn('[Metrics] Rate limit error tracked', {
    route: normalizedRoute,
    limitType,
    userType
  })
}

/**
 * Track file upload error
 */
export function trackFileUploadError(
  errorReason: 'file_too_large' | 'invalid_format' | 'corrupted_file' | 'upload_failed',
  fileType: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)

  fileUploadErrors.labels(errorReason, fileType, userType).inc()

  logger.error('[Metrics] File upload error tracked', {
    errorReason,
    fileType,
    userType
  })
}

/**
 * Track conversion processing error
 */
export function trackConversionError(
  conversionType: string,
  errorReason: string,
  stage: 'upload' | 'validation' | 'queue' | 'processing' | 'download'
): void {
  conversionProcessingErrors.labels(conversionType, errorReason, stage).inc()

  logger.error('[Metrics] Conversion processing error tracked', {
    conversionType,
    errorReason,
    stage
  })
}

/**
 * Track database error
 */
export function trackDatabaseError(
  operation: 'select' | 'insert' | 'update' | 'delete',
  model: string,
  errorType: 'connection' | 'timeout' | 'constraint' | 'query'
): void {
  databaseErrors.labels(operation, model, errorType).inc()

  logger.error('[Metrics] Database error tracked', {
    operation,
    model,
    errorType
  })
}

/**
 * Track external API error
 */
export function trackExternalApiError(
  apiName: string,
  endpoint: string,
  errorType: 'timeout' | 'rate_limit' | 'api_error' | 'network_error',
  circuitBreakerState: 'closed' | 'open' | 'half_open'
): void {
  externalApiErrors.labels(apiName, endpoint, errorType, circuitBreakerState).inc()

  logger.error('[Metrics] External API error tracked', {
    apiName,
    endpoint,
    errorType,
    circuitBreakerState
  })
}

/**
 * Update current error rate gauge
 */
export function updateErrorRate(
  route: string,
  errorType: '4xx' | '5xx',
  errorsPerSecond: number
): void {
  const normalizedRoute = normalizeRoute(route)
  currentErrorRate.labels(normalizedRoute, errorType).set(errorsPerSecond)
}

/**
 * Update error rate percentage gauge
 */
export function updateErrorRatePercentage(
  route: string,
  statusRange: '4xx' | '5xx',
  percentage: number
): void {
  const normalizedRoute = normalizeRoute(route)
  errorRatePercentage.labels(normalizedRoute, statusRange).set(percentage)
}

/**
 * Track repeated error pattern
 */
export function trackRepeatedError(
  errorId: string,
  route: string,
  count: number
): void {
  const normalizedRoute = normalizeRoute(route)
  const threshold = count >= 10 ? '10+' : count >= 5 ? '5+' : '3+'

  repeatedErrors.labels(errorId, normalizedRoute, threshold).inc()

  logger.warn('[Metrics] Repeated error pattern detected', {
    errorId,
    route: normalizedRoute,
    count
  })
}

/**
 * Track error burst
 */
export function trackErrorBurst(
  route: string,
  burstSize: number
): void {
  const normalizedRoute = normalizeRoute(route)
  const sizeCategory = burstSize >= 100 ? '100+' : burstSize >= 50 ? '50+' : '10+'

  errorBursts.labels(normalizedRoute, sizeCategory).inc()

  logger.error('[Metrics] Error burst detected', {
    route: normalizedRoute,
    burstSize
  })
}

// ============================================================================
// Error Rate Calculation Helpers
// ============================================================================

/**
 * Calculate error rate percentage
 */
export function calculateErrorRate(
  errorCount: number,
  totalRequests: number
): number {
  if (totalRequests === 0) return 0
  return (errorCount / totalRequests) * 100
}

/**
 * Check if error rate exceeds threshold
 */
export function isErrorRateHigh(
  errorCount: number,
  totalRequests: number,
  threshold: number = 5 // 5% default threshold
): boolean {
  const rate = calculateErrorRate(errorCount, totalRequests)
  return rate > threshold
}

logger.info('[Metrics] Error rate metrics initialized')
