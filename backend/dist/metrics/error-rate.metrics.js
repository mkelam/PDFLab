"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorBursts = exports.repeatedErrors = exports.externalApiErrors = exports.databaseErrors = exports.conversionProcessingErrors = exports.fileUploadErrors = exports.rateLimitErrors = exports.validationErrors = exports.authErrors = exports.errorRatePercentage = exports.currentErrorRate = exports.errorResponseDuration = exports.http5xxErrors = exports.http4xxErrors = exports.httpErrors = void 0;
exports.trackHttpError = trackHttpError;
exports.trackErrorDuration = trackErrorDuration;
exports.trackAuthError = trackAuthError;
exports.trackValidationError = trackValidationError;
exports.trackRateLimitError = trackRateLimitError;
exports.trackFileUploadError = trackFileUploadError;
exports.trackConversionError = trackConversionError;
exports.trackDatabaseError = trackDatabaseError;
exports.trackExternalApiError = trackExternalApiError;
exports.updateErrorRate = updateErrorRate;
exports.updateErrorRatePercentage = updateErrorRatePercentage;
exports.trackRepeatedError = trackRepeatedError;
exports.trackErrorBurst = trackErrorBurst;
exports.calculateErrorRate = calculateErrorRate;
exports.isErrorRateHigh = isErrorRateHigh;
const prom_client_1 = require("prom-client");
const logger_1 = __importDefault(require("../config/logger"));
// ============================================================================
// HTTP Error Counters
// ============================================================================
/**
 * Track HTTP errors by status code, endpoint, and method
 */
exports.httpErrors = new prom_client_1.Counter({
    name: 'pdflab_http_errors_total',
    help: 'Total number of HTTP errors by endpoint',
    labelNames: ['method', 'route', 'status_code', 'error_type', 'user_type']
});
/**
 * Track 4xx client errors specifically
 */
exports.http4xxErrors = new prom_client_1.Counter({
    name: 'pdflab_http_4xx_errors_total',
    help: 'Total number of 4xx client errors',
    labelNames: ['method', 'route', 'status_code', 'error_reason']
});
/**
 * Track 5xx server errors specifically
 */
exports.http5xxErrors = new prom_client_1.Counter({
    name: 'pdflab_http_5xx_errors_total',
    help: 'Total number of 5xx server errors',
    labelNames: ['method', 'route', 'status_code', 'error_reason', 'error_id']
});
/**
 * Track error response duration
 */
exports.errorResponseDuration = new prom_client_1.Histogram({
    name: 'pdflab_error_response_duration_seconds',
    help: 'Duration of error responses',
    labelNames: ['status_code', 'route'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10] // 10ms to 10s
});
// ============================================================================
// Error Rate Gauges
// ============================================================================
/**
 * Current error rate (errors per second) by endpoint
 */
exports.currentErrorRate = new prom_client_1.Gauge({
    name: 'pdflab_current_error_rate',
    help: 'Current error rate per second by endpoint',
    labelNames: ['route', 'error_type']
});
/**
 * Error rate percentage (errors / total requests * 100)
 */
exports.errorRatePercentage = new prom_client_1.Gauge({
    name: 'pdflab_error_rate_percentage',
    help: 'Error rate as percentage of total requests',
    labelNames: ['route', 'status_range'] // 4xx, 5xx
});
// ============================================================================
// Specific Error Types
// ============================================================================
/**
 * Authentication/Authorization errors
 */
exports.authErrors = new prom_client_1.Counter({
    name: 'pdflab_auth_errors_total',
    help: 'Total authentication and authorization errors',
    labelNames: ['error_type', 'route', 'user_type']
});
/**
 * Validation errors (bad request data)
 */
exports.validationErrors = new prom_client_1.Counter({
    name: 'pdflab_validation_errors_total',
    help: 'Total validation errors',
    labelNames: ['route', 'field', 'validation_type']
});
/**
 * Rate limit errors
 */
exports.rateLimitErrors = new prom_client_1.Counter({
    name: 'pdflab_rate_limit_errors_total',
    help: 'Total rate limit exceeded errors',
    labelNames: ['route', 'user_type', 'limit_type']
});
/**
 * File upload errors
 */
