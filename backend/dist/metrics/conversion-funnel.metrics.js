"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelStage = exports.conversionFormatPopularity = exports.uploadedFileSizes = exports.conversionE2EDuration = exports.conversionFailure = exports.conversionSuccess = exports.conversionFunnelActive = exports.conversionFunnelDuration = exports.conversionFunnelDropoff = exports.conversionFunnelStage = void 0;
exports.trackFunnelStage = trackFunnelStage;
exports.trackFunnelDropoff = trackFunnelDropoff;
exports.trackFunnelDuration = trackFunnelDuration;
exports.updateActiveFunnelStage = updateActiveFunnelStage;
exports.trackConversionSuccess = trackConversionSuccess;
exports.trackConversionFailure = trackConversionFailure;
exports.trackE2EDuration = trackE2EDuration;
exports.trackUploadedFileSize = trackUploadedFileSize;
exports.trackFormatPopularity = trackFormatPopularity;
exports.calculateDropoffRate = calculateDropoffRate;
exports.calculateCompletionRate = calculateCompletionRate;
const prom_client_1 = require("prom-client");
const logger_1 = __importDefault(require("../config/logger"));
// ============================================================================
// Conversion Funnel Stage Counters
// ============================================================================
/**
 * Track each stage of the conversion funnel
 */
exports.conversionFunnelStage = new prom_client_1.Counter({
    name: 'pdflab_conversion_funnel_stage_total',
    help: 'Number of conversions reaching each funnel stage',
    labelNames: ['stage', 'user_type', 'conversion_type', 'plan']
});
/**
 * Track funnel drop-offs (failures at each stage)
 */
exports.conversionFunnelDropoff = new prom_client_1.Counter({
    name: 'pdflab_conversion_funnel_dropoff_total',
    help: 'Number of conversions failing at each funnel stage',
    labelNames: ['stage', 'reason', 'user_type', 'conversion_type', 'plan']
});
/**
 * Time spent in each funnel stage
 */
