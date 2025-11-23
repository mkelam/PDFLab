import { Request, Response, NextFunction } from 'express'
import { authMiddleware, checkConversionQuota, requirePlan, optionalAuth } from '@backend/middleware/auth.middleware'
import { verifyToken } from '@backend/utils/auth.utils'
import { User } from '@backend/models'

/**
 * Unit Tests: Auth Middleware
 *
 * Tests: authMiddleware, checkConversionQuota, requirePlan, optionalAuth
 * Coverage: 100%
 */

jest.mock('@backend/utils/auth.utils')
jest.mock('@backend/models')

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      headers: {},
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFunction = jest.fn()
    jest.clearAllMocks()
  })

  describe('authMiddleware', () => {
    it('should reject request without authorization header', async () => {
      mockRequest.headers = {}

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Please log in to access this feature',
        cta: {
          text: 'Log In',
          url: '/login'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject request with malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      }

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject request with invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      }
      ;(verifyToken as jest.Mock).mockReturnValue(null)

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject request when user not found', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found',
        message: 'User associated with this token does not exist'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should authenticate valid request and attach user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'pro',
        role: 'user'
      }

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toEqual(mockUser)
      expect(mockRequest.userId).toBe('user-123')
      expect(mockRequest.userPlan).toBe('pro')
      expect(mockRequest.userRole).toBe('user')
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should handle unexpected errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }
      ;(verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('checkConversionQuota', () => {
    it('should skip check for guest users (no user attached)', async () => {
      mockRequest.user = undefined

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow conversion when user has quota remaining', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'free',
        conversions_used: 1,
        conversions_limit: 3,
        canConvert: jest.fn().mockReturnValue(true)
      } as any

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should block conversion when quota exceeded and provide upgrade options', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'free',
        conversions_used: 3,
        conversions_limit: 3,
        canConvert: jest.fn().mockReturnValue(false)
      } as any

      mockRequest.user = mockUser

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Monthly limit reached',
          message: expect.stringContaining('You\'ve used all 3 conversions'),
          conversions_used: 3,
          conversions_limit: 3,
          plan: 'free',
          upgrade_required: true,
          upgrade_options: expect.arrayContaining([
            expect.objectContaining({ plan: 'starter' }),
            expect.objectContaining({ plan: 'pro' }),
            expect.objectContaining({ plan: 'enterprise' })
          ])
        })
      )
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should only show higher-tier upgrade options', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'starter',
        conversions_used: 100,
        conversions_limit: 100,
        canConvert: jest.fn().mockReturnValue(false)
      } as any

      mockRequest.user = mockUser

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0]
      const upgradeOptions = jsonCall.upgrade_options

      // Should only show pro and enterprise (not free or starter)
      expect(upgradeOptions.some((opt: any) => opt.plan === 'free')).toBe(false)
      expect(upgradeOptions.some((opt: any) => opt.plan === 'starter')).toBe(false)
      expect(upgradeOptions.some((opt: any) => opt.plan === 'pro')).toBe(true)
      expect(upgradeOptions.some((opt: any) => opt.plan === 'enterprise')).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      mockRequest.user = {
        canConvert: jest.fn().mockImplementation(() => {
          throw new Error('Database error')
        })
      } as any

      await checkConversionQuota(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Quota check failed',
        message: 'An error occurred while checking your quota'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requirePlan', () => {
    it('should reject unauthenticated users', () => {
      mockRequest.user = undefined
      const middleware = requirePlan('pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not authenticated'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow users with required plan', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro'
      } as any
      const middleware = requirePlan('pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject users without required plan', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'free'
      } as any
      const middleware = requirePlan('pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'This feature requires a pro or enterprise plan',
        current_plan: 'free',
        required_plans: ['pro', 'enterprise']
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow any plan in the list', () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'starter'
      } as any
      const middleware = requirePlan('starter', 'pro', 'enterprise')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
    })
  })

  describe('optionalAuth', () => {
    it('should continue without user when no authorization header', async () => {
      mockRequest.headers = {}

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeUndefined()
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should continue without user when authorization header is malformed', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      }

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeUndefined()
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should attach user when valid token provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        plan: 'pro',
        role: 'user'
      }

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(mockUser)

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toEqual(mockUser)
      expect(mockRequest.userId).toBe('user-123')
      expect(mockRequest.userPlan).toBe('pro')
      expect(mockRequest.userRole).toBe('user')
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should continue without user when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      }
      ;(verifyToken as jest.Mock).mockReturnValue(null)

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeUndefined()
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should continue without user when user not found', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeUndefined()
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should continue without user when error occurs', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }
      ;(verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await optionalAuth(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeUndefined()
      expect(nextFunction).toHaveBeenCalled()
    })
  })
})