exports.fileUploadErrors = new prom_client_1.Counter({
    name: 'pdflab_file_upload_errors_total',
    help: 'Total file upload errors',
    labelNames: ['error_reason', 'file_type', 'user_type']
});
/**
 * Conversion processing errors
 */
exports.conversionProcessingErrors = new prom_client_1.Counter({
    name: 'pdflab_conversion_processing_errors_total',
    help: 'Total conversion processing errors',
    labelNames: ['conversion_type', 'error_reason', 'stage']
});
/**
 * Database errors
 */
exports.databaseErrors = new prom_client_1.Counter({
    name: 'pdflab_database_errors_total',
    help: 'Total database errors',
    labelNames: ['operation', 'model', 'error_type']
});
/**
 * External API errors (CloudConvert, etc.)
 */
exports.externalApiErrors = new prom_client_1.Counter({
    name: 'pdflab_external_api_errors_total',
    help: 'Total external API errors',
    labelNames: ['api_name', 'endpoint', 'error_type', 'circuit_breaker_state']
});
// ============================================================================
// Error Pattern Detection
// ============================================================================
/**
 * Track repeated errors (same error occurring multiple times)
 */
exports.repeatedErrors = new prom_client_1.Counter({
    name: 'pdflab_repeated_errors_total',
    help: 'Errors that occur repeatedly in short time windows',
    labelNames: ['error_id', 'route', 'count_threshold']
});
/**
 * Error bursts (sudden spike in errors)
 */
exports.errorBursts = new prom_client_1.Counter({
    name: 'pdflab_error_bursts_total',
    help: 'Sudden spikes in error rate',
    labelNames: ['route', 'burst_size']
});
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get error type from status code
 */
function getErrorType(statusCode) {
    if (statusCode >= 400 && statusCode < 500)
        return '4xx_client_error';
    if (statusCode >= 500 && statusCode < 600)
        return '5xx_server_error';
    return 'unknown';
}
/**
 * Get status range for grouping
 */
function getStatusRange(statusCode) {
    if (statusCode >= 400 && statusCode < 500)
        return '4xx';
    if (statusCode >= 500 && statusCode < 600)
        return '5xx';
    return 'other';
}
/**
 * Normalize route for consistent metrics
 * Converts /api/conversions/123 to /api/conversions/:id
 */
function normalizeRoute(route) {
    return route
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
        .replace(/\/\d+/g, '/:id') // Numeric IDs
        .replace(/\/[a-f0-9]{24}/gi, '/:id'); // MongoDB IDs
}
/**
 * Get user type from request
 */
function getUserType(user, guestSession) {
    if (guestSession)
        return 'guest';
    if (!user)
        return 'anonymous';
    return user.plan || 'free';
}
// ============================================================================
// Error Tracking Functions
// ============================================================================
/**
 * Track general HTTP error
 */
function trackHttpError(method, route, statusCode, errorReason, user, guestSession) {
    const normalizedRoute = normalizeRoute(route);
    const errorType = getErrorType(statusCode);
    const userType = getUserType(user, guestSession);
    exports.httpErrors.labels(method, normalizedRoute, statusCode.toString(), errorType, userType).inc();
    // Track 4xx vs 5xx specifically
    if (statusCode >= 400 && statusCode < 500) {
        exports.http4xxErrors.labels(method, normalizedRoute, statusCode.toString(), errorReason).inc();
    }
    else if (statusCode >= 500 && statusCode < 600) {
        const errorId = `err_${Date.now()}`;
        exports.http5xxErrors.labels(method, normalizedRoute, statusCode.toString(), errorReason, errorId).inc();
    }
    logger_1.default.debug('[Metrics] HTTP error tracked', {
        method,
        route: normalizedRoute,
        statusCode,
        errorReason,
        userType
    });
}
/**
 * Track error response duration
 */
function trackErrorDuration(route, statusCode, durationSeconds) {
    const normalizedRoute = normalizeRoute(route);
    exports.errorResponseDuration.labels(statusCode.toString(), normalizedRoute).observe(durationSeconds);
}
/**
 * Track authentication error
 */
function trackAuthError(errorType, route, user, guestSession) {
    const normalizedRoute = normalizeRoute(route);
    const userType = getUserType(user, guestSession);
    exports.authErrors.labels(errorType, normalizedRoute, userType).inc();
    logger_1.default.warn('[Metrics] Auth error tracked', {
        errorType,
        route: normalizedRoute,
        userType
    });
}
/**
 * Track validation error
 */
