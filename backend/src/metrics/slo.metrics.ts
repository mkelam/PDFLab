/**
 * Service Level Objective (SLO) Tracking
 *
 * Tracks:
 * - Uptime SLO (99.9% target)
 * - Response time SLO (<200ms p95 target)
 * - Error rate SLO (<0.1% target)
 * - Conversion completion SLO (<5s for 20-page PDF)
 * - SLO violation events
 * - SLO burn rate (rate at which error budget is consumed)
 */

import { Gauge, Counter, Histogram } from 'prom-client'
import logger from '../config/logger'

// ============================================================================
// SLO Target Definitions
// ============================================================================

export const SLO_TARGETS = {
  // Uptime: 99.9% (43.2 minutes downtime per month)
  UPTIME_PERCENTAGE: 99.9,

  // Response Time: 95th percentile < 200ms
  RESPONSE_TIME_P95_MS: 200,

  // Error Rate: < 0.1% of requests
  ERROR_RATE_PERCENTAGE: 0.1,

  // Conversion Time: < 5s for 20-page PDF
  CONVERSION_TIME_20_PAGE_SECONDS: 5,

  // API Availability: 99.95%
  API_AVAILABILITY_PERCENTAGE: 99.95,

  // Database Query Time: < 100ms p95
  DB_QUERY_TIME_P95_MS: 100
} as const

// ============================================================================
// SLO Compliance Gauges
// ============================================================================

/**
 * Current SLO compliance (0-100%)
 */
export const sloCompliance = new Gauge({
  name: 'pdflab_slo_compliance_percentage',
  help: 'Current SLO compliance percentage',
  labelNames: ['slo_type', 'time_window'] // time_window: 1h, 24h, 7d, 30d
})

/**
 * Error budget remaining (percentage)
 */
export const sloErrorBudget = new Gauge({
  name: 'pdflab_slo_error_budget_percentage',
  help: 'Remaining error budget as percentage',
  labelNames: ['slo_type', 'time_window']
})

/**
 * Error budget burn rate (how fast we're consuming budget)
 */
export const sloErrorBudgetBurnRate = new Gauge({
  name: 'pdflab_slo_error_budget_burn_rate',
  help: 'Rate at which error budget is being consumed',
  labelNames: ['slo_type', 'time_window']
})

// ============================================================================
// SLO Violation Counters
// ============================================================================

/**
 * SLO violation events
 */
export const sloViolations = new Counter({
  name: 'pdflab_slo_violations_total',
  help: 'Total number of SLO violation events',
  labelNames: ['slo_type', 'severity', 'violation_type']
})

/**
 * SLO violation duration
 */
export const sloViolationDuration = new Histogram({
  name: 'pdflab_slo_violation_duration_seconds',
  help: 'Duration of SLO violations',
  labelNames: ['slo_type'],
  buckets: [10, 30, 60, 300, 600, 1800, 3600] // 10s to 1h
})

// ============================================================================
// Uptime SLO Metrics
// ============================================================================

/**
 * Service uptime (1 = up, 0 = down)
 */
export const serviceUptime = new Gauge({
  name: 'pdflab_service_uptime',
  help: 'Service uptime status (1=up, 0=down)',
  labelNames: ['service_name']
})

/**
 * Service uptime percentage
 */
export const serviceUptimePercentage = new Gauge({
  name: 'pdflab_service_uptime_percentage',
  help: 'Service uptime percentage over time window',
  labelNames: ['service_name', 'time_window']
})

/**
 * Downtime events
 */
export const downtimeEvents = new Counter({
  name: 'pdflab_downtime_events_total',
  help: 'Total number of downtime events',
  labelNames: ['service_name', 'downtime_reason']
})

// ============================================================================
// Response Time SLO Metrics
// ============================================================================

/**
 * Response time percentiles
 */
export const responseTimePercentiles = new Gauge({
  name: 'pdflab_response_time_percentile_ms',
  help: 'Response time at various percentiles',
  labelNames: ['route', 'method', 'percentile'] // percentile: p50, p75, p95, p99
})

/**
 * Response time SLO violations
 */
