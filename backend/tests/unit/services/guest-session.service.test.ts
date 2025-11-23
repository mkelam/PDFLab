import GuestSessionService, { GuestSession } from '../../../src/services/guest-session.service'
import { redisClient } from '../../../src/config/redis'
import { GUEST_LIMITS, USER_PLAN_LIMITS } from '../../../src/config/constants'
import crypto from 'crypto'

// Mock Redis client
jest.mock('../../../src/config/redis', () => ({
  redisClient: {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    keys: jest.fn()
  }
}))

describe('Guest Session Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // generateSessionId
  // ============================================================================

  describe('generateSessionId', () => {
    it('should generate session ID with guest_ prefix', () => {
      const sessionId = GuestSessionService.generateSessionId()

      expect(sessionId).toMatch(/^guest_[0-9a-f-]{36}$/)
    })

    it('should generate unique session IDs', () => {
      const id1 = GuestSessionService.generateSessionId()
      const id2 = GuestSessionService.generateSessionId()
      const id3 = GuestSessionService.generateSessionId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should always start with guest_ prefix', () => {
      for (let i = 0; i < 10; i++) {
        const sessionId = GuestSessionService.generateSessionId()
        expect(sessionId.startsWith('guest_')).toBe(true)
      }
    })
  })

  // ============================================================================
  // createSession
  // ============================================================================

  describe('createSession', () => {
    it('should create a new guest session', async () => {
      const ipAddress = '192.168.1.1'
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      const session = await GuestSessionService.createSession(ipAddress)

      expect(session).toHaveProperty('sessionId')
      expect(session.sessionId).toMatch(/^guest_/)
      expect(session.ipAddress).toBe(ipAddress)
      expect(session.conversionsUsed).toBe(0)
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.lastConversionAt).toBeUndefined()
    })

    it('should store session in Redis with 7-day TTL', async () => {
      const ipAddress = '10.0.0.1'
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      const session = await GuestSessionService.createSession(ipAddress)

      expect(redisClient.setEx).toHaveBeenCalledWith(
        `guest:session:${session.sessionId}`,
        7 * 24 * 60 * 60, // 7 days in seconds
        expect.any(String)
      )
    })

    it('should serialize session data correctly', async () => {
      const ipAddress = '172.16.0.1'
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      await GuestSessionService.createSession(ipAddress)

      const setExCall = (redisClient.setEx as jest.Mock).mock.calls[0]
      const storedData = JSON.parse(setExCall[2])

      expect(storedData).toHaveProperty('sessionId')
      expect(storedData).toHaveProperty('createdAt')
      expect(storedData).toHaveProperty('conversionsUsed')
      expect(storedData).toHaveProperty('ipAddress')
      expect(storedData.conversionsUsed).toBe(0)
    })
  })

  // ============================================================================
  // getSession
  // ============================================================================

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const sessionId = 'guest_12345'
      const sessionData = {
        sessionId,
        createdAt: new Date('2025-01-01'),
        conversionsUsed: 2,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData))

      const session = await GuestSessionService.getSession(sessionId)

      expect(session).not.toBeNull()
      expect(session?.sessionId).toBe(sessionId)
      expect(session?.conversionsUsed).toBe(2)
      expect(session?.createdAt).toBeInstanceOf(Date)
      expect(redisClient.get).toHaveBeenCalledWith(`guest:session:${sessionId}`)
    })

    it('should return null for non-existent session', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)

      const session = await GuestSessionService.getSession('guest_nonexistent')

      expect(session).toBeNull()
    })

    it('should convert date strings to Date objects', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: '2025-01-01T00:00:00.000Z',
        lastConversionAt: '2025-01-02T12:30:00.000Z',
        conversionsUsed: 1,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData))

      const session = await GuestSessionService.getSession('guest_12345')

      expect(session?.createdAt).toBeInstanceOf(Date)
      expect(session?.lastConversionAt).toBeInstanceOf(Date)
      expect(session?.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z')
      expect(session?.lastConversionAt?.toISOString()).toBe('2025-01-02T12:30:00.000Z')
    })
  })

  // ============================================================================
  // updateSession
  // ============================================================================

  describe('updateSession', () => {
    it('should update session in Redis', async () => {
      const session: GuestSession = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: 3,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      await GuestSessionService.updateSession(session)

      expect(redisClient.setEx).toHaveBeenCalledWith(
        `guest:session:${session.sessionId}`,
        7 * 24 * 60 * 60,
        expect.any(String)
      )
    })

    it('should preserve session data when updating', async () => {
      const session: GuestSession = {
        sessionId: 'guest_12345',
        createdAt: new Date('2025-01-01'),
        conversionsUsed: 5,
        lastConversionAt: new Date('2025-01-03'),
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      await GuestSessionService.updateSession(session)

      const setExCall = (redisClient.setEx as jest.Mock).mock.calls[0]
      const storedData = JSON.parse(setExCall[2])

      expect(storedData.conversionsUsed).toBe(5)
      expect(storedData.ipAddress).toBe('192.168.1.1')
    })
  })

  // ============================================================================
  // hashIpAddress
  // ============================================================================

  describe('hashIpAddress', () => {
    it('should hash IP address consistently', () => {
      const ip = '192.168.1.1'

      const hash1 = GuestSessionService.hashIpAddress(ip)
      const hash2 = GuestSessionService.hashIpAddress(ip)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different IPs', () => {
      const hash1 = GuestSessionService.hashIpAddress('192.168.1.1')
      const hash2 = GuestSessionService.hashIpAddress('192.168.1.2')

      expect(hash1).not.toBe(hash2)
    })

    it('should produce 64-character hex hash', () => {
      const hash = GuestSessionService.hashIpAddress('10.0.0.1')

      expect(hash).toMatch(/^[0-9a-f]{64}$/)
      expect(hash.length).toBe(64)
    })

    it('should match crypto SHA-256 hash', () => {
      const ip = '172.16.0.1'
      const expectedHash = crypto.createHash('sha256').update(ip).digest('hex')

      const hash = GuestSessionService.hashIpAddress(ip)

      expect(hash).toBe(expectedHash)
    })
  })

  // ============================================================================
  // checkIpQuota
  // ============================================================================

  describe('checkIpQuota', () => {
    it('should allow IP with no conversions', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(-1)

      const result = await GuestSessionService.checkIpQuota('192.168.1.1')

      expect(result.allowed).toBe(true)
      expect(result.conversionsUsed).toBe(0)
      expect(result.resetAt).toBeInstanceOf(Date)
    })

    it('should allow IP within quota', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue('2')
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(3600)

      const result = await GuestSessionService.checkIpQuota('192.168.1.1')

      expect(result.allowed).toBe(true)
      expect(result.conversionsUsed).toBe(2)
    })

    it('should deny IP that has reached quota', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(String(GUEST_LIMITS.MAX_CONVERSIONS))
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(3600)

      const result = await GuestSessionService.checkIpQuota('192.168.1.1')

      expect(result.allowed).toBe(false)
      expect(result.conversionsUsed).toBe(GUEST_LIMITS.MAX_CONVERSIONS)
    })

    it('should calculate correct reset time', async () => {
      const ttl = 7200 // 2 hours
      ;(redisClient.get as jest.Mock).mockResolvedValue('1')
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(ttl)

      const before = Date.now()
      const result = await GuestSessionService.checkIpQuota('192.168.1.1')
      const after = Date.now()

      const expectedReset = before + ttl * 1000
      expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedReset - 1000)
      expect(result.resetAt.getTime()).toBeLessThanOrEqual(after + ttl * 1000)
    })

    it('should use hashed IP address for Redis key', async () => {
      const ip = '192.168.1.1'
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex')
      ;(redisClient.get as jest.Mock).mockResolvedValue('1')
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(3600)

      await GuestSessionService.checkIpQuota(ip)

      expect(redisClient.get).toHaveBeenCalledWith(`guest:ip:${ipHash}:conversions`)
    })
  })

  // ============================================================================
  // incrementIpConversions
  // ============================================================================

  describe('incrementIpConversions', () => {
    it('should increment existing IP conversion count', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue('2')
      ;(redisClient.incr as jest.Mock).mockResolvedValue(3)

      await GuestSessionService.incrementIpConversions('192.168.1.1')

      expect(redisClient.incr).toHaveBeenCalled()
      expect(redisClient.setEx).not.toHaveBeenCalled()
    })

    it('should initialize new IP with count of 1', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      await GuestSessionService.incrementIpConversions('192.168.1.1')

      const ipHash = crypto.createHash('sha256').update('192.168.1.1').digest('hex')
      expect(redisClient.setEx).toHaveBeenCalledWith(
        `guest:ip:${ipHash}:conversions`,
        24 * 60 * 60, // 24 hours
        '1'
      )
      expect(redisClient.incr).not.toHaveBeenCalled()
    })

    it('should use hashed IP address', async () => {
      const ip = '10.0.0.1'
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex')
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      await GuestSessionService.incrementIpConversions(ip)

      expect(redisClient.get).toHaveBeenCalledWith(`guest:ip:${ipHash}:conversions`)
    })
  })

  // ============================================================================
  // checkSessionQuota
  // ============================================================================

  describe('checkSessionQuota', () => {
    it('should allow non-existent session', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)

      const result = await GuestSessionService.checkSessionQuota('guest_nonexistent')

      expect(result.allowed).toBe(true)
      expect(result.conversionsUsed).toBe(0)
    })

    it('should allow session within quota', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: 1,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData))

      const result = await GuestSessionService.checkSessionQuota('guest_12345')

      expect(result.allowed).toBe(true)
      expect(result.conversionsUsed).toBe(1)
    })

    it('should deny session that has reached quota', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: GUEST_LIMITS.MAX_CONVERSIONS,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData))

      const result = await GuestSessionService.checkSessionQuota('guest_12345')

      expect(result.allowed).toBe(false)
      expect(result.conversionsUsed).toBe(GUEST_LIMITS.MAX_CONVERSIONS)
    })
  })

  // ============================================================================
  // incrementSessionConversions
  // ============================================================================

  describe('incrementSessionConversions', () => {
    it('should increment session conversion count', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: 2,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData))
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      await GuestSessionService.incrementSessionConversions('guest_12345')

      const setExCall = (redisClient.setEx as jest.Mock).mock.calls[0]
      const updatedData = JSON.parse(setExCall[2])

      expect(updatedData.conversionsUsed).toBe(3)
      expect(updatedData.lastConversionAt).toBeDefined()
    })

    it('should throw error for non-existent session', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)

      await expect(
        GuestSessionService.incrementSessionConversions('guest_nonexistent')
      ).rejects.toThrow('Session not found')
    })

    it('should update lastConversionAt timestamp', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date('2025-01-01'),
        conversionsUsed: 1,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(sessionData))
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      const before = Date.now()
      await GuestSessionService.incrementSessionConversions('guest_12345')
      const after = Date.now()

      const setExCall = (redisClient.setEx as jest.Mock).mock.calls[0]
      const updatedData = JSON.parse(setExCall[2])
      const lastConversion = new Date(updatedData.lastConversionAt).getTime()

      expect(lastConversion).toBeGreaterThanOrEqual(before)
      expect(lastConversion).toBeLessThanOrEqual(after)
    })
  })

  // ============================================================================
  // validateConversion
  // ============================================================================

  describe('validateConversion', () => {
    it('should deny conversion when IP quota exceeded', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(String(GUEST_LIMITS.MAX_CONVERSIONS))
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(3600)

      const result = await GuestSessionService.validateConversion(null, '192.168.1.1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Guest conversion limit reached')
      expect(result.resetAt).toBeInstanceOf(Date)
    })

    it('should create new session when no session ID provided', async () => {
      ;(redisClient.get as jest.Mock).mockResolvedValue(null)
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(-1)
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      const result = await GuestSessionService.validateConversion(null, '192.168.1.1')

      expect(result.allowed).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.sessionId).toMatch(/^guest_/)
      expect(redisClient.setEx).toHaveBeenCalled()
    })

    it('should allow conversion with valid session', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: 1,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // IP quota check
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // Session get
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(-1)

      const result = await GuestSessionService.validateConversion('guest_12345', '192.168.1.1')

      expect(result.allowed).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.conversionsUsed).toBe(1)
    })

    it('should deny conversion when session quota exceeded', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: GUEST_LIMITS.MAX_CONVERSIONS,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // IP quota check
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // Session get
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // Session quota check
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(-1)

      const result = await GuestSessionService.validateConversion('guest_12345', '192.168.1.1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('used all')
      expect(result.reason).toContain('Sign up')
    })

    it('should create new session when session expired', async () => {
      ;(redisClient.get as jest.Mock)
        .mockResolvedValueOnce(null) // IP quota check
        .mockResolvedValueOnce(null) // Session get (expired)
      ;(redisClient.ttl as jest.Mock).mockResolvedValue(-1)
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')

      const result = await GuestSessionService.validateConversion('guest_expired', '192.168.1.1')

      expect(result.allowed).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.conversionsUsed).toBe(0)
    })
  })

  // ============================================================================
  // recordConversion
  // ============================================================================

  describe('recordConversion', () => {
    it('should increment both session and IP conversions', async () => {
      const sessionData = {
        sessionId: 'guest_12345',
        createdAt: new Date(),
        conversionsUsed: 1,
        ipAddress: '192.168.1.1'
      }
      ;(redisClient.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(sessionData)) // Session get
        .mockResolvedValueOnce('2') // IP get
      ;(redisClient.setEx as jest.Mock).mockResolvedValue('OK')
      ;(redisClient.incr as jest.Mock).mockResolvedValue(3)

      await GuestSessionService.recordConversion('guest_12345', '192.168.1.1')

      expect(redisClient.setEx).toHaveBeenCalled() // Session update
      expect(redisClient.incr).toHaveBeenCalled() // IP increment
    })
  })

  // ============================================================================
  // deleteSession
  // ============================================================================

  describe('deleteSession', () => {
    it('should delete session from Redis', async () => {
      ;(redisClient.del as jest.Mock).mockResolvedValue(1)

      await GuestSessionService.deleteSession('guest_12345')

      expect(redisClient.del).toHaveBeenCalledWith('guest:session:guest_12345')
    })
  })

  // ============================================================================
  // getStats
  // ============================================================================

  describe('getStats', () => {
    it('should return session and IP statistics', async () => {
      ;(redisClient.keys as jest.Mock)
        .mockResolvedValueOnce(['guest:session:1', 'guest:session:2', 'guest:session:3'])
        .mockResolvedValueOnce(['guest:ip:hash1', 'guest:ip:hash2'])

      const stats = await GuestSessionService.getStats()

      expect(stats.activeSessions).toBe(3)
      expect(stats.totalIpAddresses).toBe(2)
    })

    it('should return zero when no sessions exist', async () => {
      ;(redisClient.keys as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const stats = await GuestSessionService.getStats()

      expect(stats.activeSessions).toBe(0)
      expect(stats.totalIpAddresses).toBe(0)
    })
  })
})
