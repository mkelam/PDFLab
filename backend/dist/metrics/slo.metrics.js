"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuerySloViolations = exports.dbQueryTimePercentiles = exports.apiAvailabilitySloViolations = exports.apiEndpointAvailability = exports.conversionTimeSloViolations = exports.conversionTimePercentiles = exports.errorRateSloViolations = exports.sloErrorRatePercentage = exports.sloCurrentErrorRate = exports.responseTimeSloViolations = exports.responseTimePercentiles = exports.downtimeEvents = exports.serviceUptimePercentage = exports.serviceUptime = exports.sloViolationDuration = exports.sloViolations = exports.sloErrorBudgetBurnRate = exports.sloErrorBudget = exports.sloCompliance = exports.SLO_TARGETS = void 0;
exports.updateSloCompliance = updateSloCompliance;
exports.trackSloViolation = trackSloViolation;
exports.updateErrorBudgetBurnRate = updateErrorBudgetBurnRate;
exports.updateServiceUptime = updateServiceUptime;
exports.trackDowntimeEvent = trackDowntimeEvent;
exports.updateUptimePercentage = updateUptimePercentage;
exports.updateResponseTimePercentile = updateResponseTimePercentile;
exports.updateSloErrorRatePercentage = updateSloErrorRatePercentage;
exports.updateConversionTimePercentile = updateConversionTimePercentile;
exports.updateApiAvailability = updateApiAvailability;
exports.updateDbQueryTimePercentile = updateDbQueryTimePercentile;
exports.calculateBurnRate = calculateBurnRate;
exports.calculateSloCompliance = calculateSloCompliance;
exports.isSloAtRisk = isSloAtRisk;
const prom_client_1 = require("prom-client");
const logger_1 = __importDefault(require("../config/logger"));
// ============================================================================
// SLO Target Definitions
// ============================================================================
exports.SLO_TARGETS = {
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
};
// ============================================================================
// SLO Compliance Gauges
// ============================================================================
/**
 * Current SLO compliance (0-100%)
 */
exports.sloCompliance = new prom_client_1.Gauge({
    name: 'pdflab_slo_compliance_percentage',
    help: 'Current SLO compliance percentage',
    labelNames: ['slo_type', 'time_window'] // time_window: 1h, 24h, 7d, 30d
});
/**
 * Error budget remaining (percentage)
 */
exports.sloErrorBudget = new prom_client_1.Gauge({
    name: 'pdflab_slo_error_budget_percentage',
    help: 'Remaining error budget as percentage',
    labelNames: ['slo_type', 'time_window']
});
/**
 * Error budget burn rate (how fast we're consuming budget)
 */
exports.sloErrorBudgetBurnRate = new prom_client_1.Gauge({
    name: 'pdflab_slo_error_budget_burn_rate',
    help: 'Rate at which error budget is being consumed',
    labelNames: ['slo_type', 'time_window']
});
// ============================================================================
// SLO Violation Counters
// ============================================================================
/**
 * SLO violation events
 */
exports.sloViolations = new prom_client_1.Counter({
    name: 'pdflab_slo_violations_total',
    help: 'Total number of SLO violation events',
    labelNames: ['slo_type', 'severity', 'violation_type']
});
/**
 * SLO violation duration
 */
exports.sloViolationDuration = new prom_client_1.Histogram({
    name: 'pdflab_slo_violation_duration_seconds',
    help: 'Duration of SLO violations',
    labelNames: ['slo_type'],
    buckets: [10, 30, 60, 300, 600, 1800, 3600] // 10s to 1h
});
// ============================================================================
// Uptime SLO Metrics
// ============================================================================
/**
 * Service uptime (1 = up, 0 = down)
 */
exports.serviceUptime = new prom_client_1.Gauge({
    name: 'pdflab_service_uptime',
    help: 'Service uptime status (1=up, 0=down)',
    labelNames: ['service_name']
});
/**
 * Service uptime percentage
 */
exports.serviceUptimePercentage = new prom_client_1.Gauge({
    name: 'pdflab_service_uptime_percentage',
    help: 'Service uptime percentage over time window',
    labelNames: ['service_name', 'time_window']
});
/**
 * Downtime events
 */
