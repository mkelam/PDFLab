import { Request, Response, NextFunction } from 'express'
import {
  authMiddleware,
  requireAuth,
  optionalAuth,
  optionalAuthMiddleware,
  checkConversionQuota,
  requirePlan
} from '../../../src/middleware/auth.middleware'
import { verifyToken } from '../../../src/utils/auth.utils'
import { User } from '../../../src/models'
import logger from '../../../src/config/logger'

// Mock dependencies
jest.mock('../../../src/utils/auth.utils')
jest.mock('../../../src/models')
jest.mock('../../../src/config/logger')

describe('Auth Middleware Tests', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock request
    mockRequest = {
      headers: {},
      user: undefined,
      userId: undefined,
      userPlan: undefined,
      userRole: undefined
    }

    // Setup mock response
    const jsonMock = jest.fn()
    const statusMock = jest.fn(() => mockResponse)
    mockResponse = {
      status: statusMock as any,
      json: jsonMock
    }

    // Setup mock next
    mockNext = jest.fn()
  })

  // ============================================================================
  // authMiddleware / requireAuth
  // ============================================================================

  describe('authMiddleware (requireAuth)', () => {
    it('should reject requests without Authorization header', async () => {
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Please log in to access this feature',
        cta: {
          text: 'Log In',
          url: '/login'
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject requests with malformed Authorization header', async () => {
      mockRequest.headers = { authorization: 'Invalid-Format' }

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Please log in to access this feature',
        cta: {
          text: 'Log In',
          url: '/login'
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject requests with invalid JWT token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue(null)

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(verifyToken).toHaveBeenCalledWith('invalid-token')
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject requests when user not found in database', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(verifyToken).toHaveBeenCalledWith('valid-token')
      expect(User.findByPk).toHaveBeenCalledWith('user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found',
        message: 'User associated with this token does not exist'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should accept valid token and attach user to request', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'pro',
        role: 'user'
      }

      mockRequest.headers = { authorization: 'Bearer valid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(verifyToken).toHaveBeenCalledWith('valid-token')
      expect(User.findByPk).toHaveBeenCalledWith('user-123')
      expect(mockRequest.user).toBe(mockUser)
      expect(mockRequest.userId).toBe('user-123')
      expect(mockRequest.userPlan).toBe('pro')
      expect(mockRequest.userRole).toBe('user')
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'))

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(logger.error).toHaveBeenCalledWith('Auth middleware error:', { error: 'Database error' })
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should be aliased as requireAuth', () => {
      expect(requireAuth).toBe(authMiddleware)
    })
  })

  // ============================================================================
  // optionalAuth / optionalAuthMiddleware
  // ============================================================================

  describe('optionalAuth (optionalAuthMiddleware)', () => {
    it('should continue without user when no Authorization header', async () => {
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user when Authorization header is malformed', async () => {
      mockRequest.headers = { authorization: 'Invalid-Format' }

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user when token is invalid', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue(null)

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(verifyToken).toHaveBeenCalledWith('invalid-token')
      expect(mockNext).toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user when user not found in database', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(verifyToken).toHaveBeenCalledWith('valid-token')
      expect(User.findByPk).toHaveBeenCalledWith('user-123')
      expect(mockNext).toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should attach user to request when valid token provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'starter',
        role: 'user'
      }

      mockRequest.headers = { authorization: 'Bearer valid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(verifyToken).toHaveBeenCalledWith('valid-token')
      expect(User.findByPk).toHaveBeenCalledWith('user-123')
      expect(mockRequest.user).toBe(mockUser)
      expect(mockRequest.userId).toBe('user-123')
      expect(mockRequest.userPlan).toBe('starter')
      expect(mockRequest.userRole).toBe('user')
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user on database error', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'))

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should be aliased as optionalAuthMiddleware', () => {
      expect(optionalAuthMiddleware).toBe(optionalAuth)
    })
  })

  // ============================================================================
  // checkConversionQuota
  // ============================================================================

  describe('checkConversionQuota', () => {
    it('should allow guest users (no user) to proceed', async () => {
      mockRequest.user = undefined

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow users within quota to proceed', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro',
        conversions_used: 50,
        conversions_limit: 100,
        canConvert: jest.fn().mockReturnValue(true)
      } as any

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user.canConvert).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject users who have exceeded quota', async () => {
      const mockUser = {
        id: 'user-123',
        plan: 'starter',
        conversions_used: 100,
        conversions_limit: 100,
        canConvert: jest.fn().mockReturnValue(false)
      }
      mockRequest.user = mockUser as any

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockUser.canConvert).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Monthly limit reached',
          message: expect.stringContaining('used all 100 conversions'),
          conversions_used: 100,
          conversions_limit: 100,
          plan: 'starter',
          upgrade_required: true
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should provide upgrade options for free plan users', async () => {
      const mockUser = {
        id: 'user-123',
        plan: 'free',
        conversions_used: 10,
        conversions_limit: 10,
        canConvert: jest.fn().mockReturnValue(false)
      }
      mockRequest.user = mockUser as any

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, mockNext)

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(jsonCall.upgrade_options).toBeDefined()
      expect(jsonCall.upgrade_options.length).toBeGreaterThan(0)
      expect(jsonCall.upgrade_options.some((opt: any) => opt.plan === 'starter')).toBe(true)
    })

    it('should handle quota check errors gracefully', async () => {
      mockRequest.user = {
        id: 'user-123',
        canConvert: jest.fn().mockImplementation(() => {
          throw new Error('Quota check error')
        })
      } as any

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, mockNext)

      expect(logger.error).toHaveBeenCalledWith('Quota check error:', { error: 'Quota check error' })
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Quota check failed',
        message: 'An error occurred while checking your quota'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // requirePlan
  // ============================================================================

  describe('requirePlan', () => {
    it('should reject unauthenticated users', () => {
      mockRequest.user = undefined
      const middleware = requirePlan('pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow users with required plan', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro'
      } as any
      const middleware = requirePlan('pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject users without required plan', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'free'
      } as any
      const middleware = requirePlan('pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'This feature requires a pro or enterprise plan',
        current_plan: 'free',
        required_plans: ['pro', 'enterprise']
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should accept single plan requirement', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'enterprise'
      } as any
      const middleware = requirePlan('enterprise')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject when plan does not match single requirement', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'starter'
      } as any
      const middleware = requirePlan('enterprise')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'This feature requires a enterprise plan',
        current_plan: 'starter',
        required_plans: ['enterprise']
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
