"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudConvertConfig = exports.defaultCircuitBreakerConfig = void 0;
exports.defaultCircuitBreakerConfig = {
    timeout: 300000, // 5 minutes (CloudConvert can be slow)
    errorThresholdPercentage: 50, // Open if >50% of requests fail
    resetTimeout: 60000, // Try to close circuit after 1 minute
    rollingCountTimeout: 10000, // 10-second rolling window
    rollingCountBuckets: 10, // 10 buckets = 1 second per bucket
    volumeThreshold: 5 // Need at least 5 requests in window
};
exports.cloudConvertConfig = {
    timeout: 300000, // 5 minutes for large files
    errorThresholdPercentage: 60, // CloudConvert can be flaky, allow 60% failure
    resetTimeout: 120000, // 2 minutes before retry
    rollingCountTimeout: 30000, // 30-second window
    rollingCountBuckets: 10,
    volumeThreshold: 3
};
//# sourceMappingURL=circuit-breaker.js.map