exports.downtimeEvents = new prom_client_1.Counter({
    name: 'pdflab_downtime_events_total',
    help: 'Total number of downtime events',
    labelNames: ['service_name', 'downtime_reason']
});
// ============================================================================
// Response Time SLO Metrics
// ============================================================================
/**
 * Response time percentiles
 */
exports.responseTimePercentiles = new prom_client_1.Gauge({
    name: 'pdflab_response_time_percentile_ms',
    help: 'Response time at various percentiles',
    labelNames: ['route', 'method', 'percentile'] // percentile: p50, p75, p95, p99
});
/**
 * Response time SLO violations
 */
exports.responseTimeSloViolations = new prom_client_1.Counter({
    name: 'pdflab_response_time_slo_violations_total',
    help: 'Number of requests exceeding response time SLO',
    labelNames: ['route', 'method', 'threshold_ms']
});
// ============================================================================
// Error Rate SLO Metrics
// ============================================================================
/**
 * Current SLO error rate (errors per second)
 */
exports.sloCurrentErrorRate = new prom_client_1.Gauge({
    name: 'pdflab_slo_current_error_rate_per_second',
    help: 'Current SLO error rate in errors per second',
    labelNames: ['error_type'] // 4xx, 5xx
});
/**
 * SLO error rate percentage
 */
exports.sloErrorRatePercentage = new prom_client_1.Gauge({
    name: 'pdflab_error_rate_slo_percentage',
    help: 'Error rate as percentage of total requests for SLO tracking',
    labelNames: ['time_window', 'error_type']
});
/**
 * Error rate SLO violations
 */
exports.errorRateSloViolations = new prom_client_1.Counter({
    name: 'pdflab_error_rate_slo_violations_total',
    help: 'Number of time windows where error rate exceeded SLO',
    labelNames: ['error_type', 'threshold_percentage']
});
// ============================================================================
// Conversion Time SLO Metrics
// ============================================================================
/**
 * Conversion time percentiles
 */
exports.conversionTimePercentiles = new prom_client_1.Gauge({
    name: 'pdflab_conversion_time_percentile_seconds',
    help: 'Conversion time at various percentiles',
    labelNames: ['conversion_type', 'page_count_bucket', 'percentile']
});
/**
 * Conversion time SLO violations
 */
exports.conversionTimeSloViolations = new prom_client_1.Counter({
    name: 'pdflab_conversion_time_slo_violations_total',
    help: 'Number of conversions exceeding time SLO',
    labelNames: ['conversion_type', 'page_count_bucket', 'threshold_seconds']
});
// ============================================================================
// API Availability SLO Metrics
// ============================================================================
/**
 * API endpoint availability
 */
exports.apiEndpointAvailability = new prom_client_1.Gauge({
    name: 'pdflab_api_endpoint_availability_percentage',
    help: 'API endpoint availability percentage',
    labelNames: ['route', 'method', 'time_window']
});
/**
 * API availability SLO violations
 */
exports.apiAvailabilitySloViolations = new prom_client_1.Counter({
    name: 'pdflab_api_availability_slo_violations_total',
    help: 'Number of API availability SLO violations',
    labelNames: ['route', 'method']
});
// ============================================================================
// Database Query Time SLO Metrics
// ============================================================================
/**
 * Database query time percentiles
 */
exports.dbQueryTimePercentiles = new prom_client_1.Gauge({
    name: 'pdflab_db_query_time_percentile_ms',
    help: 'Database query time at various percentiles',
    labelNames: ['operation', 'model', 'percentile']
});
/**
 * Database query SLO violations
 */
exports.dbQuerySloViolations = new prom_client_1.Counter({
    name: 'pdflab_db_query_slo_violations_total',
    help: 'Number of database queries exceeding time SLO',
    labelNames: ['operation', 'model', 'threshold_ms']
});
// ============================================================================
// SLO Tracking Functions
// ============================================================================
/**
 * Update SLO compliance
 */