function trackValidationError(route, field, validationType) {
    const normalizedRoute = normalizeRoute(route);
    exports.validationErrors.labels(normalizedRoute, field, validationType).inc();
    logger_1.default.debug('[Metrics] Validation error tracked', {
        route: normalizedRoute,
        field,
        validationType
    });
}
/**
 * Track rate limit error
 */
function trackRateLimitError(route, limitType, user, guestSession) {
    const normalizedRoute = normalizeRoute(route);
    const userType = getUserType(user, guestSession);
    exports.rateLimitErrors.labels(normalizedRoute, userType, limitType).inc();
    logger_1.default.warn('[Metrics] Rate limit error tracked', {
        route: normalizedRoute,
        limitType,
        userType
    });
}
/**
 * Track file upload error
 */
function trackFileUploadError(errorReason, fileType, user, guestSession) {
    const userType = getUserType(user, guestSession);
    exports.fileUploadErrors.labels(errorReason, fileType, userType).inc();
    logger_1.default.error('[Metrics] File upload error tracked', {
        errorReason,
        fileType,
        userType
    });
}
/**
 * Track conversion processing error
 */
function trackConversionError(conversionType, errorReason, stage) {
    exports.conversionProcessingErrors.labels(conversionType, errorReason, stage).inc();
    logger_1.default.error('[Metrics] Conversion processing error tracked', {
        conversionType,
        errorReason,
        stage
    });
}
/**
 * Track database error
 */
function trackDatabaseError(operation, model, errorType) {
    exports.databaseErrors.labels(operation, model, errorType).inc();
    logger_1.default.error('[Metrics] Database error tracked', {
        operation,
        model,
        errorType
    });
}
/**
 * Track external API error
 */
function trackExternalApiError(apiName, endpoint, errorType, circuitBreakerState) {
    exports.externalApiErrors.labels(apiName, endpoint, errorType, circuitBreakerState).inc();
    logger_1.default.error('[Metrics] External API error tracked', {
        apiName,
        endpoint,
        errorType,
        circuitBreakerState
    });
}
/**
 * Update current error rate gauge
 */
function updateErrorRate(route, errorType, errorsPerSecond) {
    const normalizedRoute = normalizeRoute(route);
    exports.currentErrorRate.labels(normalizedRoute, errorType).set(errorsPerSecond);
}
/**
 * Update error rate percentage gauge
 */
function updateErrorRatePercentage(route, statusRange, percentage) {
    const normalizedRoute = normalizeRoute(route);
    exports.errorRatePercentage.labels(normalizedRoute, statusRange).set(percentage);
}
/**
 * Track repeated error pattern
 */
function trackRepeatedError(errorId, route, count) {
    const normalizedRoute = normalizeRoute(route);
    const threshold = count >= 10 ? '10+' : count >= 5 ? '5+' : '3+';
    exports.repeatedErrors.labels(errorId, normalizedRoute, threshold).inc();
    logger_1.default.warn('[Metrics] Repeated error pattern detected', {
        errorId,
        route: normalizedRoute,
        count
    });
}
/**
 * Track error burst
 */
function trackErrorBurst(route, burstSize) {
    const normalizedRoute = normalizeRoute(route);
    const sizeCategory = burstSize >= 100 ? '100+' : burstSize >= 50 ? '50+' : '10+';
    exports.errorBursts.labels(normalizedRoute, sizeCategory).inc();
    logger_1.default.error('[Metrics] Error burst detected', {
        route: normalizedRoute,
        burstSize
    });
}
// ============================================================================
// Error Rate Calculation Helpers
// ============================================================================
/**
 * Calculate error rate percentage
 */
function calculateErrorRate(errorCount, totalRequests) {
    if (totalRequests === 0)
        return 0;
    return (errorCount / totalRequests) * 100;
}
/**
 * Check if error rate exceeds threshold
 */
function isErrorRateHigh(errorCount, totalRequests, threshold = 5 // 5% default threshold
) {
    const rate = calculateErrorRate(errorCount, totalRequests);
    return rate > threshold;
}
logger_1.default.info('[Metrics] Error rate metrics initialized');
//# sourceMappingURL=error-rate.metrics.js.map