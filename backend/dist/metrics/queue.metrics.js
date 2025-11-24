"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsByPriority = exports.queueCapacityUtilization = exports.queueThroughput = exports.queueCircuitBreakerState = exports.queueStalledJobs = exports.queueBackups = exports.jobFailures = exports.jobRetries = exports.jobCompletions = exports.jobWaitTime = exports.jobProcessingDuration = exports.queueOldestJobAge = exports.queueWorkers = exports.queueDepth = void 0;
exports.updateQueueDepth = updateQueueDepth;
exports.trackJobDuration = trackJobDuration;
exports.trackJobWaitTime = trackJobWaitTime;
exports.trackJobCompletion = trackJobCompletion;
exports.trackJobRetry = trackJobRetry;
exports.trackJobFailure = trackJobFailure;
exports.trackQueueBackup = trackQueueBackup;
exports.trackStalledJob = trackStalledJob;
exports.updateWorkerCount = updateWorkerCount;
exports.updateQueueThroughput = updateQueueThroughput;
exports.updateQueueCapacity = updateQueueCapacity;
exports.updateJobsByPriority = updateJobsByPriority;
exports.updateCircuitBreakerState = updateCircuitBreakerState;
exports.checkQueueHealth = checkQueueHealth;
exports.startQueueMonitoring = startQueueMonitoring;
const prom_client_1 = require("prom-client");
const logger_1 = __importDefault(require("../config/logger"));
const redis_1 = require("../config/redis");
// ============================================================================
// Queue Depth Gauges
// ============================================================================
/**
 * Current queue depth (jobs waiting to be processed)
 */
exports.queueDepth = new prom_client_1.Gauge({
    name: 'pdflab_queue_depth',
    help: 'Current number of jobs in the queue',
    labelNames: ['queue_name', 'state'] // state: waiting, active, delayed, failed
});
/**
 * Queue worker count (number of active workers)
 */
exports.queueWorkers = new prom_client_1.Gauge({
    name: 'pdflab_queue_workers',
    help: 'Number of active queue workers',
    labelNames: ['queue_name', 'status'] // status: active, idle, stalled
});
/**
 * Queue age (oldest job waiting time)
 */
exports.queueOldestJobAge = new prom_client_1.Gauge({
    name: 'pdflab_queue_oldest_job_age_seconds',
    help: 'Age of the oldest job in the queue',
    labelNames: ['queue_name']
});
// ============================================================================
// Queue Performance Metrics
// ============================================================================
/**
 * Job processing duration
 */
exports.jobProcessingDuration = new prom_client_1.Histogram({
    name: 'pdflab_job_processing_duration_seconds',
    help: 'Time taken to process a job',
    labelNames: ['queue_name', 'job_type', 'conversion_type'],
    buckets: [1, 3, 5, 10, 20, 30, 60, 120, 300, 600] // 1s to 10min
});
/**
 * Job wait time (time from submission to start)
 */
exports.jobWaitTime = new prom_client_1.Histogram({
    name: 'pdflab_job_wait_time_seconds',
    help: 'Time a job spends waiting before processing starts',
    labelNames: ['queue_name', 'priority'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600] // 0.1s to 10min
});
/**
 * Job completion rate
 */
exports.jobCompletions = new prom_client_1.Counter({
    name: 'pdflab_job_completions_total',
    help: 'Total number of completed jobs',
    labelNames: ['queue_name', 'job_type', 'status'] // status: completed, failed
});
/**
 * Job retry attempts
 */
exports.jobRetries = new prom_client_1.Counter({
    name: 'pdflab_job_retries_total',
    help: 'Total number of job retry attempts',
    labelNames: ['queue_name', 'job_type', 'retry_reason', 'attempt_number']
});
/**
 * Job failures
 */
exports.jobFailures = new prom_client_1.Counter({
    name: 'pdflab_job_failures_total',
    help: 'Total number of job failures',
    labelNames: ['queue_name', 'job_type', 'failure_reason', 'is_permanent']
});
// ============================================================================
// Queue Backup and Alerts
// ============================================================================
/**
 * Queue backup events (when queue depth exceeds threshold)
 */
exports.queueBackups = new prom_client_1.Counter({
    name: 'pdflab_queue_backups_total',
    help: 'Number of times queue depth exceeded threshold',
    labelNames: ['queue_name', 'threshold']
});
/**
 * Queue stalled jobs
 */
exports.queueStalledJobs = new prom_client_1.Counter({
    name: 'pdflab_queue_stalled_jobs_total',
    help: 'Number of stalled jobs detected',
    labelNames: ['queue_name']
});
/**
 * Queue circuit breaker state
 */
