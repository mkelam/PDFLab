/**
 * Comprehensive Unit Tests for Guest Middleware
 * Tests guest session initialization, quota validation, and conversion recording
 */

import { Request, Response, NextFunction } from 'express'

// Mock dependencies
jest.mock('../../../src/services/guest-session.service', () => ({
  __esModule: true,
  default: {
    getSession: jest.fn(),
    createSession: jest.fn(),
    validateConversion: jest.fn(),
    recordConversion: jest.fn()
  }
}))

jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('../../../src/config/constants', () => ({
  GUEST_LIMITS: {
    MAX_CONVERSIONS: 3,
    MAX_FILE_SIZE_MB: 5
  },
  USER_PLAN_LIMITS: {
    free: {
      MAX_CONVERSIONS: 10,
      MAX_FILE_SIZE_MB: 10,
      FILE_RETENTION_DAYS: 7
    },
    starter: {
      MAX_CONVERSIONS: 100,
      MAX_FILE_SIZE_MB: 50,
      FILE_RETENTION_DAYS: 30
    }
  }
}))

import {
  initializeGuestSession,
  validateGuestQuota,
  recordGuestConversion,
  authOrGuest,
  getClientIp
} from '../../../src/middleware/guest.middleware'
import GuestSessionService from '../../../src/services/guest-session.service'

