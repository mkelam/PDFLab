import { createCircuitBreaker, getCircuitBreakerStats } from '../../../src/utils/circuit-breaker.factory'
import { defaultCircuitBreakerConfig } from '../../../src/config/circuit-breaker'

describe('Circuit Breaker Factory', () => {
  describe('createCircuitBreaker', () => {
    test('should create circuit breaker with config', () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-breaker', defaultCircuitBreakerConfig)

      expect(breaker).toBeDefined()
      expect(breaker.name).toBe('test-breaker')
      // Circuit should start closed (status may be undefined initially)
      expect(breaker.opened).toBe(false)
    })

    test('should track successful calls', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-success', defaultCircuitBreakerConfig)

      const result = await breaker.fire()
      const stats = getCircuitBreakerStats(breaker)

      expect(result).toBe('success')
      expect(stats.successes).toBe(1)
      expect(stats.failures).toBe(0)
      expect(stats.fires).toBe(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('should track failed calls', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'))
      const breaker = createCircuitBreaker(mockFn, 'test-failure', defaultCircuitBreakerConfig)

      try {
        await breaker.fire()
      } catch (error) {
        // Expected error
      }

      const stats = getCircuitBreakerStats(breaker)
      expect(stats.failures).toBe(1)
      expect(stats.successes).toBe(0)
      expect(stats.fires).toBe(1)
    })

    test('should handle multiple successful calls', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-multiple', defaultCircuitBreakerConfig)

      await breaker.fire()
      await breaker.fire()
      await breaker.fire()

      const stats = getCircuitBreakerStats(breaker)
      expect(stats.successes).toBe(3)
      expect(stats.fires).toBe(3)
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    test('should maintain circuit state', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-state', defaultCircuitBreakerConfig)

      await breaker.fire()
      const stats = getCircuitBreakerStats(breaker)

      // Circuit should remain closed after successful call
      expect(stats.isOpen).toBe(false)
      expect(stats.successes).toBe(1)
    })
  })

  describe('getCircuitBreakerStats', () => {
    test('should return complete stats object', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-stats', defaultCircuitBreakerConfig)

      await breaker.fire()
      const stats = getCircuitBreakerStats(breaker)

      expect(stats).toHaveProperty('fires')
      expect(stats).toHaveProperty('successes')
      expect(stats).toHaveProperty('failures')
      expect(stats).toHaveProperty('rejects')
      expect(stats).toHaveProperty('timeouts')
      expect(stats).toHaveProperty('fallbacks')
      expect(stats).toHaveProperty('state')
      expect(stats).toHaveProperty('isOpen')
      expect(stats).toHaveProperty('percentiles')
    })

    test('should include percentile data', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-percentiles', defaultCircuitBreakerConfig)

      await breaker.fire()
      const stats = getCircuitBreakerStats(breaker)

      expect(stats.percentiles).toHaveProperty('p50')
      expect(stats.percentiles).toHaveProperty('p95')
      expect(stats.percentiles).toHaveProperty('p99')
    })

    test('should track zero failures initially', () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const breaker = createCircuitBreaker(mockFn, 'test-initial', defaultCircuitBreakerConfig)

      const stats = getCircuitBreakerStats(breaker)

      expect(stats.fires).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.failures).toBe(0)
      expect(stats.rejects).toBe(0)
    })
  })

  describe('Circuit Breaker Config', () => {
    test('should use custom config values', () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const customConfig = {
        ...defaultCircuitBreakerConfig,
        timeout: 5000,
        errorThresholdPercentage: 75
      }

      const breaker = createCircuitBreaker(mockFn, 'test-custom', customConfig)

      expect(breaker).toBeDefined()
      expect(breaker.name).toBe('test-custom')
    })
  })
})
