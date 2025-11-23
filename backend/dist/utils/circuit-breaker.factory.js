"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCircuitBreaker = createCircuitBreaker;
exports.getCircuitBreakerStats = getCircuitBreakerStats;
const opossum_1 = __importDefault(require("opossum"));
const logger_1 = __importDefault(require("../config/logger"));
const metrics_1 = require("../config/metrics");
function createCircuitBreaker(fn, name, config) {
    const breaker = new opossum_1.default(fn, {
        timeout: config.timeout,
        errorThresholdPercentage: config.errorThresholdPercentage,
        resetTimeout: config.resetTimeout,
        rollingCountTimeout: config.rollingCountTimeout,
        rollingCountBuckets: config.rollingCountBuckets,
        volumeThreshold: config.volumeThreshold,
        name: name
    });
    // Event: Circuit opened (too many failures)
    breaker.on('open', () => {
        metrics_1.circuitBreakerState.set({ name }, 1); // 1 = open
        logger_1.default.error(`Circuit breaker OPEN: ${name}`, {
            circuitBreaker: name,
            state: 'open',
            threshold: config.errorThresholdPercentage,
            message: 'Too many failures, rejecting requests'
        });
    });
    // Event: Circuit half-open (testing if service recovered)
    breaker.on('halfOpen', () => {
        metrics_1.circuitBreakerState.set({ name }, 2); // 2 = half-open
        logger_1.default.warn(`Circuit breaker HALF-OPEN: ${name}`, {
            circuitBreaker: name,
            state: 'half-open',
            message: 'Testing if service recovered'
        });
    });
    // Event: Circuit closed (service healthy again)
    breaker.on('close', () => {
        metrics_1.circuitBreakerState.set({ name }, 0); // 0 = closed
        logger_1.default.info(`Circuit breaker CLOSED: ${name}`, {
            circuitBreaker: name,
            state: 'closed',
            message: 'Service healthy, accepting requests'
        });
    });
    // Event: Request succeeded
    breaker.on('success', (result) => {
        metrics_1.circuitBreakerCalls.inc({ name, result: 'success' });
        logger_1.default.debug(`Circuit breaker success: ${name}`, {
            circuitBreaker: name,
            state: breaker.status.state
        });
    });
    // Event: Request failed
    breaker.on('failure', (error) => {
        metrics_1.circuitBreakerCalls.inc({ name, result: 'failure' });
        logger_1.default.warn(`Circuit breaker failure: ${name}`, {
            circuitBreaker: name,
            state: breaker.status.state,
            error: error.message
        });
    });
    // Event: Request rejected (circuit is open)
    breaker.on('reject', () => {
        metrics_1.circuitBreakerCalls.inc({ name, result: 'reject' });
        logger_1.default.error(`Circuit breaker REJECTED request: ${name}`, {
            circuitBreaker: name,
            state: 'open',
            message: 'Circuit is open, rejecting request without calling service'
        });
    });
    // Event: Request timed out
    breaker.on('timeout', () => {
        metrics_1.circuitBreakerCalls.inc({ name, result: 'timeout' });
        logger_1.default.error(`Circuit breaker TIMEOUT: ${name}`, {
            circuitBreaker: name,
            timeout: config.timeout,
            message: 'Request exceeded timeout limit'
        });
    });
    return breaker;
}
function getCircuitBreakerStats(breaker) {
    const stats = breaker.stats;
    return {
        fires: stats.fires, // Total calls
        successes: stats.successes, // Successful calls
        failures: stats.failures, // Failed calls
        rejects: stats.rejects, // Rejected calls (circuit open)
        timeouts: stats.timeouts, // Timed out calls
        fallbacks: stats.fallbacks, // Fallback executions
        state: breaker.status.state, // current state (open/closed/half-open)
        isOpen: breaker.opened, // Is circuit open?
        percentiles: {
            p50: stats.percentiles['0.5'],
            p95: stats.percentiles['0.95'],
            p99: stats.percentiles['0.99']
        }
    };
}
//# sourceMappingURL=circuit-breaker.factory.js.map