function updateSloCompliance(sloType, compliancePercentage, timeWindow) {
    exports.sloCompliance.labels(sloType, timeWindow).set(compliancePercentage);
    // Calculate error budget (100 - target)
    let targetPercentage;
    switch (sloType) {
        case 'uptime':
            targetPercentage = exports.SLO_TARGETS.UPTIME_PERCENTAGE;
            break;
        case 'api_availability':
            targetPercentage = exports.SLO_TARGETS.API_AVAILABILITY_PERCENTAGE;
            break;
        case 'error_rate':
            targetPercentage = 100 - exports.SLO_TARGETS.ERROR_RATE_PERCENTAGE;
            break;
        default:
            targetPercentage = 99.9; // Default target
    }
    const errorBudgetTotal = 100 - targetPercentage;
    const errorBudgetUsed = 100 - compliancePercentage;
    const errorBudgetRemaining = ((errorBudgetTotal - errorBudgetUsed) / errorBudgetTotal) * 100;
    exports.sloErrorBudget.labels(sloType, timeWindow).set(Math.max(0, errorBudgetRemaining));
    logger_1.default.debug('[SLO] Compliance updated', {
        sloType,
        compliancePercentage,
        errorBudgetRemaining,
        timeWindow
    });
}
/**
 * Track SLO violation
 */
function trackSloViolation(sloType, severity, violationType, durationSeconds) {
    exports.sloViolations.labels(sloType, severity, violationType).inc();
    if (durationSeconds) {
        exports.sloViolationDuration.labels(sloType).observe(durationSeconds);
    }
    logger_1.default.error('[SLO] SLO violation detected', {
        sloType,
        severity,
        violationType,
        durationSeconds
    });
}
/**
 * Update error budget burn rate
 */
function updateErrorBudgetBurnRate(sloType, burnRate, timeWindow) {
    exports.sloErrorBudgetBurnRate.labels(sloType, timeWindow).set(burnRate);
    if (burnRate > 1) {
        logger_1.default.warn('[SLO] High error budget burn rate', {
            sloType,
            burnRate,
            timeWindow,
            message: `Burning through error budget ${burnRate.toFixed(2)}x faster than expected`
        });
    }
}
/**
 * Update service uptime
 */
function updateServiceUptime(serviceName, isUp) {
    exports.serviceUptime.labels(serviceName).set(isUp ? 1 : 0);
    if (!isUp) {
        logger_1.default.error('[SLO] Service down detected', { serviceName });
    }
}
/**
 * Track downtime event
 */
function trackDowntimeEvent(serviceName, reason) {
    exports.downtimeEvents.labels(serviceName, reason).inc();
    logger_1.default.error('[SLO] Downtime event tracked', {
        serviceName,
        reason
    });
}
/**
 * Update uptime percentage
 */
function updateUptimePercentage(serviceName, uptimePercentage, timeWindow) {
    exports.serviceUptimePercentage.labels(serviceName, timeWindow).set(uptimePercentage);
    // Check if below SLO
    if (uptimePercentage < exports.SLO_TARGETS.UPTIME_PERCENTAGE) {
        trackSloViolation('uptime', 'high', 'uptime_below_target', undefined);
    }
}
/**
 * Update response time percentile
 */
function updateResponseTimePercentile(route, method, percentile, timeMs) {
    exports.responseTimePercentiles.labels(route, method, percentile).set(timeMs);
    // Check p95 against SLO
    if (percentile === 'p95' && timeMs > exports.SLO_TARGETS.RESPONSE_TIME_P95_MS) {
        exports.responseTimeSloViolations
            .labels(route, method, exports.SLO_TARGETS.RESPONSE_TIME_P95_MS.toString())
            .inc();
        logger_1.default.warn('[SLO] Response time SLO violation', {
            route,
            method,
            p95: timeMs,
            target: exports.SLO_TARGETS.RESPONSE_TIME_P95_MS
        });
    }
}
/**
 * Update SLO error rate
 */
function updateSloErrorRatePercentage(errorType, percentage, timeWindow) {
    exports.sloErrorRatePercentage.labels(timeWindow, errorType).set(percentage);
    // Check against SLO
    if (percentage > exports.SLO_TARGETS.ERROR_RATE_PERCENTAGE) {
        exports.errorRateSloViolations
            .labels(errorType, exports.SLO_TARGETS.ERROR_RATE_PERCENTAGE.toString())
            .inc();
        trackSloViolation('error_rate', 'high', `${errorType}_error_rate_high`, undefined);
    }
}
/**
 * Update conversion time percentile
 */
