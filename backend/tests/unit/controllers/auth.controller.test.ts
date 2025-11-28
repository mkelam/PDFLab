/**
 * Comprehensive Unit Tests for Auth Controller
 * Tests all authentication endpoints: register, login, profile, refresh, password reset
 */

import { Request, Response } from 'express'

// Mock all dependencies before importing the controller
jest.mock('../../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  UserPlan: {
    FREE: 'free',
    STARTER: 'starter',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
  },
  ConversionJob: {
    update: jest.fn()
  },
  UserAttribution: {
    create: jest.fn()
  },
  Partner: {},
  PromoCode: {
    findOne: jest.fn()
  },
  PasswordHistory: {
    findAll: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/utils/auth.utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password_123'),
  verifyPassword: jest.fn(),
  generateAccessToken: jest.fn().mockReturnValue('mock_access_token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
  generatePasswordResetToken: jest.fn().mockReturnValue('mock_reset_token'),
  isValidEmail: jest.fn(),
  isValidPassword: jest.fn(),
  verifyToken: jest.fn()
}))

jest.mock('../../../src/utils/sanitize.utils', () => ({
  sanitizeText: jest.fn((text) => text)
}))

jest.mock('../../../src/services/email.service', () => ({
  __esModule: true,
  default: {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../../src/services/guest-session.service', () => ({
  __esModule: true,
  default: {
    getSession: jest.fn(),
    deleteSession: jest.fn()
  }
}))

jest.mock('../../../src/middleware/attribution.middleware', () => ({
  getAttributionData: jest.fn()
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

// Import after mocking
import { register, login, getProfile, refreshToken, forgotPassword, resetPassword } from '../../../src/controllers/auth.controller'
import { User, ConversionJob, UserAttribution, PromoCode, PasswordHistory } from '../../../src/models'
import * as authUtils from '../../../src/utils/auth.utils'
import emailService from '../../../src/services/email.service'
import GuestSessionService from '../../../src/services/guest-session.service'
import { getAttributionData } from '../../../src/middleware/attribution.middleware'

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: jest.Mock
  let responseStatus: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    responseJson = jest.fn()
    responseStatus = jest.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      body: {},
      cookies: {},
      user: undefined
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson,
      clearCookie: jest.fn()
    }
  })

  // =========================================================================
  // REGISTER TESTS
  // =========================================================================
  describe('register', () => {
    describe('Validation', () => {
      it('should return 400 if email is missing', async () => {
        mockRequest.body = { password: 'ValidPass123!' }

        await register(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Missing required fields',
          message: 'Email and password are required'
        })
      })

      it('should return 400 if password is missing', async () => {
        mockRequest.body = { email: 'test@example.com' }

        await register(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Missing required fields',
          message: 'Email and password are required'
        })
      })

      it('should return 422 for invalid email format', async () => {
        mockRequest.body = { email: 'invalid-email', password: 'ValidPass123!' }
        ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(false)

        await register(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(422)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        })
      })

      it('should return 400 for weak password', async () => {
        mockRequest.body = { email: 'test@example.com', password: 'weak' }
        ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(true)
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({
          valid: false,
          errors: ['Password must be at least 8 characters']
        })

        await register(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Weak password',
          message: 'Password must be at least 8 characters',
          errors: ['Password must be at least 8 characters']
        })
      })

      it('should return 400 if email already exists', async () => {
        mockRequest.body = { email: 'existing@example.com', password: 'ValidPass123!' }
        ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(true)
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({ valid: true, errors: [] })
        ;(User.findOne as jest.Mock).mockResolvedValue({ id: 'existing-user-id' })

        await register(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Email already exists',
          message: 'An account with this email already exists'
        })
      })
    })

    describe('Successful Registration', () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'Test User',
        role: 'user',
        plan: 'free',
        conversions_used: 0,
        conversions_limit: 3,
        save: jest.fn()
      }

      beforeEach(() => {
        ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(true)
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({ valid: true, errors: [] })
        ;(User.findOne as jest.Mock).mockResolvedValue(null)
        ;(User.create as jest.Mock).mockResolvedValue(mockUser)
        ;(UserAttribution.create as jest.Mock).mockResolvedValue({})
        ;(getAttributionData as jest.Mock).mockReturnValue(null)
      })

      it('should successfully register a new user', async () => {
        mockRequest.body = {
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'Test User'
        }

        await register(mockRequest as Request, mockResponse as Response)

        expect(User.create).toHaveBeenCalled()
        expect(responseStatus).toHaveBeenCalledWith(201)
        expect(responseJson).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User registered successfully',
            user: expect.objectContaining({
              id: 'new-user-id',
              email: 'new@example.com'
            }),
            token: 'mock_access_token',
            refreshToken: 'mock_refresh_token'
          })
        )
      })

      it('should send welcome email on registration', async () => {
        mockRequest.body = {
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'Test User'
        }

        await register(mockRequest as Request, mockResponse as Response)

        expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('new@example.com', 'Test User')
      })

      it('should create attribution record for organic signup', async () => {
        mockRequest.body = {
          email: 'new@example.com',
          password: 'ValidPass123!'
        }

        await register(mockRequest as Request, mockResponse as Response)

        expect(UserAttribution.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'new-user-id',
            partner_id: undefined,
            attribution_method: 'manual'
          })
        )
      })

      it('should handle promo code during registration', async () => {
        const mockPromoCode = {
          id: 'promo-id',
          partner_id: 'partner-id',
          isValid: jest.fn().mockReturnValue(true),
          incrementUse: jest.fn().mockResolvedValue(undefined)
        }
        ;(PromoCode.findOne as jest.Mock).mockResolvedValue(mockPromoCode)

        mockRequest.body = {
          email: 'new@example.com',
          password: 'ValidPass123!',
          promo_code: 'SAVE20'
        }

        await register(mockRequest as Request, mockResponse as Response)

        expect(PromoCode.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { code: 'SAVE20', is_active: true }
          })
        )
        expect(mockPromoCode.incrementUse).toHaveBeenCalled()
        expect(UserAttribution.create).toHaveBeenCalledWith(
          expect.objectContaining({
            partner_id: 'partner-id',
            promo_code_id: 'promo-id',
            attribution_method: 'promo_code'
          })
        )
      })

      it('should migrate guest session on registration', async () => {
        const guestSession = { id: 'guest-session-id', conversions: 2 }
        ;(GuestSessionService.getSession as jest.Mock).mockResolvedValue(guestSession)
        ;(ConversionJob.update as jest.Mock).mockResolvedValue([2])

        mockRequest.body = {
          email: 'new@example.com',
          password: 'ValidPass123!'
        }
        mockRequest.cookies = { guest_session_id: 'guest-session-id' }

        await register(mockRequest as Request, mockResponse as Response)

        expect(GuestSessionService.getSession).toHaveBeenCalledWith('guest-session-id')
        expect(ConversionJob.update).toHaveBeenCalled()
        expect(GuestSessionService.deleteSession).toHaveBeenCalledWith('guest-session-id')
        expect(mockResponse.clearCookie).toHaveBeenCalledWith('guest_session_id')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 on unexpected error', async () => {
        mockRequest.body = { email: 'test@example.com', password: 'ValidPass123!' }
        ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(true)
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({ valid: true, errors: [] })
        ;(User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'))

        await register(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(500)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Registration failed',
          message: 'An error occurred during registration'
        })
      })
    })
  })

  // =========================================================================
  // LOGIN TESTS
  // =========================================================================
  describe('login', () => {
    describe('Validation', () => {
      it('should return 400 if email is missing', async () => {
        mockRequest.body = { password: 'password123' }

        await login(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Missing credentials',
          message: 'Email and password are required'
        })
      })

      it('should return 400 if password is missing', async () => {
        mockRequest.body = { email: 'test@example.com' }

        await login(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Missing credentials',
          message: 'Email and password are required'
        })
      })
    })

    describe('Authentication', () => {
      it('should return 401 if user not found', async () => {
        mockRequest.body = { email: 'nonexistent@example.com', password: 'password123' }
        ;(User.findOne as jest.Mock).mockResolvedValue(null)

        await login(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(401)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        })
      })

      it('should return 401 if password is incorrect', async () => {
        const mockUser = {
          id: 'user-id',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          save: jest.fn()
        }
        mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' }
        ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
        ;(authUtils.verifyPassword as jest.Mock).mockResolvedValue(false)

        await login(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(401)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        })
      })

      it('should successfully login with correct credentials', async () => {
        const mockUser = {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          plan: 'free',
          password_hash: 'hashed_password',
          conversions_used: 5,
          conversions_limit: 10,
          last_login: null,
          save: jest.fn()
        }
        mockRequest.body = { email: 'test@example.com', password: 'correctpassword' }
        ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
        ;(authUtils.verifyPassword as jest.Mock).mockResolvedValue(true)

        await login(mockRequest as Request, mockResponse as Response)

        expect(mockUser.save).toHaveBeenCalled()
        expect(responseStatus).toHaveBeenCalledWith(200)
        expect(responseJson).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Login successful',
            user: expect.objectContaining({
              id: 'user-id',
              email: 'test@example.com'
            }),
            token: 'mock_access_token',
            refreshToken: 'mock_refresh_token'
          })
        )
      })

      it('should update last_login on successful login', async () => {
        const mockUser = {
          id: 'user-id',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          last_login: null,
          save: jest.fn()
        }
        mockRequest.body = { email: 'test@example.com', password: 'correctpassword' }
        ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)
        ;(authUtils.verifyPassword as jest.Mock).mockResolvedValue(true)

        await login(mockRequest as Request, mockResponse as Response)

        expect(mockUser.last_login).toBeInstanceOf(Date)
        expect(mockUser.save).toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('should return 500 on unexpected error', async () => {
        mockRequest.body = { email: 'test@example.com', password: 'password123' }
        ;(User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'))

        await login(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(500)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Login failed',
          message: 'An error occurred during login'
        })
      })
    })
  })

  // =========================================================================
  // GET PROFILE TESTS
  // =========================================================================
  describe('getProfile', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined

      await getProfile(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({ error: 'User not authenticated' })
    })

    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        plan: 'pro',
        conversions_used: 50,
        conversions_limit: 100,
        subscription_status: 'active',
        subscription_end_date: new Date('2025-12-31'),
        created_at: new Date('2024-01-01'),
        last_login: new Date('2025-01-15')
      }
      mockRequest.user = mockUser as any

      await getProfile(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        plan: 'pro',
        conversions_used: 50,
        conversions_limit: 100,
        subscription_status: 'active',
        subscription_end_date: mockUser.subscription_end_date,
        created_at: mockUser.created_at,
        last_login: mockUser.last_login
      })
    })
  })

  // =========================================================================
  // REFRESH TOKEN TESTS
  // =========================================================================
  describe('refreshToken', () => {
    it('should return 400 if refresh token is missing', async () => {
      mockRequest.body = {}

      await refreshToken(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      })
    })

    it('should accept refreshToken in camelCase', async () => {
      mockRequest.body = { refreshToken: 'valid_refresh_token' }
      ;(authUtils.verifyToken as jest.Mock).mockReturnValue({ userId: 'user-id' })
      ;(User.findByPk as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        plan: 'free'
      })

      await refreshToken(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(200)
    })

    it('should accept refresh_token in snake_case for backwards compatibility', async () => {
      mockRequest.body = { refresh_token: 'valid_refresh_token' }
      ;(authUtils.verifyToken as jest.Mock).mockReturnValue({ userId: 'user-id' })
      ;(User.findByPk as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        plan: 'free'
      })

      await refreshToken(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(200)
    })

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = { refreshToken: 'invalid_token' }
      ;(authUtils.verifyToken as jest.Mock).mockReturnValue(null)

      await refreshToken(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      })
    })

    it('should return 401 if user not found', async () => {
      mockRequest.body = { refreshToken: 'valid_token' }
      ;(authUtils.verifyToken as jest.Mock).mockReturnValue({ userId: 'nonexistent-user' })
      ;(User.findByPk as jest.Mock).mockResolvedValue(null)

      await refreshToken(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'User not found',
        message: 'User associated with this token does not exist'
      })
    })

    it('should return new tokens on successful refresh', async () => {
      mockRequest.body = { refreshToken: 'valid_refresh_token' }
      ;(authUtils.verifyToken as jest.Mock).mockReturnValue({ userId: 'user-id' })
      ;(User.findByPk as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        plan: 'pro'
      })

      await refreshToken(mockRequest as Request, mockResponse as Response)

      expect(authUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: 'user-id',
        email: 'test@example.com',
        plan: 'pro'
      })
      expect(authUtils.generateRefreshToken).toHaveBeenCalled()
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        token: 'mock_access_token',
        refreshToken: 'mock_refresh_token'
      })
    })
  })

  // =========================================================================
  // FORGOT PASSWORD TESTS
  // =========================================================================
  describe('forgotPassword', () => {
    it('should return 400 if email is missing', async () => {
      mockRequest.body = {}

      await forgotPassword(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Missing email',
        message: 'Email is required'
      })
    })

    it('should return 422 for invalid email format', async () => {
      mockRequest.body = { email: 'invalid-email' }
      ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(false)

      await forgotPassword(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toHaveBeenCalledWith(422)
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      })
    })

    it('should return success even if user does not exist (security)', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' }
      ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(true)
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      await forgotPassword(mockRequest as Request, mockResponse as Response)

      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    })

    it('should send reset email if user exists', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com', plan: 'free' }
      mockRequest.body = { email: 'test@example.com' }
      ;(authUtils.isValidEmail as jest.Mock).mockReturnValue(true)
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

      await forgotPassword(mockRequest as Request, mockResponse as Response)

      expect(authUtils.generatePasswordResetToken).toHaveBeenCalledWith({
        userId: 'user-id',
        email: 'test@example.com',
        plan: 'free'
      })
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'mock_reset_token'
      )
      expect(responseStatus).toHaveBeenCalledWith(200)
    })
  })

  // =========================================================================
  // RESET PASSWORD TESTS
  // =========================================================================
  describe('resetPassword', () => {
    describe('Validation', () => {
      it('should return 400 if token is missing', async () => {
        mockRequest.body = { new_password: 'NewPass123!' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Missing required fields',
          message: 'Token and new password are required'
        })
      })

      it('should return 400 if new_password is missing', async () => {
        mockRequest.body = { token: 'reset_token' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Missing required fields',
          message: 'Token and new password are required'
        })
      })

      it('should return 422 for weak password', async () => {
        mockRequest.body = { token: 'reset_token', new_password: 'weak' }
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({
          valid: false,
          errors: ['Password must be at least 8 characters']
        })

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(422)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Weak password',
          message: 'Password must be at least 8 characters',
          errors: ['Password must be at least 8 characters']
        })
      })
    })

    describe('Token Verification', () => {
      beforeEach(() => {
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({ valid: true, errors: [] })
      })

      it('should return 401 for invalid token', async () => {
        mockRequest.body = { token: 'invalid_token', new_password: 'NewPass123!' }
        ;(authUtils.verifyToken as jest.Mock).mockReturnValue(null)

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(401)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Invalid token',
          message: 'Password reset token is invalid or has expired'
        })
      })

      it('should return 401 for non-password-reset token type', async () => {
        mockRequest.body = { token: 'access_token', new_password: 'NewPass123!' }
        ;(authUtils.verifyToken as jest.Mock).mockReturnValue({
          userId: 'user-id',
          type: 'access' // Not a password_reset token
        })

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(401)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Invalid token type',
          message: 'This token is not valid for password reset'
        })
      })

      it('should return 404 if user not found', async () => {
        mockRequest.body = { token: 'valid_reset_token', new_password: 'NewPass123!' }
        ;(authUtils.verifyToken as jest.Mock).mockReturnValue({
          userId: 'nonexistent-user',
          type: 'password_reset'
        })
        ;(User.findByPk as jest.Mock).mockResolvedValue(null)

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(404)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'User not found',
          message: 'User associated with this token does not exist'
        })
      })
    })

    describe('Password Reset Logic', () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'old_hashed_password',
        failed_reset_attempts: 0,
        reset_locked_until: null,
        save: jest.fn()
      }

      beforeEach(() => {
        ;(authUtils.isValidPassword as jest.Mock).mockReturnValue({ valid: true, errors: [] })
        ;(authUtils.verifyToken as jest.Mock).mockReturnValue({
          userId: 'user-id',
          type: 'password_reset'
        })
        ;(User.findByPk as jest.Mock).mockResolvedValue({ ...mockUser })
        ;(PasswordHistory.findAll as jest.Mock).mockResolvedValue([])
        ;(PasswordHistory.create as jest.Mock).mockResolvedValue({})
      })

      it('should return 429 if account is locked', async () => {
        const lockedUser = {
          ...mockUser,
          reset_locked_until: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
        }
        ;(User.findByPk as jest.Mock).mockResolvedValue(lockedUser)

        mockRequest.body = { token: 'valid_reset_token', new_password: 'NewPass123!' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(429)
        expect(responseJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Account locked'
          })
        )
      })

      it('should return 400 if new password matches current password', async () => {
        ;(authUtils.verifyPassword as jest.Mock).mockResolvedValue(true) // Same as current
        ;(User.findByPk as jest.Mock).mockResolvedValue({
          ...mockUser,
          failed_reset_attempts: 0,
          save: jest.fn()
        })

        mockRequest.body = { token: 'valid_reset_token', new_password: 'SamePassword123!' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Password reuse not allowed',
          message: 'New password cannot be the same as your current password'
        })
      })

      it('should return 400 if password is in history', async () => {
        ;(authUtils.verifyPassword as jest.Mock)
          .mockResolvedValueOnce(false) // Not same as current
          .mockResolvedValueOnce(true) // Matches history entry

        const historyEntry = { password_hash: 'old_password_hash' }
        ;(PasswordHistory.findAll as jest.Mock).mockResolvedValue([historyEntry])
        ;(User.findByPk as jest.Mock).mockResolvedValue({
          ...mockUser,
          failed_reset_attempts: 0,
          save: jest.fn()
        })

        mockRequest.body = { token: 'valid_reset_token', new_password: 'OldPassword123!' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Password reuse not allowed',
          message: 'New password cannot be one of your last 5 passwords. Please choose a different password.'
        })
      })

      it('should successfully reset password', async () => {
        const userToReset = {
          ...mockUser,
          failed_reset_attempts: 0,
          reset_locked_until: null,
          save: jest.fn()
        }
        ;(authUtils.verifyPassword as jest.Mock).mockResolvedValue(false) // Not same as current
        ;(User.findByPk as jest.Mock).mockResolvedValue(userToReset)

        mockRequest.body = { token: 'valid_reset_token', new_password: 'NewSecurePass123!' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(PasswordHistory.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-id',
            password_hash: 'old_hashed_password'
          })
        )
        expect(authUtils.hashPassword).toHaveBeenCalledWith('NewSecurePass123!')
        expect(userToReset.password_hash).toBe('hashed_password_123')
        expect(userToReset.failed_reset_attempts).toBe(0)
        expect(userToReset.save).toHaveBeenCalled()
        expect(responseStatus).toHaveBeenCalledWith(200)
        expect(responseJson).toHaveBeenCalledWith({
          success: true,
          message: 'Password has been reset successfully'
        })
      })

      it('should lock account after 5 failed attempts', async () => {
        const userWithAttempts = {
          ...mockUser,
          failed_reset_attempts: 4, // One more attempt will lock
          save: jest.fn()
        }
        ;(authUtils.verifyPassword as jest.Mock).mockResolvedValue(true) // Same as current (failed attempt)
        ;(User.findByPk as jest.Mock).mockResolvedValue(userWithAttempts)

        mockRequest.body = { token: 'valid_reset_token', new_password: 'SamePassword123!' }

        await resetPassword(mockRequest as Request, mockResponse as Response)

        expect(userWithAttempts.failed_reset_attempts).toBe(5)
        expect(userWithAttempts.reset_locked_until).toBeInstanceOf(Date)
        expect(responseStatus).toHaveBeenCalledWith(400)
        expect(responseJson).toHaveBeenCalledWith({
          error: 'Too many attempts',
          message: 'Account has been locked due to too many failed password reset attempts. Please try again in 30 minutes.'
        })
      })
    })
  })
})
