/**
 * Queue Depth and Performance Metrics
 *
 * Tracks:
 * - Queue depth (number of jobs waiting)
 * - Queue processing latency
 * - Job completion rate
 * - Queue worker status
 * - Job retry attempts
 * - Queue backup situations
 */
import { Gauge, Counter, Histogram } from 'prom-client';
/**
 * Current queue depth (jobs waiting to be processed)
 */
export declare const queueDepth: Gauge<"state" | "queue_name">;
/**
 * Queue worker count (number of active workers)
 */
export declare const queueWorkers: Gauge<"status" | "queue_name">;
/**
 * Queue age (oldest job waiting time)
 */
export declare const queueOldestJobAge: Gauge<"queue_name">;
/**
 * Job processing duration
 */
export declare const jobProcessingDuration: Histogram<"conversion_type" | "queue_name" | "job_type">;
/**
 * Job wait time (time from submission to start)
 */
export declare const jobWaitTime: Histogram<"priority" | "queue_name">;
/**
 * Job completion rate
 */
export declare const jobCompletions: Counter<"status" | "queue_name" | "job_type">;
/**
 * Job retry attempts
 */
export declare const jobRetries: Counter<"queue_name" | "job_type" | "retry_reason" | "attempt_number">;
/**
 * Job failures
 */
export declare const jobFailures: Counter<"failure_reason" | "queue_name" | "job_type" | "is_permanent">;
/**
 * Queue backup events (when queue depth exceeds threshold)
 */
export declare const queueBackups: Counter<"queue_name" | "threshold">;
/**
 * Queue stalled jobs
 */
export declare const queueStalledJobs: Counter<"queue_name">;
/**
 * Queue circuit breaker state
 */
export declare const queueCircuitBreakerState: Gauge<"queue_name">;
/**
 * Jobs processed per second
 */
export declare const queueThroughput: Gauge<"queue_name">;
/**
 * Queue capacity utilization (%)
 */
export declare const queueCapacityUtilization: Gauge<"queue_name">;
/**
 * Jobs by priority level
 */
export declare const jobsByPriority: Gauge<"priority" | "queue_name">;
/**
 * Update queue depth metrics
 */
export declare function updateQueueDepth(queueName: string, queue: any): Promise<void>;
/**
 * Track job processing duration
 */
export declare function trackJobDuration(queueName: string, jobType: string, conversionType: string, durationSeconds: number): void;
/**
 * Track job wait time
 */
export declare function trackJobWaitTime(queueName: string, priority: 'high' | 'normal' | 'low', waitTimeSeconds: number): void;
/**
 * Track job completion
 */
export declare function trackJobCompletion(queueName: string, jobType: string, status: 'completed' | 'failed'): void;
/**
 * Track job retry
 */
export declare function trackJobRetry(queueName: string, jobType: string, retryReason: string, attemptNumber: number): void;
/**
 * Track job failure
 */
export declare function trackJobFailure(queueName: string, jobType: string, failureReason: string, isPermanent?: boolean): void;
/**
 * Track queue backup event
 */
export declare function trackQueueBackup(queueName: string, threshold: number, currentDepth: number): void;
/**
 * Track stalled job
 */
export declare function trackStalledJob(queueName: string): void;
/**
 * Update queue worker count
 */
export declare function updateWorkerCount(queueName: string, status: 'active' | 'idle' | 'stalled', count: number): void;
/**
 * Update queue throughput
 */
export declare function updateQueueThroughput(queueName: string, jobsPerSecond: number): void;
/**
 * Update queue capacity utilization
 */
export declare function updateQueueCapacity(queueName: string, currentDepth: number, maxCapacity?: number): void;
/**
 * Update jobs by priority
 */
export declare function updateJobsByPriority(queueName: string, priority: 'high' | 'normal' | 'low', count: number): void;
/**
 * Update circuit breaker state
 */
export declare function updateCircuitBreakerState(queueName: string, state: 'closed' | 'open' | 'half_open'): void;
/**
 * Check queue health and update metrics
 */
export declare function checkQueueHealth(queueName: string, queue: any, thresholds?: {
    maxDepth?: number;
    maxWaitTime?: number;
    maxFailureRate?: number;
}): Promise<{
    healthy: boolean;
    issues: string[];
}>;
/**
 * Start periodic queue monitoring
 */
export declare function startQueueMonitoring(intervalMs?: number): NodeJS.Timeout;
//# sourceMappingURL=queue.metrics.d.ts.map