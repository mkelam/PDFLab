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
import { Gauge, Counter, Histogram } from 'prom-client';
export declare const SLO_TARGETS: {
    readonly UPTIME_PERCENTAGE: 99.9;
    readonly RESPONSE_TIME_P95_MS: 200;
    readonly ERROR_RATE_PERCENTAGE: 0.1;
    readonly CONVERSION_TIME_20_PAGE_SECONDS: 5;
    readonly API_AVAILABILITY_PERCENTAGE: 99.95;
    readonly DB_QUERY_TIME_P95_MS: 100;
};
/**
 * Current SLO compliance (0-100%)
 */
export declare const sloCompliance: Gauge<"slo_type" | "time_window">;
/**
 * Error budget remaining (percentage)
 */
export declare const sloErrorBudget: Gauge<"slo_type" | "time_window">;
/**
 * Error budget burn rate (how fast we're consuming budget)
 */
export declare const sloErrorBudgetBurnRate: Gauge<"slo_type" | "time_window">;
/**
 * SLO violation events
 */
export declare const sloViolations: Counter<"severity" | "slo_type" | "violation_type">;
/**
 * SLO violation duration
 */
export declare const sloViolationDuration: Histogram<"slo_type">;
/**
 * Service uptime (1 = up, 0 = down)
 */
export declare const serviceUptime: Gauge<"service_name">;
/**
 * Service uptime percentage
 */
export declare const serviceUptimePercentage: Gauge<"time_window" | "service_name">;
/**
 * Downtime events
 */
export declare const downtimeEvents: Counter<"service_name" | "downtime_reason">;
/**
 * Response time percentiles
 */
export declare const responseTimePercentiles: Gauge<"route" | "method" | "percentile">;
/**
 * Response time SLO violations
 */
export declare const responseTimeSloViolations: Counter<"route" | "method" | "threshold_ms">;
/**
 * Current SLO error rate (errors per second)
 */
export declare const sloCurrentErrorRate: Gauge<"error_type">;
/**
 * SLO error rate percentage
 */
export declare const sloErrorRatePercentage: Gauge<"error_type" | "time_window">;
/**
 * Error rate SLO violations
 */
export declare const errorRateSloViolations: Counter<"error_type" | "threshold_percentage">;
/**
 * Conversion time percentiles
 */
export declare const conversionTimePercentiles: Gauge<"conversion_type" | "percentile" | "page_count_bucket">;
/**
 * Conversion time SLO violations
 */
export declare const conversionTimeSloViolations: Counter<"conversion_type" | "page_count_bucket" | "threshold_seconds">;
/**
 * API endpoint availability
 */
export declare const apiEndpointAvailability: Gauge<"route" | "method" | "time_window">;
/**
 * API availability SLO violations
 */
export declare const apiAvailabilitySloViolations: Counter<"route" | "method">;
/**
 * Database query time percentiles
 */
export declare const dbQueryTimePercentiles: Gauge<"model" | "operation" | "percentile">;
/**
 * Database query SLO violations
 */
export declare const dbQuerySloViolations: Counter<"model" | "operation" | "threshold_ms">;
/**
 * Update SLO compliance
 */
export declare function updateSloCompliance(sloType: 'uptime' | 'response_time' | 'error_rate' | 'conversion_time' | 'api_availability' | 'db_query_time', compliancePercentage: number, timeWindow: '1h' | '24h' | '7d' | '30d'): void;
/**
 * Track SLO violation
 */
export declare function trackSloViolation(sloType: string, severity: 'low' | 'medium' | 'high' | 'critical', violationType: string, durationSeconds?: number): void;
/**
 * Update error budget burn rate
 */
export declare function updateErrorBudgetBurnRate(sloType: string, burnRate: number, timeWindow: string): void;
/**
 * Update service uptime
 */
export declare function updateServiceUptime(serviceName: string, isUp: boolean): void;
/**
 * Track downtime event
 */
export declare function trackDowntimeEvent(serviceName: string, reason: string): void;
/**
 * Update uptime percentage
 */
export declare function updateUptimePercentage(serviceName: string, uptimePercentage: number, timeWindow: string): void;
/**
 * Update response time percentile
 */
export declare function updateResponseTimePercentile(route: string, method: string, percentile: 'p50' | 'p75' | 'p95' | 'p99', timeMs: number): void;
/**
 * Update SLO error rate
 */
export declare function updateSloErrorRatePercentage(errorType: '4xx' | '5xx' | 'all', percentage: number, timeWindow: string): void;
/**
 * Update conversion time percentile
 */
export declare function updateConversionTimePercentile(conversionType: string, pageCountBucket: '1-10' | '11-20' | '21-50' | '51-100' | '100+', percentile: 'p50' | 'p75' | 'p95' | 'p99', timeSeconds: number): void;
/**
 * Update API endpoint availability
 */
export declare function updateApiAvailability(route: string, method: string, availabilityPercentage: number, timeWindow: string): void;
/**
 * Update database query time percentile
 */
export declare function updateDbQueryTimePercentile(operation: 'select' | 'insert' | 'update' | 'delete', model: string, percentile: 'p50' | 'p75' | 'p95' | 'p99', timeMs: number): void;
/**
 * Calculate error budget burn rate
 * Formula: (actual error rate / SLO error rate) / (time window / full SLO period)
 */
export declare function calculateBurnRate(actualErrorRate: number, sloErrorRate: number, timeWindowHours: number, sloPeriodHours?: number): number;
/**
 * Calculate SLO compliance percentage
 */
export declare function calculateSloCompliance(successfulRequests: number, totalRequests: number): number;
/**
 * Check if SLO is at risk
 */
export declare function isSloAtRisk(currentCompliance: number, targetCompliance: number, errorBudgetRemaining: number): {
    atRisk: boolean;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    message: string;
};
//# sourceMappingURL=slo.metrics.d.ts.map