export const responseTimeSloViolations = new Counter({
  name: 'pdflab_response_time_slo_violations_total',
  help: 'Number of requests exceeding response time SLO',
  labelNames: ['route', 'method', 'threshold_ms']
})

// ============================================================================
// Error Rate SLO Metrics
// ============================================================================

/**
 * Current SLO error rate (errors per second)
 */
export const sloCurrentErrorRate = new Gauge({
  name: 'pdflab_slo_current_error_rate_per_second',
  help: 'Current SLO error rate in errors per second',
  labelNames: ['error_type'] // 4xx, 5xx
})

/**
 * SLO error rate percentage
 */
export const sloErrorRatePercentage = new Gauge({
  name: 'pdflab_error_rate_slo_percentage',
  help: 'Error rate as percentage of total requests for SLO tracking',
  labelNames: ['time_window', 'error_type']
})

/**
 * Error rate SLO violations
 */
export const errorRateSloViolations = new Counter({
  name: 'pdflab_error_rate_slo_violations_total',
  help: 'Number of time windows where error rate exceeded SLO',
  labelNames: ['error_type', 'threshold_percentage']
})

// ============================================================================
// Conversion Time SLO Metrics
// ============================================================================

/**
 * Conversion time percentiles
 */
export const conversionTimePercentiles = new Gauge({
  name: 'pdflab_conversion_time_percentile_seconds',
  help: 'Conversion time at various percentiles',
  labelNames: ['conversion_type', 'page_count_bucket', 'percentile']
})

/**
 * Conversion time SLO violations
 */
export const conversionTimeSloViolations = new Counter({
  name: 'pdflab_conversion_time_slo_violations_total',
  help: 'Number of conversions exceeding time SLO',
  labelNames: ['conversion_type', 'page_count_bucket', 'threshold_seconds']
})

// ============================================================================
// API Availability SLO Metrics
// ============================================================================

/**
 * API endpoint availability
 */
export const apiEndpointAvailability = new Gauge({
  name: 'pdflab_api_endpoint_availability_percentage',
  help: 'API endpoint availability percentage',
  labelNames: ['route', 'method', 'time_window']
})

/**
 * API availability SLO violations
 */
export const apiAvailabilitySloViolations = new Counter({
  name: 'pdflab_api_availability_slo_violations_total',
  help: 'Number of API availability SLO violations',
  labelNames: ['route', 'method']
})

// ============================================================================
// Database Query Time SLO Metrics
// ============================================================================

/**
 * Database query time percentiles
 */
export const dbQueryTimePercentiles = new Gauge({
  name: 'pdflab_db_query_time_percentile_ms',
  help: 'Database query time at various percentiles',
  labelNames: ['operation', 'model', 'percentile']
})

/**
 * Database query SLO violations
 */
export const dbQuerySloViolations = new Counter({
  name: 'pdflab_db_query_slo_violations_total',
  help: 'Number of database queries exceeding time SLO',
  labelNames: ['operation', 'model', 'threshold_ms']
})

// ============================================================================
// SLO Tracking Functions
// ============================================================================

/**
 * Update SLO compliance
 */
export function updateSloCompliance(
  sloType: 'uptime' | 'response_time' | 'error_rate' | 'conversion_time' | 'api_availability' | 'db_query_time',
  compliancePercentage: number,
  timeWindow: '1h' | '24h' | '7d' | '30d'
): void {
  sloCompliance.labels(sloType, timeWindow).set(compliancePercentage)

  // Calculate error budget (100 - target)
  let targetPercentage: number
  switch (sloType) {
    case 'uptime':
      targetPercentage = SLO_TARGETS.UPTIME_PERCENTAGE
      break
    case 'api_availability':
      targetPercentage = SLO_TARGETS.API_AVAILABILITY_PERCENTAGE
      break
    case 'error_rate':
      targetPercentage = 100 - SLO_TARGETS.ERROR_RATE_PERCENTAGE
      break
    default:
      targetPercentage = 99.9 // Default target
  }

  const errorBudgetTotal = 100 - targetPercentage
  const errorBudgetUsed = 100 - compliancePercentage
  const errorBudgetRemaining = ((errorBudgetTotal - errorBudgetUsed) / errorBudgetTotal) * 100

  sloErrorBudget.labels(sloType, timeWindow).set(Math.max(0, errorBudgetRemaining))

  logger.debug('[SLO] Compliance updated', {
    sloType,
    compliancePercentage,
    errorBudgetRemaining,
    timeWindow
  })
}

