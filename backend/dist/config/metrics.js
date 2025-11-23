"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakerCalls = exports.circuitBreakerState = exports.redisCommandDuration = exports.databaseConnections = exports.databaseQueryDuration = exports.storageUsed = exports.cloudconvertErrors = exports.errorTotal = exports.subscriptionEvents = exports.activeSubscriptions = exports.userRegistrations = exports.guestSessions = exports.activeUsers = exports.queueJobDuration = exports.queueSize = exports.conversionFileSize = exports.conversionDuration = exports.conversionTotal = exports.httpRequestTotal = exports.httpRequestDuration = exports.register = void 0;
exports.recordHttpRequest = recordHttpRequest;
exports.recordConversion = recordConversion;
exports.updateQueueMetrics = updateQueueMetrics;
exports.recordError = recordError;
const prom_client_1 = __importDefault(require("prom-client"));
/**
 * Prometheus Metrics Configuration
 *
 * This module defines all custom metrics for PDFLab monitoring.
 * Metrics are collected and exposed at /metrics endpoint for Prometheus scraping.
 */
// Create registry
exports.register = new prom_client_1.default.Registry();
// Default metrics (CPU, memory, event loop)
prom_client_1.default.collectDefaultMetrics({
    register: exports.register,
    prefix: 'pdflab_'
});
// =====================
// HTTP Request Metrics
// =====================
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'pdflab_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
exports.httpRequestTotal = new prom_client_1.default.Counter({
    name: 'pdflab_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});
// =====================
// PDF Conversion Metrics
// =====================
exports.conversionTotal = new prom_client_1.default.Counter({
    name: 'pdflab_conversions_total',
    help: 'Total number of PDF conversions',
    labelNames: ['status', 'format', 'conversion_type']
});
exports.conversionDuration = new prom_client_1.default.Histogram({
    name: 'pdflab_conversion_duration_seconds',
    help: 'Duration of PDF conversions in seconds',
    labelNames: ['format', 'conversion_type'],
    buckets: [5, 10, 30, 60, 120, 300, 600] // Up to 10 minutes
});
exports.conversionFileSize = new prom_client_1.default.Histogram({
    name: 'pdflab_conversion_file_size_bytes',
    help: 'Size of converted files in bytes',
    labelNames: ['format'],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600] // 1KB to 100MB
});
// =====================
// Bull Queue Metrics
// =====================
exports.queueSize = new prom_client_1.default.Gauge({
    name: 'pdflab_queue_size',
    help: 'Number of jobs in Bull queue',
    labelNames: ['queue', 'status']
});
exports.queueJobDuration = new prom_client_1.default.Histogram({
    name: 'pdflab_queue_job_duration_seconds',
    help: 'Time jobs spend in queue before processing',
    labelNames: ['queue'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
});
// =====================
// User Activity Metrics
// =====================
exports.activeUsers = new prom_client_1.default.Gauge({
    name: 'pdflab_active_users_total',
    help: 'Number of active users (logged in last 24h)'
});
exports.guestSessions = new prom_client_1.default.Gauge({
    name: 'pdflab_guest_sessions_total',
    help: 'Number of active guest sessions'
});
exports.userRegistrations = new prom_client_1.default.Counter({
    name: 'pdflab_user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['tier']
});
// =====================
// Subscription Metrics
// =====================
exports.activeSubscriptions = new prom_client_1.default.Gauge({
    name: 'pdflab_active_subscriptions',
    help: 'Number of active paid subscriptions',
    labelNames: ['tier']
});
exports.subscriptionEvents = new prom_client_1.default.Counter({
    name: 'pdflab_subscription_events_total',
    help: 'Total number of subscription events',
    labelNames: ['event_type', 'tier'] // event_type: created, cancelled, expired, upgraded
});
// =====================
// Error Metrics
// =====================
exports.errorTotal = new prom_client_1.default.Counter({
    name: 'pdflab_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'route', 'status_code']
});
exports.cloudconvertErrors = new prom_client_1.default.Counter({
    name: 'pdflab_cloudconvert_errors_total',
    help: 'Total number of CloudConvert API errors',
    labelNames: ['error_type']
});
// =====================
// Storage Metrics
// =====================
exports.storageUsed = new prom_client_1.default.Gauge({
    name: 'pdflab_storage_used_bytes',
    help: 'Total storage used in bytes',
    labelNames: ['type'] // type: uploads, outputs, temp
});
// =====================
// Database Metrics
// =====================
exports.databaseQueryDuration = new prom_client_1.default.Histogram({
    name: 'pdflab_database_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});
exports.databaseConnections = new prom_client_1.default.Gauge({
    name: 'pdflab_database_connections',
    help: 'Number of active database connections'
});
// =====================
// Redis Metrics
// =====================
exports.redisCommandDuration = new prom_client_1.default.Histogram({
    name: 'pdflab_redis_command_duration_seconds',
    help: 'Duration of Redis commands',
    labelNames: ['command'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});
// =====================
// Circuit Breaker Metrics
// =====================
exports.circuitBreakerState = new prom_client_1.default.Gauge({
    name: 'pdflab_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['name']
});
exports.circuitBreakerCalls = new prom_client_1.default.Counter({
    name: 'pdflab_circuit_breaker_calls_total',
    help: 'Total circuit breaker calls',
    labelNames: ['name', 'result'] // result: success, failure, timeout, reject
});
// Register all custom metrics
exports.register.registerMetric(exports.httpRequestDuration);
exports.register.registerMetric(exports.httpRequestTotal);
exports.register.registerMetric(exports.conversionTotal);
exports.register.registerMetric(exports.conversionDuration);
exports.register.registerMetric(exports.conversionFileSize);
exports.register.registerMetric(exports.queueSize);
exports.register.registerMetric(exports.queueJobDuration);
exports.register.registerMetric(exports.activeUsers);
exports.register.registerMetric(exports.guestSessions);
exports.register.registerMetric(exports.userRegistrations);
exports.register.registerMetric(exports.activeSubscriptions);
exports.register.registerMetric(exports.subscriptionEvents);
exports.register.registerMetric(exports.errorTotal);
exports.register.registerMetric(exports.cloudconvertErrors);
exports.register.registerMetric(exports.storageUsed);
exports.register.registerMetric(exports.databaseQueryDuration);
exports.register.registerMetric(exports.databaseConnections);
exports.register.registerMetric(exports.redisCommandDuration);
exports.register.registerMetric(exports.circuitBreakerState);
exports.register.registerMetric(exports.circuitBreakerCalls);
/**
 * Helper function to record HTTP request metrics
 */
function recordHttpRequest(method, route, statusCode, durationSeconds) {
    exports.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, durationSeconds);
    exports.httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
}
/**
 * Helper function to record conversion metrics
 */
function recordConversion(status, format, conversionType, durationSeconds, fileSizeBytes) {
    exports.conversionTotal.inc({ status, format, conversion_type: conversionType });
    if (durationSeconds !== undefined) {
        exports.conversionDuration.observe({ format, conversion_type: conversionType }, durationSeconds);
    }
    if (fileSizeBytes !== undefined) {
        exports.conversionFileSize.observe({ format }, fileSizeBytes);
    }
}
/**
 * Helper function to update queue metrics
 */
async function updateQueueMetrics(queueName, getQueueCounts) {
    const counts = await getQueueCounts();
    exports.queueSize.set({ queue: queueName, status: 'waiting' }, counts.waiting);
    exports.queueSize.set({ queue: queueName, status: 'active' }, counts.active);
    exports.queueSize.set({ queue: queueName, status: 'completed' }, counts.completed);
    exports.queueSize.set({ queue: queueName, status: 'failed' }, counts.failed);
}
/**
 * Helper function to record errors
 */
function recordError(type, route, statusCode) {
    exports.errorTotal.inc({
        type,
        route,
        status_code: statusCode?.toString() || 'unknown'
    });
}
//# sourceMappingURL=metrics.js.map