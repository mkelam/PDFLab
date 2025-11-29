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
import { Counter, Histogram, Gauge } from 'prom-client';
/**
 * Track HTTP errors by status code, endpoint, and method
 */
export declare const httpErrors: Counter<"route" | "method" | "status_code" | "error_type" | "user_type">;
/**
 * Track 4xx client errors specifically
 */
export declare const http4xxErrors: Counter<"route" | "method" | "status_code" | "error_reason">;
/**
 * Track 5xx server errors specifically
 */
export declare const http5xxErrors: Counter<"route" | "method" | "status_code" | "error_reason" | "error_id">;
/**
 * Track error response duration
 */
export declare const errorResponseDuration: Histogram<"route" | "status_code">;
/**
 * Current error rate (errors per second) by endpoint
 */
export declare const currentErrorRate: Gauge<"route" | "error_type">;
/**
 * Error rate percentage (errors / total requests * 100)
 */
export declare const errorRatePercentage: Gauge<"route" | "status_range">;
/**
 * Authentication/Authorization errors
 */
export declare const authErrors: Counter<"route" | "error_type" | "user_type">;
/**
 * Validation errors (bad request data)
 */
export declare const validationErrors: Counter<"route" | "field" | "validation_type">;
/**
 * Rate limit errors
 */
export declare const rateLimitErrors: Counter<"route" | "user_type" | "limit_type">;
/**
 * File upload errors
 */
export declare const fileUploadErrors: Counter<"user_type" | "error_reason" | "file_type">;
/**
 * Conversion processing errors
 */
export declare const conversionProcessingErrors: Counter<"conversion_type" | "stage" | "error_reason">;
/**
 * Database errors
 */
export declare const databaseErrors: Counter<"model" | "error_type" | "operation">;
/**
 * External API errors (CloudConvert, etc.)
 */
export declare const externalApiErrors: Counter<"error_type" | "endpoint" | "api_name" | "circuit_breaker_state">;
/**
 * Track repeated errors (same error occurring multiple times)
 */
export declare const repeatedErrors: Counter<"route" | "error_id" | "count_threshold">;
/**
 * Error bursts (sudden spike in errors)
 */
export declare const errorBursts: Counter<"route" | "burst_size">;
/**
 * Track general HTTP error
 */
export declare function trackHttpError(method: string, route: string, statusCode: number, errorReason: string, user?: any, guestSession?: any): void;
/**
 * Track error response duration
 */
export declare function trackErrorDuration(route: string, statusCode: number, durationSeconds: number): void;
/**
 * Track authentication error
 */
export declare function trackAuthError(errorType: 'invalid_token' | 'expired_token' | 'missing_token' | 'insufficient_permissions', route: string, user?: any, guestSession?: any): void;
/**
 * Track validation error
 */
export declare function trackValidationError(route: string, field: string, validationType: 'required' | 'format' | 'range' | 'type'): void;
/**
 * Track rate limit error
 */
export declare function trackRateLimitError(route: string, limitType: 'api' | 'conversion' | 'guest_ip' | 'guest_session', user?: any, guestSession?: any): void;
/**
 * Track file upload error
 */
export declare function trackFileUploadError(errorReason: 'file_too_large' | 'invalid_format' | 'corrupted_file' | 'upload_failed', fileType: string, user?: any, guestSession?: any): void;
/**
 * Track conversion processing error
 */
export declare function trackConversionError(conversionType: string, errorReason: string, stage: 'upload' | 'validation' | 'queue' | 'processing' | 'download'): void;
/**
 * Track database error
 */
export declare function trackDatabaseError(operation: 'select' | 'insert' | 'update' | 'delete', model: string, errorType: 'connection' | 'timeout' | 'constraint' | 'query'): void;
/**
 * Track external API error
 */
export declare function trackExternalApiError(apiName: string, endpoint: string, errorType: 'timeout' | 'rate_limit' | 'api_error' | 'network_error', circuitBreakerState: 'closed' | 'open' | 'half_open'): void;
/**
 * Update current error rate gauge
 */
export declare function updateErrorRate(route: string, errorType: '4xx' | '5xx', errorsPerSecond: number): void;
/**
 * Update error rate percentage gauge
 */
export declare function updateErrorRatePercentage(route: string, statusRange: '4xx' | '5xx', percentage: number): void;
/**
 * Track repeated error pattern
 */
export declare function trackRepeatedError(errorId: string, route: string, count: number): void;
/**
 * Track error burst
 */
export declare function trackErrorBurst(route: string, burstSize: number): void;
/**
 * Calculate error rate percentage
 */
export declare function calculateErrorRate(errorCount: number, totalRequests: number): number;
/**
 * Check if error rate exceeds threshold
 */
export declare function isErrorRateHigh(errorCount: number, totalRequests: number, threshold?: number): boolean;
//# sourceMappingURL=error-rate.metrics.d.ts.map