function updateConversionTimePercentile(conversionType, pageCountBucket, percentile, timeSeconds) {
    exports.conversionTimePercentiles.labels(conversionType, pageCountBucket, percentile).set(timeSeconds);
    // Check 20-page bucket p95 against SLO
    if (pageCountBucket === '11-20' && percentile === 'p95' && timeSeconds > exports.SLO_TARGETS.CONVERSION_TIME_20_PAGE_SECONDS) {
        exports.conversionTimeSloViolations
            .labels(conversionType, pageCountBucket, exports.SLO_TARGETS.CONVERSION_TIME_20_PAGE_SECONDS.toString())
            .inc();
        logger_1.default.warn('[SLO] Conversion time SLO violation', {
            conversionType,
            pageCountBucket,
            p95: timeSeconds,
            target: exports.SLO_TARGETS.CONVERSION_TIME_20_PAGE_SECONDS
        });
    }
}
/**
 * Update API endpoint availability
 */
function updateApiAvailability(route, method, availabilityPercentage, timeWindow) {
    exports.apiEndpointAvailability.labels(route, method, timeWindow).set(availabilityPercentage);
    // Check against SLO
    if (availabilityPercentage < exports.SLO_TARGETS.API_AVAILABILITY_PERCENTAGE) {
        exports.apiAvailabilitySloViolations.labels(route, method).inc();
        trackSloViolation('api_availability', 'high', 'endpoint_availability_low', undefined);
    }
}
/**
 * Update database query time percentile
 */
function updateDbQueryTimePercentile(operation, model, percentile, timeMs) {
    exports.dbQueryTimePercentiles.labels(operation, model, percentile).set(timeMs);
    // Check p95 against SLO
    if (percentile === 'p95' && timeMs > exports.SLO_TARGETS.DB_QUERY_TIME_P95_MS) {
        exports.dbQuerySloViolations
            .labels(operation, model, exports.SLO_TARGETS.DB_QUERY_TIME_P95_MS.toString())
            .inc();
        logger_1.default.warn('[SLO] Database query time SLO violation', {
            operation,
            model,
            p95: timeMs,
            target: exports.SLO_TARGETS.DB_QUERY_TIME_P95_MS
        });
    }
}
// ============================================================================
// SLO Calculation Helpers
// ============================================================================
/**
 * Calculate error budget burn rate
 * Formula: (actual error rate / SLO error rate) / (time window / full SLO period)
 */
function calculateBurnRate(actualErrorRate, sloErrorRate, timeWindowHours, sloPeriodHours = 720 // 30 days default
) {
    const normalizedActual = actualErrorRate / sloErrorRate;
    const normalizedTime = timeWindowHours / sloPeriodHours;
    return normalizedActual / normalizedTime;
}
/**
 * Calculate SLO compliance percentage
 */
function calculateSloCompliance(successfulRequests, totalRequests) {
    if (totalRequests === 0)
        return 100;
    return (successfulRequests / totalRequests) * 100;
}
/**
 * Check if SLO is at risk
 */
function isSloAtRisk(currentCompliance, targetCompliance, errorBudgetRemaining) {
    if (errorBudgetRemaining <= 0) {
        return {
            atRisk: true,
            severity: 'critical',
            message: 'Error budget exhausted - SLO violated'
        };
    }
    if (errorBudgetRemaining < 10) {
        return {
            atRisk: true,
            severity: 'high',
            message: `Only ${errorBudgetRemaining.toFixed(1)}% error budget remaining`
        };
    }
    if (errorBudgetRemaining < 25) {
        return {
            atRisk: true,
            severity: 'medium',
            message: `${errorBudgetRemaining.toFixed(1)}% error budget remaining`
        };
    }
    if (errorBudgetRemaining < 50) {
        return {
            atRisk: true,
            severity: 'low',
            message: `${errorBudgetRemaining.toFixed(1)}% error budget remaining`
        };
    }
    return {
        atRisk: false,
        severity: 'none',
        message: 'SLO healthy'
    };
}
logger_1.default.info('[Metrics] SLO tracking metrics initialized', { targets: exports.SLO_TARGETS });
//# sourceMappingURL=slo.metrics.js.map