exports.queueCircuitBreakerState = new prom_client_1.Gauge({
    name: 'pdflab_queue_circuit_breaker_state',
    help: 'Circuit breaker state for queue (0=closed, 1=open, 2=half_open)',
    labelNames: ['queue_name']
});
// ============================================================================
// Queue Throughput Metrics
// ============================================================================
/**
 * Jobs processed per second
 */
exports.queueThroughput = new prom_client_1.Gauge({
    name: 'pdflab_queue_throughput_jobs_per_second',
    help: 'Current queue throughput in jobs per second',
    labelNames: ['queue_name']
});
/**
 * Queue capacity utilization (%)
 */
exports.queueCapacityUtilization = new prom_client_1.Gauge({
    name: 'pdflab_queue_capacity_utilization_percentage',
    help: 'Queue capacity utilization as percentage',
    labelNames: ['queue_name']
});
// ============================================================================
// Job Priority Metrics
// ============================================================================
/**
 * Jobs by priority level
 */
exports.jobsByPriority = new prom_client_1.Gauge({
    name: 'pdflab_queue_jobs_by_priority',
    help: 'Number of jobs by priority level',
    labelNames: ['queue_name', 'priority'] // high, normal, low
});
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get queue state counts from Bull queue
 */
async function getQueueStateCounts(queue) {
    try {
        const [waiting, active, delayed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getDelayedCount(),
            queue.getFailedCount()
        ]);
        return { waiting, active, delayed, failed };
    }
    catch (error) {
        logger_1.default.error('[Metrics] Failed to get queue state counts', { error });
        return { waiting: 0, active: 0, delayed: 0, failed: 0 };
    }
}
/**
 * Get oldest job age in seconds
 */
async function getOldestJobAge(queue) {
    try {
        const jobs = await queue.getWaiting(0, 1); // Get first waiting job
        if (jobs.length === 0)
            return 0;
        const oldestJob = jobs[0];
        const age = (Date.now() - oldestJob.timestamp) / 1000;
        return age;
    }
    catch (error) {
        logger_1.default.error('[Metrics] Failed to get oldest job age', { error });
        return 0;
    }
}
// ============================================================================
// Queue Monitoring Functions
// ============================================================================
/**
 * Update queue depth metrics
 */
async function updateQueueDepth(queueName, queue) {
    try {
        const states = await getQueueStateCounts(queue);
        exports.queueDepth.labels(queueName, 'waiting').set(states.waiting);
        exports.queueDepth.labels(queueName, 'active').set(states.active);
        exports.queueDepth.labels(queueName, 'delayed').set(states.delayed);
        exports.queueDepth.labels(queueName, 'failed').set(states.failed);
        // Update oldest job age
        const oldestAge = await getOldestJobAge(queue);
        exports.queueOldestJobAge.labels(queueName).set(oldestAge);
        logger_1.default.debug('[Metrics] Queue depth updated', {
            queueName,
            ...states,
            oldestAge
        });
    }
    catch (error) {
        logger_1.default.error('[Metrics] Failed to update queue depth', { queueName, error });
    }
}
/**
 * Track job processing duration
 */
function trackJobDuration(queueName, jobType, conversionType, durationSeconds) {
    exports.jobProcessingDuration.labels(queueName, jobType, conversionType).observe(durationSeconds);
    logger_1.default.debug('[Metrics] Job duration tracked', {
        queueName,
        jobType,
        conversionType,
        durationSeconds
    });
}
/**
 * Track job wait time
 */
function trackJobWaitTime(queueName, priority, waitTimeSeconds) {
    exports.jobWaitTime.labels(queueName, priority).observe(waitTimeSeconds);
    logger_1.default.debug('[Metrics] Job wait time tracked', {
        queueName,
        priority,
        waitTimeSeconds
    });
}
/**
 * Track job completion
 */
function trackJobCompletion(queueName, jobType, status) {
    exports.jobCompletions.labels(queueName, jobType, status).inc();
    logger_1.default.info('[Metrics] Job completion tracked', {
        queueName,
        jobType,
        status
    });
}
/**
 * Track job retry
 */
function trackJobRetry(queueName, jobType, retryReason, attemptNumber) {
    exports.jobRetries.labels(queueName, jobType, retryReason, attemptNumber.toString()).inc();
    logger_1.default.warn('[Metrics] Job retry tracked', {
        queueName,
        jobType,
        retryReason,
        attemptNumber
    });
}
/**
 * Track job failure
 */
function trackJobFailure(queueName, jobType, failureReason, isPermanent = false) {
    exports.jobFailures.labels(queueName, jobType, failureReason, isPermanent.toString()).inc();
    logger_1.default.error('[Metrics] Job failure tracked', {
        queueName,
        jobType,
        failureReason,
        isPermanent
    });
}
/**
 * Track queue backup event
 */
