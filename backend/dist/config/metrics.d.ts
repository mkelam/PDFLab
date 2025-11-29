import client from 'prom-client';
/**
 * Prometheus Metrics Configuration
 *
 * This module defines all custom metrics for PDFLab monitoring.
 * Metrics are collected and exposed at /metrics endpoint for Prometheus scraping.
 */
export declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const httpRequestDuration: client.Histogram<"route" | "method" | "status_code">;
export declare const httpRequestTotal: client.Counter<"route" | "method" | "status_code">;
export declare const conversionTotal: client.Counter<"status" | "format" | "conversion_type">;
export declare const conversionDuration: client.Histogram<"format" | "conversion_type">;
export declare const conversionFileSize: client.Histogram<"format">;
export declare const queueSize: client.Gauge<"status" | "queue">;
export declare const queueJobDuration: client.Histogram<"queue">;
export declare const activeUsers: client.Gauge<string>;
export declare const guestSessions: client.Gauge<string>;
export declare const userRegistrations: client.Counter<"tier">;
export declare const activeSubscriptions: client.Gauge<"tier">;
export declare const subscriptionEvents: client.Counter<"tier" | "event_type">;
export declare const errorTotal: client.Counter<"type" | "route" | "status_code">;
export declare const cloudconvertErrors: client.Counter<"error_type">;
export declare const storageUsed: client.Gauge<"type">;
export declare const databaseQueryDuration: client.Histogram<"model" | "operation">;
export declare const databaseConnections: client.Gauge<string>;
export declare const redisCommandDuration: client.Histogram<"command">;
export declare const circuitBreakerState: client.Gauge<"name">;
export declare const circuitBreakerCalls: client.Counter<"name" | "result">;
/**
 * Helper function to record HTTP request metrics
 */
export declare function recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void;
/**
 * Helper function to record conversion metrics
 */
export declare function recordConversion(status: 'success' | 'failed', format: string, conversionType: string, durationSeconds?: number, fileSizeBytes?: number): void;
/**
 * Helper function to update queue metrics
 */
export declare function updateQueueMetrics(queueName: string, getQueueCounts: () => Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
}>): Promise<void>;
/**
 * Helper function to record errors
 */
export declare function recordError(type: string, route: string, statusCode?: number): void;
//# sourceMappingURL=metrics.d.ts.map