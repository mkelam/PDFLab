import { GUEST_LIMITS, USER_PLAN_LIMITS } from '../../../src/config/constants'

describe('Constants', () => {
  describe('GUEST_LIMITS', () => {
    test('should have correct conversion limit', () => {
      expect(GUEST_LIMITS.MAX_CONVERSIONS).toBe(3)
    })

    test('should have correct file size limit', () => {
      expect(GUEST_LIMITS.MAX_FILE_SIZE_MB).toBe(10)
    })

    test('should have session duration', () => {
      expect(GUEST_LIMITS.SESSION_DURATION_HOURS).toBe(24)
    })

    test('should have file retention hours', () => {
      expect(GUEST_LIMITS.FILE_RETENTION_HOURS).toBe(1)
    })

    test('should have rate limit per hour', () => {
      expect(GUEST_LIMITS.RATE_LIMIT_PER_HOUR).toBe(5)
    })

    test('should have max files per upload', () => {
      expect(GUEST_LIMITS.MAX_FILES_PER_UPLOAD).toBe(1)
    })
  })

  describe('USER_PLAN_LIMITS', () => {
    test('should have all plan tiers', () => {
      expect(USER_PLAN_LIMITS).toHaveProperty('free')
      expect(USER_PLAN_LIMITS).toHaveProperty('starter')
      expect(USER_PLAN_LIMITS).toHaveProperty('pro')
      expect(USER_PLAN_LIMITS).toHaveProperty('enterprise')
    })

    test('free plan should have correct limits', () => {
      expect(USER_PLAN_LIMITS.free.MAX_CONVERSIONS).toBe(20)
      expect(USER_PLAN_LIMITS.free.MAX_FILE_SIZE_MB).toBe(25)
      expect(USER_PLAN_LIMITS.free.FILE_RETENTION_DAYS).toBe(7)
    })

    test('starter plan should have correct limits', () => {
      expect(USER_PLAN_LIMITS.starter.MAX_CONVERSIONS).toBe(50)
      expect(USER_PLAN_LIMITS.starter.MAX_FILE_SIZE_MB).toBe(50)
      expect(USER_PLAN_LIMITS.starter.FILE_RETENTION_DAYS).toBe(30)
    })

    test('pro plan should have correct limits', () => {
      expect(USER_PLAN_LIMITS.pro.MAX_CONVERSIONS).toBe(500)
      expect(USER_PLAN_LIMITS.pro.MAX_FILE_SIZE_MB).toBe(100)
      expect(USER_PLAN_LIMITS.pro.FILE_RETENTION_DAYS).toBe(90)
    })

    test('enterprise should have unlimited conversions', () => {
      expect(USER_PLAN_LIMITS.enterprise.MAX_CONVERSIONS).toBe(-1)
    })

    test('enterprise should have highest file size limit', () => {
      expect(USER_PLAN_LIMITS.enterprise.MAX_FILE_SIZE_MB).toBe(500)
    })

    test('enterprise should have longest retention period', () => {
      expect(USER_PLAN_LIMITS.enterprise.FILE_RETENTION_DAYS).toBe(365)
    })

    test('plan limits should be progressively higher', () => {
      expect(USER_PLAN_LIMITS.starter.MAX_CONVERSIONS).toBeGreaterThan(USER_PLAN_LIMITS.free.MAX_CONVERSIONS)
      expect(USER_PLAN_LIMITS.pro.MAX_CONVERSIONS).toBeGreaterThan(USER_PLAN_LIMITS.starter.MAX_CONVERSIONS)

      expect(USER_PLAN_LIMITS.starter.MAX_FILE_SIZE_MB).toBeGreaterThan(USER_PLAN_LIMITS.free.MAX_FILE_SIZE_MB)
      expect(USER_PLAN_LIMITS.pro.MAX_FILE_SIZE_MB).toBeGreaterThan(USER_PLAN_LIMITS.starter.MAX_FILE_SIZE_MB)
    })
  })
})