function trackQueueBackup(queueName, threshold, currentDepth) {
    exports.queueBackups.labels(queueName, threshold.toString()).inc();
    logger_1.default.error('[Metrics] Queue backup detected', {
        queueName,
        threshold,
        currentDepth
    });
}
/**
 * Track stalled job
 */
function trackStalledJob(queueName) {
    exports.queueStalledJobs.labels(queueName).inc();
    logger_1.default.error('[Metrics] Stalled job detected', { queueName });
}
/**
 * Update queue worker count
 */
function updateWorkerCount(queueName, status, count) {
    exports.queueWorkers.labels(queueName, status).set(count);
}
/**
 * Update queue throughput
 */
function updateQueueThroughput(queueName, jobsPerSecond) {
    exports.queueThroughput.labels(queueName).set(jobsPerSecond);
}
/**
 * Update queue capacity utilization
 */
function updateQueueCapacity(queueName, currentDepth, maxCapacity = 1000 // Default max capacity
) {
    const utilization = (currentDepth / maxCapacity) * 100;
    exports.queueCapacityUtilization.labels(queueName).set(utilization);
    if (utilization > 80) {
        logger_1.default.warn('[Metrics] Queue capacity high', {
            queueName,
            utilization,
            currentDepth,
            maxCapacity
        });
    }
}
/**
 * Update jobs by priority
 */
function updateJobsByPriority(queueName, priority, count) {
    exports.jobsByPriority.labels(queueName, priority).set(count);
}
/**
 * Update circuit breaker state
 */
function updateCircuitBreakerState(queueName, state) {
    const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    exports.queueCircuitBreakerState.labels(queueName).set(stateValue);
    if (state === 'open') {
        logger_1.default.error('[Metrics] Queue circuit breaker opened', { queueName });
    }
}
// ============================================================================
// Queue Health Check
// ============================================================================
/**
 * Check queue health and update metrics
 */
async function checkQueueHealth(queueName, queue, thresholds = {}) {
    const issues = [];
    try {
        const states = await getQueueStateCounts(queue);
        const totalJobs = states.waiting + states.active + states.delayed;
        const oldestAge = await getOldestJobAge(queue);
        // Check depth threshold
        if (thresholds.maxDepth && totalJobs > thresholds.maxDepth) {
            issues.push(`Queue depth ${totalJobs} exceeds threshold ${thresholds.maxDepth}`);
            trackQueueBackup(queueName, thresholds.maxDepth, totalJobs);
        }
        // Check wait time threshold
        if (thresholds.maxWaitTime && oldestAge > thresholds.maxWaitTime) {
            issues.push(`Oldest job age ${oldestAge}s exceeds threshold ${thresholds.maxWaitTime}s`);
        }
        // Check failure rate
        if (thresholds.maxFailureRate && totalJobs > 0) {
            const failureRate = (states.failed / totalJobs) * 100;
            if (failureRate > thresholds.maxFailureRate) {
                issues.push(`Failure rate ${failureRate.toFixed(2)}% exceeds threshold ${thresholds.maxFailureRate}%`);
            }
        }
        const healthy = issues.length === 0;
        if (!healthy) {
            logger_1.default.warn('[Metrics] Queue health check failed', {
                queueName,
                issues,
                states,
                oldestAge
            });
        }
        return { healthy, issues };
    }
    catch (error) {
        logger_1.default.error('[Metrics] Queue health check error', { queueName, error });
        return {
            healthy: false,
            issues: ['Health check error: ' + error.message]
        };
    }
}
// ============================================================================
// Periodic Queue Monitoring
// ============================================================================
/**
 * Start periodic queue monitoring
 */
function startQueueMonitoring(intervalMs = 10000) {
    logger_1.default.info('[Metrics] Starting periodic queue monitoring', { intervalMs });
    const interval = setInterval(async () => {
        try {
            // Monitor conversion queue
            if (redis_1.conversionQueue) {
                await updateQueueDepth('conversion', redis_1.conversionQueue);
                // Check health with thresholds
                await checkQueueHealth('conversion', redis_1.conversionQueue, {
                    maxDepth: 100,
                    maxWaitTime: 300, // 5 minutes
                    maxFailureRate: 10 // 10%
                });
            }
            // Monitor cleanup queue
            if (redis_1.cleanupQueue) {
                await updateQueueDepth('cleanup', redis_1.cleanupQueue);
            }
        }
        catch (error) {
            logger_1.default.error('[Metrics] Queue monitoring error', { error });
        }
    }, intervalMs);
    return interval;
}
logger_1.default.info('[Metrics] Queue metrics initialized');
//# sourceMappingURL=queue.metrics.js.map