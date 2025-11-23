import CircuitBreaker from 'opossum'

export interface CircuitBreakerConfig {
  timeout: number           // Time to wait before timing out request (ms)
  errorThresholdPercentage: number  // % of failures before opening circuit
  resetTimeout: number      // Time to wait before attempting to close circuit (ms)
  rollingCountTimeout: number  // Window for error percentage calculation (ms)
  rollingCountBuckets: number  // Number of buckets in rolling window
  volumeThreshold: number   // Minimum requests before circuit can open
}

export const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  timeout: 300000,           // 5 minutes (CloudConvert can be slow)
  errorThresholdPercentage: 50,  // Open if >50% of requests fail
  resetTimeout: 60000,       // Try to close circuit after 1 minute
  rollingCountTimeout: 10000,  // 10-second rolling window
  rollingCountBuckets: 10,   // 10 buckets = 1 second per bucket
  volumeThreshold: 5         // Need at least 5 requests in window
}

export const cloudConvertConfig: CircuitBreakerConfig = {
  timeout: 300000,           // 5 minutes for large files
  errorThresholdPercentage: 60,  // CloudConvert can be flaky, allow 60% failure
  resetTimeout: 120000,      // 2 minutes before retry
  rollingCountTimeout: 30000,  // 30-second window
  rollingCountBuckets: 10,
  volumeThreshold: 3
}