exports.conversionFunnelDuration = new prom_client_1.Histogram({
    name: 'pdflab_conversion_funnel_stage_duration_seconds',
    help: 'Time spent in each conversion funnel stage',
    labelNames: ['stage', 'user_type', 'conversion_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300] // 0.1s to 5min
});
/**
 * Current active conversions in each stage
 */
exports.conversionFunnelActive = new prom_client_1.Gauge({
    name: 'pdflab_conversion_funnel_active_count',
    help: 'Number of active conversions in each funnel stage',
    labelNames: ['stage', 'user_type', 'conversion_type']
});
// ============================================================================
// Conversion Success/Failure Metrics
// ============================================================================
/**
 * Overall conversion success rate
 */
exports.conversionSuccess = new prom_client_1.Counter({
    name: 'pdflab_conversion_success_total',
    help: 'Total number of successful conversions',
    labelNames: ['conversion_type', 'user_type', 'plan', 'output_format']
});
/**
 * Overall conversion failure rate
 */
exports.conversionFailure = new prom_client_1.Counter({
    name: 'pdflab_conversion_failure_total',
    help: 'Total number of failed conversions',
    labelNames: ['conversion_type', 'user_type', 'plan', 'failure_reason', 'error_code']
});
/**
 * End-to-end conversion duration (upload to download)
 */
exports.conversionE2EDuration = new prom_client_1.Histogram({
    name: 'pdflab_conversion_e2e_duration_seconds',
    help: 'End-to-end conversion duration from upload to download',
    labelNames: ['conversion_type', 'user_type', 'file_size_bucket'],
    buckets: [1, 3, 5, 10, 20, 30, 60, 120, 300, 600] // 1s to 10min
});
// ============================================================================
// File Size Distribution
// ============================================================================
/**
 * Distribution of uploaded file sizes
 */
exports.uploadedFileSizes = new prom_client_1.Histogram({
    name: 'pdflab_uploaded_file_size_bytes',
    help: 'Distribution of uploaded file sizes',
    labelNames: ['conversion_type', 'user_type', 'plan'],
    buckets: [
        1024, // 1 KB
        10240, // 10 KB
        102400, // 100 KB
        1048576, // 1 MB
        5242880, // 5 MB
        10485760, // 10 MB
        52428800, // 50 MB
        104857600, // 100 MB
        524288000 // 500 MB
    ]
});
// ============================================================================
// Conversion Format Popularity
// ============================================================================
/**
 * Track which conversion formats are most popular
 */
exports.conversionFormatPopularity = new prom_client_1.Counter({
    name: 'pdflab_conversion_format_total',
    help: 'Number of conversions by format type',
    labelNames: ['source_format', 'target_format', 'user_type', 'plan']
});
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get file size bucket for metrics
 */
function getFileSizeBucket(sizeBytes) {
    if (sizeBytes < 1024)
        return '0-1KB';
    if (sizeBytes < 102400)
        return '1KB-100KB';
    if (sizeBytes < 1048576)
        return '100KB-1MB';
    if (sizeBytes < 5242880)
        return '1MB-5MB';
    if (sizeBytes < 10485760)
        return '5MB-10MB';
    if (sizeBytes < 52428800)
        return '10MB-50MB';
    if (sizeBytes < 104857600)
        return '50MB-100MB';
    return '100MB+';
}
/**
 * Get user type (guest, free, pro, enterprise)
 */
function getUserType(user, guestSession) {
    if (guestSession)
        return 'guest';
    if (!user)
        return 'anonymous';
    return user.plan || 'free';
}
// ============================================================================
// Funnel Stage Tracking
// ============================================================================
var FunnelStage;
(function (FunnelStage) {
    FunnelStage["UPLOAD_INITIATED"] = "upload_initiated";
    FunnelStage["FILE_VALIDATED"] = "file_validated";
    FunnelStage["JOB_QUEUED"] = "job_queued";
    FunnelStage["PROCESSING_STARTED"] = "processing_started";
    FunnelStage["PROCESSING_COMPLETED"] = "processing_completed";
    FunnelStage["DOWNLOAD_INITIATED"] = "download_initiated";
    FunnelStage["DOWNLOAD_COMPLETED"] = "download_completed";
})(FunnelStage || (exports.FunnelStage = FunnelStage = {}));
/**
 * Track funnel stage progression
 */
function trackFunnelStage(stage, conversionType, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const plan = user?.plan || 'guest';
    exports.conversionFunnelStage.labels(stage, userType, conversionType, plan).inc();
    logger_1.default.debug('[Metrics] Funnel stage tracked', {
        stage,
        userType,
        conversionType,
        plan
    });
}
/**
 * Track funnel drop-off (failure)
 */
function trackFunnelDropoff(stage, reason, conversionType, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const plan = user?.plan || 'guest';
    exports.conversionFunnelDropoff.labels(stage, reason, userType, conversionType, plan).inc();
    logger_1.default.warn('[Metrics] Funnel drop-off tracked', {
        stage,
        reason,
        userType,
        conversionType,
        plan
    });
}
/**
 * Track funnel stage duration
 */
function trackFunnelDuration(stage, durationSeconds, conversionType, user, guestSession) {
    const userType = getUserType(user, guestSession);
    exports.conversionFunnelDuration.labels(stage, userType, conversionType).observe(durationSeconds);
    logger_1.default.debug('[Metrics] Funnel duration tracked', {
        stage,
        durationSeconds,
        userType,
        conversionType
    });
}
/**
 * Update active conversions gauge
 */
function updateActiveFunnelStage(stage, delta, conversionType, user, guestSession) {
    const userType = getUserType(user, guestSession);
    if (delta > 0) {
        exports.conversionFunnelActive.labels(stage, userType, conversionType).inc(delta);
    }
    else {
        exports.conversionFunnelActive.labels(stage, userType, conversionType).dec(Math.abs(delta));
    }
}
// ============================================================================
// Conversion Success/Failure Tracking
// ============================================================================
/**
 * Track successful conversion
 */
function trackConversionSuccess(conversionType, outputFormat, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const plan = user?.plan || 'guest';
    exports.conversionSuccess.labels(conversionType, userType, plan, outputFormat).inc();
    logger_1.default.info('[Metrics] Conversion success tracked', {
        conversionType,
        outputFormat,
        userType,
        plan
    });
}
/**
 * Track failed conversion
 */
function trackConversionFailure(conversionType, failureReason, errorCode, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const plan = user?.plan || 'guest';
    exports.conversionFailure.labels(conversionType, userType, plan, failureReason, errorCode).inc();
    logger_1.default.error('[Metrics] Conversion failure tracked', {
        conversionType,
        failureReason,
        errorCode,
        userType,
        plan
    });
}
/**
 * Track end-to-end conversion duration
 */
function trackE2EDuration(conversionType, durationSeconds, fileSizeBytes, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const fileSizeBucket = getFileSizeBucket(fileSizeBytes);
    exports.conversionE2EDuration.labels(conversionType, userType, fileSizeBucket).observe(durationSeconds);
    logger_1.default.info('[Metrics] E2E conversion duration tracked', {
        conversionType,
        durationSeconds,
        fileSizeBucket,
        userType
    });
}
// ============================================================================
// File Size Tracking
// ============================================================================
/**
 * Track uploaded file size
 */
function trackUploadedFileSize(conversionType, fileSizeBytes, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const plan = user?.plan || 'guest';
    exports.uploadedFileSizes.labels(conversionType, userType, plan).observe(fileSizeBytes);
    logger_1.default.debug('[Metrics] File size tracked', {
        conversionType,
        fileSizeBytes,
        userType,
        plan
    });
}
// ============================================================================
// Format Popularity Tracking
// ============================================================================
/**
 * Track conversion format popularity
 */
function trackFormatPopularity(sourceFormat, targetFormat, user, guestSession) {
    const userType = getUserType(user, guestSession);
    const plan = user?.plan || 'guest';
    exports.conversionFormatPopularity.labels(sourceFormat, targetFormat, userType, plan).inc();
    logger_1.default.debug('[Metrics] Format popularity tracked', {
        sourceFormat,
        targetFormat,
        userType,
        plan
    });
}
// ============================================================================
// Funnel Analysis Helper
// ============================================================================
/**
 * Calculate funnel drop-off rate between two stages
 * This is typically done in Grafana queries, but provided here for reference
 */
function calculateDropoffRate(stage1Count, stage2Count) {
    if (stage1Count === 0)
        return 0;
    return ((stage1Count - stage2Count) / stage1Count) * 100;
}
/**
 * Get funnel completion rate
 */
function calculateCompletionRate(initiatedCount, completedCount) {
    if (initiatedCount === 0)
        return 0;
    return (completedCount / initiatedCount) * 100;
}
logger_1.default.info('[Metrics] Conversion funnel metrics initialized');
//# sourceMappingURL=conversion-funnel.metrics.js.map