/**
 * Track SLO violation
 */
export function trackSloViolation(
  sloType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  violationType: string,
  durationSeconds?: number
): void {
  sloViolations.labels(sloType, severity, violationType).inc()

  if (durationSeconds) {
    sloViolationDuration.labels(sloType).observe(durationSeconds)
  }

  logger.error('[SLO] SLO violation detected', {
    sloType,
    severity,
    violationType,
    durationSeconds
  })
}

/**
 * Update error budget burn rate
 */
export function updateErrorBudgetBurnRate(
  sloType: string,
  burnRate: number,
  timeWindow: string
): void {
  sloErrorBudgetBurnRate.labels(sloType, timeWindow).set(burnRate)

  if (burnRate > 1) {
    logger.warn('[SLO] High error budget burn rate', {
      sloType,
      burnRate,
      timeWindow,
      message: `Burning through error budget ${burnRate.toFixed(2)}x faster than expected`
    })
  }
}

/**
 * Update service uptime
 */
export function updateServiceUptime(
  serviceName: string,
  isUp: boolean
): void {
  serviceUptime.labels(serviceName).set(isUp ? 1 : 0)

  if (!isUp) {
    logger.error('[SLO] Service down detected', { serviceName })
  }
}

/**
 * Track downtime event
 */
export function trackDowntimeEvent(
  serviceName: string,
  reason: string
): void {
  downtimeEvents.labels(serviceName, reason).inc()

  logger.error('[SLO] Downtime event tracked', {
    serviceName,
    reason
  })
}

/**
 * Update uptime percentage
 */
export function updateUptimePercentage(
  serviceName: string,
  uptimePercentage: number,
  timeWindow: string
): void {
  serviceUptimePercentage.labels(serviceName, timeWindow).set(uptimePercentage)

  // Check if below SLO
  if (uptimePercentage < SLO_TARGETS.UPTIME_PERCENTAGE) {
    trackSloViolation(
      'uptime',
      'high',
      'uptime_below_target',
      undefined
    )
  }
}

/**
 * Update response time percentile
 */
export function updateResponseTimePercentile(
  route: string,
  method: string,
  percentile: 'p50' | 'p75' | 'p95' | 'p99',
  timeMs: number
): void {
  responseTimePercentiles.labels(route, method, percentile).set(timeMs)

  // Check p95 against SLO
  if (percentile === 'p95' && timeMs > SLO_TARGETS.RESPONSE_TIME_P95_MS) {
    responseTimeSloViolations
      .labels(route, method, SLO_TARGETS.RESPONSE_TIME_P95_MS.toString())
      .inc()

    logger.warn('[SLO] Response time SLO violation', {
      route,
      method,
      p95: timeMs,
      target: SLO_TARGETS.RESPONSE_TIME_P95_MS
    })
  }
}

/**
 * Update SLO error rate
 */
export function updateSloErrorRatePercentage(
  errorType: '4xx' | '5xx' | 'all',
  percentage: number,
  timeWindow: string
): void {
  sloErrorRatePercentage.labels(timeWindow, errorType).set(percentage)

  // Check against SLO
  if (percentage > SLO_TARGETS.ERROR_RATE_PERCENTAGE) {
    errorRateSloViolations
      .labels(errorType, SLO_TARGETS.ERROR_RATE_PERCENTAGE.toString())
      .inc()

    trackSloViolation(
      'error_rate',
      'high',
      `${errorType}_error_rate_high`,
      undefined
    )
  }
}

/**
 * Update conversion time percentile
 */