describe('Guest Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let mockJson: jest.Mock
  let mockStatus: jest.Mock
  let mockCookie: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })
    mockCookie = jest.fn()
    mockNext = jest.fn()

    mockReq = {
      headers: {},
      cookies: {},
      user: undefined,
      guestSession: undefined,
      isGuest: undefined,
      socket: { remoteAddress: '192.168.1.1' } as any
    }

    mockRes = {
      status: mockStatus,
      json: mockJson,
      cookie: mockCookie
    }
  })

  // =========================================================================
  // getClientIp TESTS
  // =========================================================================
  describe('getClientIp', () => {
    it('should return x-forwarded-for IP when present', () => {
      mockReq.headers = { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' }

      const ip = getClientIp(mockReq as Request)

      expect(ip).toBe('10.0.0.1')
    })

    it('should return x-real-ip when x-forwarded-for is not present', () => {
      mockReq.headers = { 'x-real-ip': '10.0.0.3' }

      const ip = getClientIp(mockReq as Request)

      expect(ip).toBe('10.0.0.3')
    })

    it('should return socket remote address as fallback', () => {
      mockReq.headers = {}
      mockReq.socket = { remoteAddress: '192.168.1.100' } as any

      const ip = getClientIp(mockReq as Request)

      expect(ip).toBe('192.168.1.100')
    })

    it('should return "unknown" when no IP can be determined', () => {
      mockReq.headers = {}
      mockReq.socket = { remoteAddress: undefined } as any

      const ip = getClientIp(mockReq as Request)

      expect(ip).toBe('unknown')
    })

    it('should trim whitespace from x-forwarded-for', () => {
      mockReq.headers = { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' }

      const ip = getClientIp(mockReq as Request)

      expect(ip).toBe('10.0.0.1')
    })
  })

  // =========================================================================
  // initializeGuestSession TESTS
  // =========================================================================
  describe('initializeGuestSession', () => {
    describe('Authenticated Users', () => {
      it('should skip session creation for authenticated users', async () => {
        mockReq.user = { id: 'user-123' } as any

        await initializeGuestSession(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.isGuest).toBe(false)
        expect(mockNext).toHaveBeenCalled()
        expect(GuestSessionService.createSession).not.toHaveBeenCalled()
      })
    })

    describe('Existing Session', () => {
      it('should retrieve existing session from cookie', async () => {
        const mockSession = {
          sessionId: 'session-123',
          createdAt: new Date(),
          conversionsUsed: 1,
          ipAddress: '192.168.1.1'
        }
        mockReq.cookies = { guest_session_id: 'session-123' }
        ;(GuestSessionService.getSession as jest.Mock).mockResolvedValue(mockSession)

        await initializeGuestSession(mockReq as Request, mockRes as Response, mockNext)

        expect(GuestSessionService.getSession).toHaveBeenCalledWith('session-123')
        expect(mockReq.guestSession).toBe(mockSession)
        expect(mockReq.isGuest).toBe(true)
        expect(mockNext).toHaveBeenCalled()
      })

      it('should create new session if existing session not found', async () => {
        const newSession = {
          sessionId: 'new-session-456',
          createdAt: new Date(),
          conversionsUsed: 0,
          ipAddress: '192.168.1.1'
        }
        mockReq.cookies = { guest_session_id: 'expired-session' }
        ;(GuestSessionService.getSession as jest.Mock).mockResolvedValue(null)
        ;(GuestSessionService.createSession as jest.Mock).mockResolvedValue(newSession)

        await initializeGuestSession(mockReq as Request, mockRes as Response, mockNext)

        expect(GuestSessionService.createSession).toHaveBeenCalledWith('192.168.1.1')
        expect(mockReq.guestSession).toBe(newSession)
      })
    })

    describe('New Session', () => {
      it('should create new session when no cookie exists', async () => {
        const newSession = {
          sessionId: 'new-session-789',
          createdAt: new Date(),
          conversionsUsed: 0,
          ipAddress: '192.168.1.1'
        }
        mockReq.cookies = {}
        ;(GuestSessionService.createSession as jest.Mock).mockResolvedValue(newSession)

        await initializeGuestSession(mockReq as Request, mockRes as Response, mockNext)

        expect(GuestSessionService.createSession).toHaveBeenCalledWith('192.168.1.1')
        expect(mockReq.guestSession).toBe(newSession)
        expect(mockReq.isGuest).toBe(true)
        expect(mockCookie).toHaveBeenCalledWith(
          'guest_session_id',
          'new-session-789',
          expect.objectContaining({
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax'
          })
        )
        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('should continue without blocking on errors', async () => {
        mockReq.cookies = {}
        ;(GuestSessionService.createSession as jest.Mock).mockRejectedValue(new Error('Redis error'))

        await initializeGuestSession(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.isGuest).toBe(true)
        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })
    })
  })

  // =========================================================================
  // validateGuestQuota TESTS
  // =========================================================================
  describe('validateGuestQuota', () => {
    describe('Authenticated Users', () => {
      it('should skip validation for authenticated users', async () => {
        mockReq.user = { id: 'user-123' } as any

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(GuestSessionService.validateConversion).not.toHaveBeenCalled()
      })
    })

    describe('Quota Not Exceeded', () => {
      it('should allow conversion when quota not exceeded', async () => {
        mockReq.guestSession = { sessionId: 'session-123', ipAddress: '192.168.1.1' } as any
        ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({
          allowed: true,
          session: null
        })

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(GuestSessionService.validateConversion).toHaveBeenCalledWith('session-123', '192.168.1.1')
        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })

      it('should update session cookie if new session created', async () => {
        const newSession = {
          sessionId: 'new-session-456',
          createdAt: new Date(),
          conversionsUsed: 0,
          ipAddress: '192.168.1.1'
        }
        mockReq.guestSession = undefined
        ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({
          allowed: true,
          session: newSession
        })

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.guestSession).toBe(newSession)
        expect(mockCookie).toHaveBeenCalledWith(
          'guest_session_id',
          'new-session-456',
          expect.any(Object)
        )
        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('Quota Exceeded', () => {
      it('should return 429 when quota exceeded', async () => {
        const resetAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
        mockReq.guestSession = { sessionId: 'session-123' } as any
        ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({
          allowed: false,
          reason: 'Guest quota exceeded',
          resetAt
        })

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(429)
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should include quota details in error response', async () => {
        const resetAt = new Date(Date.now() + 6 * 60 * 60 * 1000)
        mockReq.guestSession = { sessionId: 'session-123' } as any
        ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({
          allowed: false,
          reason: 'You have used all your free conversions',
          resetAt
        })

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Guest quota exceeded',
            message: 'You have used all your free conversions',
            resetAt: expect.any(Date),
            hoursUntilReset: expect.any(Number),
            upgrade_required: true
          })
        )
      })

      it('should include upgrade options in error response', async () => {
        mockReq.guestSession = { sessionId: 'session-123' } as any
        ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({
          allowed: false,
          reason: 'Quota exceeded',
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            upgrade_benefits: expect.objectContaining({
              free_account: expect.any(Object),
              starter_plan: expect.any(Object)
            }),
            options: expect.arrayContaining([
              expect.objectContaining({
                id: 'signup',
                cta: 'Create Free Account',
                primary: true
              })
            ])
          })
        )
      })
    })

    describe('Error Handling', () => {
      it('should return 500 on validation errors', async () => {
        mockReq.guestSession = { sessionId: 'session-123' } as any
        ;(GuestSessionService.validateConversion as jest.Mock).mockRejectedValue(new Error('Redis error'))

        await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(500)
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            message: 'Unable to validate guest quota. Please try again.'
          })
        )
        expect(mockNext).not.toHaveBeenCalled()
      })
    })
  })

  // =========================================================================
  // recordGuestConversion TESTS
  // =========================================================================
  describe('recordGuestConversion', () => {
    describe('Authenticated Users', () => {
      it('should skip recording for authenticated users', async () => {
        mockReq.user = { id: 'user-123' } as any

        await recordGuestConversion(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(GuestSessionService.recordConversion).not.toHaveBeenCalled()
      })
    })

    describe('Guest Users', () => {
      it('should record conversion for guest users', async () => {
        mockReq.guestSession = { sessionId: 'session-123' } as any
        ;(GuestSessionService.recordConversion as jest.Mock).mockResolvedValue(undefined)

        await recordGuestConversion(mockReq as Request, mockRes as Response, mockNext)

        expect(GuestSessionService.recordConversion).toHaveBeenCalledWith('session-123', '192.168.1.1')
        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('should continue without blocking on errors', async () => {
        mockReq.guestSession = { sessionId: 'session-123' } as any
        ;(GuestSessionService.recordConversion as jest.Mock).mockRejectedValue(new Error('Recording failed'))

        await recordGuestConversion(mockReq as Request, mockRes as Response, mockNext)

        // Should still call next - don't block user on recording errors
        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })

      it('should continue when guest session is missing', async () => {
        mockReq.guestSession = undefined

        await recordGuestConversion(mockReq as Request, mockRes as Response, mockNext)

        // Should still call next - don't block user
        expect(mockNext).toHaveBeenCalled()
      })
    })
  })

  // =========================================================================
  // authOrGuest TESTS
  // =========================================================================
  describe('authOrGuest', () => {
    describe('Authenticated Users', () => {
      it('should allow authenticated users to proceed', async () => {
        mockReq.user = { id: 'user-123' } as any

        await authOrGuest(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })
    })

    describe('Guest Users', () => {
      it('should allow guest users with session to proceed', async () => {
        mockReq.guestSession = { sessionId: 'session-123' } as any

        await authOrGuest(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })
    })

    describe('No Authentication or Session', () => {
      it('should return 401 when neither authenticated nor guest session', async () => {
        mockReq.user = undefined
        mockReq.guestSession = undefined

        await authOrGuest(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(401)
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should include helpful options in error response', async () => {
        mockReq.user = undefined
        mockReq.guestSession = undefined

        await authOrGuest(mockReq as Request, mockRes as Response, mockNext)

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Authentication required',
            message: expect.stringContaining('cookies'),
            options: expect.arrayContaining([
              expect.objectContaining({
                id: 'enable_cookies'
              }),
              expect.objectContaining({
                id: 'login',
                cta: 'Log In',
                url: '/login'
              })
            ])
          })
        )
      })
    })
  })

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================
  describe('Integration Tests', () => {
    it('should handle complete guest flow', async () => {
      const newSession = {
        sessionId: 'session-123',
        createdAt: new Date(),
        conversionsUsed: 0,
        ipAddress: '192.168.1.1'
      }

      // Step 1: Initialize session
      mockReq.cookies = {}
      ;(GuestSessionService.createSession as jest.Mock).mockResolvedValue(newSession)

      await initializeGuestSession(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.guestSession).toBe(newSession)
      expect(mockReq.isGuest).toBe(true)

      // Step 2: Validate quota
      mockNext.mockClear()
      ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({ allowed: true })

      await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()

      // Step 3: Record conversion
      mockNext.mockClear()
      ;(GuestSessionService.recordConversion as jest.Mock).mockResolvedValue(undefined)

      await recordGuestConversion(mockReq as Request, mockRes as Response, mockNext)

      expect(GuestSessionService.recordConversion).toHaveBeenCalledWith('session-123', '192.168.1.1')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should block guest when quota exceeded', async () => {
      mockReq.guestSession = { sessionId: 'session-123' } as any
      ;(GuestSessionService.validateConversion as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Quota exceeded',
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })

      await validateGuestQuota(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(429)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
