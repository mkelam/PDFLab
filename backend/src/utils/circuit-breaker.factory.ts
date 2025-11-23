import CircuitBreaker from 'opossum'
import { CircuitBreakerConfig } from '../config/circuit-breaker'
import logger from '../config/logger'
import { circuitBreakerState, circuitBreakerCalls } from '../config/metrics'

export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string,
  config: CircuitBreakerConfig
): CircuitBreaker<T, R> {

  const breaker = new CircuitBreaker(fn, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
    volumeThreshold: config.volumeThreshold,
    name: name
  })

  // Event: Circuit opened (too many failures)
  breaker.on('open', () => {
    circuitBreakerState.set({ name }, 1)  // 1 = open
    logger.error(`Circuit breaker OPEN: ${name}`, {
      circuitBreaker: name,
      state: 'open',
      threshold: config.errorThresholdPercentage,
      message: 'Too many failures, rejecting requests'
    })
  })

  // Event: Circuit half-open (testing if service recovered)
  breaker.on('halfOpen', () => {
    circuitBreakerState.set({ name }, 2)  // 2 = half-open
    logger.warn(`Circuit breaker HALF-OPEN: ${name}`, {
      circuitBreaker: name,
      state: 'half-open',
      message: 'Testing if service recovered'
    })
  })

  // Event: Circuit closed (service healthy again)
  breaker.on('close', () => {
    circuitBreakerState.set({ name }, 0)  // 0 = closed
    logger.info(`Circuit breaker CLOSED: ${name}`, {
      circuitBreaker: name,
      state: 'closed',
      message: 'Service healthy, accepting requests'
    })
  })

  // Event: Request succeeded
  breaker.on('success', (result) => {
    circuitBreakerCalls.inc({ name, result: 'success' })
    logger.debug(`Circuit breaker success: ${name}`, {
      circuitBreaker: name,
      state: breaker.status.state
    })
  })

  // Event: Request failed
  breaker.on('failure', (error) => {
    circuitBreakerCalls.inc({ name, result: 'failure' })
    logger.warn(`Circuit breaker failure: ${name}`, {
      circuitBreaker: name,
      state: breaker.status.state,
      error: error.message
    })
  })

  // Event: Request rejected (circuit is open)
  breaker.on('reject', () => {
    circuitBreakerCalls.inc({ name, result: 'reject' })
    logger.error(`Circuit breaker REJECTED request: ${name}`, {
      circuitBreaker: name,
      state: 'open',
      message: 'Circuit is open, rejecting request without calling service'
    })
  })

  // Event: Request timed out
  breaker.on('timeout', () => {
    circuitBreakerCalls.inc({ name, result: 'timeout' })
    logger.error(`Circuit breaker TIMEOUT: ${name}`, {
      circuitBreaker: name,
      timeout: config.timeout,
      message: 'Request exceeded timeout limit'
    })
  })

  return breaker
}

export function getCircuitBreakerStats(breaker: CircuitBreaker<any, any>) {
  const stats = breaker.stats

  return {
    fires: stats.fires,           // Total calls
    successes: stats.successes,   // Successful calls
    failures: stats.failures,     // Failed calls
    rejects: stats.rejects,       // Rejected calls (circuit open)
    timeouts: stats.timeouts,     // Timed out calls
    fallbacks: stats.fallbacks,   // Fallback executions
    state: breaker.status.state,  // current state (open/closed/half-open)
    isOpen: breaker.opened,       // Is circuit open?
    percentiles: {
      p50: stats.percentiles['0.5'],
      p95: stats.percentiles['0.95'],
      p99: stats.percentiles['0.99']
    }
  }
}