export function updateConversionTimePercentile(
  conversionType: string,
  pageCountBucket: '1-10' | '11-20' | '21-50' | '51-100' | '100+',
  percentile: 'p50' | 'p75' | 'p95' | 'p99',
  timeSeconds: number
): void {
  conversionTimePercentiles.labels(conversionType, pageCountBucket, percentile).set(timeSeconds)

  // Check 20-page bucket p95 against SLO
  if (pageCountBucket === '11-20' && percentile === 'p95' && timeSeconds > SLO_TARGETS.CONVERSION_TIME_20_PAGE_SECONDS) {
    conversionTimeSloViolations
      .labels(conversionType, pageCountBucket, SLO_TARGETS.CONVERSION_TIME_20_PAGE_SECONDS.toString())
      .inc()

    logger.warn('[SLO] Conversion time SLO violation', {
      conversionType,
      pageCountBucket,
      p95: timeSeconds,
      target: SLO_TARGETS.CONVERSION_TIME_20_PAGE_SECONDS
    })
  }
}

/**
 * Update API endpoint availability
 */
export function updateApiAvailability(
  route: string,
  method: string,
  availabilityPercentage: number,
  timeWindow: string
): void {
  apiEndpointAvailability.labels(route, method, timeWindow).set(availabilityPercentage)

  // Check against SLO
  if (availabilityPercentage < SLO_TARGETS.API_AVAILABILITY_PERCENTAGE) {
    apiAvailabilitySloViolations.labels(route, method).inc()

    trackSloViolation(
      'api_availability',
      'high',
      'endpoint_availability_low',
      undefined
    )
  }
}

/**
 * Update database query time percentile
 */
export function updateDbQueryTimePercentile(
  operation: 'select' | 'insert' | 'update' | 'delete',
  model: string,
  percentile: 'p50' | 'p75' | 'p95' | 'p99',
  timeMs: number
): void {
  dbQueryTimePercentiles.labels(operation, model, percentile).set(timeMs)

  // Check p95 against SLO
  if (percentile === 'p95' && timeMs > SLO_TARGETS.DB_QUERY_TIME_P95_MS) {
    dbQuerySloViolations
      .labels(operation, model, SLO_TARGETS.DB_QUERY_TIME_P95_MS.toString())
      .inc()

    logger.warn('[SLO] Database query time SLO violation', {
      operation,
      model,
      p95: timeMs,
      target: SLO_TARGETS.DB_QUERY_TIME_P95_MS
    })
  }
}

// ============================================================================
// SLO Calculation Helpers
// ============================================================================

/**
 * Calculate error budget burn rate
 * Formula: (actual error rate / SLO error rate) / (time window / full SLO period)
 */
export function calculateBurnRate(
  actualErrorRate: number,
  sloErrorRate: number,
  timeWindowHours: number,
  sloPeriodHours: number = 720 // 30 days default
): number {
  const normalizedActual = actualErrorRate / sloErrorRate
  const normalizedTime = timeWindowHours / sloPeriodHours
  return normalizedActual / normalizedTime
}

/**
 * Calculate SLO compliance percentage
 */
export function calculateSloCompliance(
  successfulRequests: number,
  totalRequests: number
): number {
  if (totalRequests === 0) return 100
  return (successfulRequests / totalRequests) * 100
}

/**
 * Check if SLO is at risk
 */
export function isSloAtRisk(
  currentCompliance: number,
  targetCompliance: number,
  errorBudgetRemaining: number
): {
  atRisk: boolean
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  message: string
} {
  if (errorBudgetRemaining <= 0) {
    return {
      atRisk: true,
      severity: 'critical',
      message: 'Error budget exhausted - SLO violated'
    }
  }

  if (errorBudgetRemaining < 10) {
    return {
      atRisk: true,
      severity: 'high',
      message: `Only ${errorBudgetRemaining.toFixed(1)}% error budget remaining`
    }
  }

  if (errorBudgetRemaining < 25) {
    return {
      atRisk: true,
      severity: 'medium',
      message: `${errorBudgetRemaining.toFixed(1)}% error budget remaining`
    }
  }

  if (errorBudgetRemaining < 50) {
    return {
      atRisk: true,
      severity: 'low',
      message: `${errorBudgetRemaining.toFixed(1)}% error budget remaining`
    }
  }

  return {
    atRisk: false,
    severity: 'none',
    message: 'SLO healthy'
  }
}

logger.info('[Metrics] SLO tracking metrics initialized', { targets: SLO_TARGETS })
