/**
 * Conversion Funnel Metrics
 *
 * Tracks user journey through the conversion flow:
 * 1. Upload initiated
 * 2. File validated
 * 3. Job queued
 * 4. Processing started
 * 5. Processing completed
 * 6. Download initiated
 * 7. Download completed
 *
 * Measures drop-off rates at each stage to identify bottlenecks
 */

import { Counter, Histogram, Gauge } from 'prom-client'
import logger from '../config/logger'

// ============================================================================
// Conversion Funnel Stage Counters
// ============================================================================

/**
 * Track each stage of the conversion funnel
 */
export const conversionFunnelStage = new Counter({
  name: 'pdflab_conversion_funnel_stage_total',
  help: 'Number of conversions reaching each funnel stage',
  labelNames: ['stage', 'user_type', 'conversion_type', 'plan']
})

/**
 * Track funnel drop-offs (failures at each stage)
 */
export const conversionFunnelDropoff = new Counter({
  name: 'pdflab_conversion_funnel_dropoff_total',
  help: 'Number of conversions failing at each funnel stage',
  labelNames: ['stage', 'reason', 'user_type', 'conversion_type', 'plan']
})

/**
 * Time spent in each funnel stage
 */
export const conversionFunnelDuration = new Histogram({
  name: 'pdflab_conversion_funnel_stage_duration_seconds',
  help: 'Time spent in each conversion funnel stage',
  labelNames: ['stage', 'user_type', 'conversion_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300] // 0.1s to 5min
})

/**
 * Current active conversions in each stage
 */
export const conversionFunnelActive = new Gauge({
  name: 'pdflab_conversion_funnel_active_count',
  help: 'Number of active conversions in each funnel stage',
  labelNames: ['stage', 'user_type', 'conversion_type']
})

// ============================================================================
// Conversion Success/Failure Metrics
// ============================================================================

/**
 * Overall conversion success rate
 */
export const conversionSuccess = new Counter({
  name: 'pdflab_conversion_success_total',
  help: 'Total number of successful conversions',
  labelNames: ['conversion_type', 'user_type', 'plan', 'output_format']
})

/**
 * Overall conversion failure rate
 */
export const conversionFailure = new Counter({
  name: 'pdflab_conversion_failure_total',
  help: 'Total number of failed conversions',
  labelNames: ['conversion_type', 'user_type', 'plan', 'failure_reason', 'error_code']
})

/**
 * End-to-end conversion duration (upload to download)
 */
export const conversionE2EDuration = new Histogram({
  name: 'pdflab_conversion_e2e_duration_seconds',
  help: 'End-to-end conversion duration from upload to download',
  labelNames: ['conversion_type', 'user_type', 'file_size_bucket'],
  buckets: [1, 3, 5, 10, 20, 30, 60, 120, 300, 600] // 1s to 10min
})

// ============================================================================
// File Size Distribution
// ============================================================================

/**
 * Distribution of uploaded file sizes
 */
export const uploadedFileSizes = new Histogram({
  name: 'pdflab_uploaded_file_size_bytes',
  help: 'Distribution of uploaded file sizes',
  labelNames: ['conversion_type', 'user_type', 'plan'],
  buckets: [
    1024,           // 1 KB
    10240,          // 10 KB
    102400,         // 100 KB
    1048576,        // 1 MB
    5242880,        // 5 MB
    10485760,       // 10 MB
    52428800,       // 50 MB
    104857600,      // 100 MB
    524288000       // 500 MB
  ]
})

// ============================================================================
// Conversion Format Popularity
// ============================================================================

/**
 * Track which conversion formats are most popular
 */
export const conversionFormatPopularity = new Counter({
  name: 'pdflab_conversion_format_total',
  help: 'Number of conversions by format type',
  labelNames: ['source_format', 'target_format', 'user_type', 'plan']
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get file size bucket for metrics
 */
function getFileSizeBucket(sizeBytes: number): string {
  if (sizeBytes < 1024) return '0-1KB'
  if (sizeBytes < 102400) return '1KB-100KB'
  if (sizeBytes < 1048576) return '100KB-1MB'
  if (sizeBytes < 5242880) return '1MB-5MB'
  if (sizeBytes < 10485760) return '5MB-10MB'
  if (sizeBytes < 52428800) return '10MB-50MB'
  if (sizeBytes < 104857600) return '50MB-100MB'
  return '100MB+'
}

/**
 * Get user type (guest, free, pro, enterprise)
 */
function getUserType(user?: any, guestSession?: any): string {
  if (guestSession) return 'guest'
  if (!user) return 'anonymous'
  return user.plan || 'free'
}

// ============================================================================
// Funnel Stage Tracking
// ============================================================================

export enum FunnelStage {
  UPLOAD_INITIATED = 'upload_initiated',
  FILE_VALIDATED = 'file_validated',
  JOB_QUEUED = 'job_queued',
  PROCESSING_STARTED = 'processing_started',
  PROCESSING_COMPLETED = 'processing_completed',
  DOWNLOAD_INITIATED = 'download_initiated',
  DOWNLOAD_COMPLETED = 'download_completed'
}

/**
 * Track funnel stage progression
 */
export function trackFunnelStage(
  stage: FunnelStage,
  conversionType: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const plan = user?.plan || 'guest'

  conversionFunnelStage.labels(stage, userType, conversionType, plan).inc()

  logger.debug('[Metrics] Funnel stage tracked', {
    stage,
    userType,
    conversionType,
    plan
  })
}

/**
 * Track funnel drop-off (failure)
 */
export function trackFunnelDropoff(
  stage: FunnelStage,
  reason: string,
  conversionType: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const plan = user?.plan || 'guest'

  conversionFunnelDropoff.labels(stage, reason, userType, conversionType, plan).inc()

  logger.warn('[Metrics] Funnel drop-off tracked', {
    stage,
    reason,
    userType,
    conversionType,
    plan
  })
}

/**
 * Track funnel stage duration
 */
export function trackFunnelDuration(
  stage: FunnelStage,
  durationSeconds: number,
  conversionType: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)

  conversionFunnelDuration.labels(stage, userType, conversionType).observe(durationSeconds)

  logger.debug('[Metrics] Funnel duration tracked', {
    stage,
    durationSeconds,
    userType,
    conversionType
  })
}

/**
 * Update active conversions gauge
 */
export function updateActiveFunnelStage(
  stage: FunnelStage,
  delta: number,
  conversionType: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)

  if (delta > 0) {
    conversionFunnelActive.labels(stage, userType, conversionType).inc(delta)
  } else {
    conversionFunnelActive.labels(stage, userType, conversionType).dec(Math.abs(delta))
  }
}

// ============================================================================
// Conversion Success/Failure Tracking
// ============================================================================

/**
 * Track successful conversion
 */
export function trackConversionSuccess(
  conversionType: string,
  outputFormat: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const plan = user?.plan || 'guest'

  conversionSuccess.labels(conversionType, userType, plan, outputFormat).inc()

  logger.info('[Metrics] Conversion success tracked', {
    conversionType,
    outputFormat,
    userType,
    plan
  })
}

/**
 * Track failed conversion
 */
export function trackConversionFailure(
  conversionType: string,
  failureReason: string,
  errorCode: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const plan = user?.plan || 'guest'

  conversionFailure.labels(conversionType, userType, plan, failureReason, errorCode).inc()

  logger.error('[Metrics] Conversion failure tracked', {
    conversionType,
    failureReason,
    errorCode,
    userType,
    plan
  })
}

/**
 * Track end-to-end conversion duration
 */
export function trackE2EDuration(
  conversionType: string,
  durationSeconds: number,
  fileSizeBytes: number,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const fileSizeBucket = getFileSizeBucket(fileSizeBytes)

  conversionE2EDuration.labels(conversionType, userType, fileSizeBucket).observe(durationSeconds)

  logger.info('[Metrics] E2E conversion duration tracked', {
    conversionType,
    durationSeconds,
    fileSizeBucket,
    userType
  })
}

// ============================================================================
// File Size Tracking
// ============================================================================

/**
 * Track uploaded file size
 */
export function trackUploadedFileSize(
  conversionType: string,
  fileSizeBytes: number,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const plan = user?.plan || 'guest'

  uploadedFileSizes.labels(conversionType, userType, plan).observe(fileSizeBytes)

  logger.debug('[Metrics] File size tracked', {
    conversionType,
    fileSizeBytes,
    userType,
    plan
  })
}

// ============================================================================
// Format Popularity Tracking
// ============================================================================

/**
 * Track conversion format popularity
 */
export function trackFormatPopularity(
  sourceFormat: string,
  targetFormat: string,
  user?: any,
  guestSession?: any
): void {
  const userType = getUserType(user, guestSession)
  const plan = user?.plan || 'guest'

  conversionFormatPopularity.labels(sourceFormat, targetFormat, userType, plan).inc()

  logger.debug('[Metrics] Format popularity tracked', {
    sourceFormat,
    targetFormat,
    userType,
    plan
  })
}

// ============================================================================
// Funnel Analysis Helper
// ============================================================================

/**
 * Calculate funnel drop-off rate between two stages
 * This is typically done in Grafana queries, but provided here for reference
 */
export function calculateDropoffRate(
  stage1Count: number,
  stage2Count: number
): number {
  if (stage1Count === 0) return 0
  return ((stage1Count - stage2Count) / stage1Count) * 100
}

/**
 * Get funnel completion rate
 */
export function calculateCompletionRate(
  initiatedCount: number,
  completedCount: number
): number {
  if (initiatedCount === 0) return 0
  return (completedCount / initiatedCount) * 100
}

logger.info('[Metrics] Conversion funnel metrics initialized')
