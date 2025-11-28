/**
 * E2E Tests for Authentication API Endpoints
 * Tests complete auth flows: register, login, profile, refresh, password reset
 */

import request from 'supertest'
import { Express } from 'express'

// Mock all external dependencies
jest.mock('../../src/config/database', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  syncDatabase: jest.fn().mockResolvedValue(true),
  sequelize: {
    close: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(false),
  closeQueues: jest.fn().mockResolvedValue(undefined),
  redisClient: {
    ping: jest.fn().mockResolvedValue('PONG'),
    isOpen: false
  }
}))

jest.mock('../../src/models', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    name: 'Test User',
    plan: 'free',
    role: 'user',
    conversions_used: 0,
    conversions_limit: 10,
    failed_login_attempts: 0,
    account_locked_until: null,
    save: jest.fn().mockResolvedValue(true),
    toJSON: () => ({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free',
      role: 'user'
    })
  }

  return {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn()
    },
    ConversionJob: {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn()
    },
    PromoCode: {
      findOne: jest.fn()
    },
    mockUser
  }
})

jest.mock('../../src/services/email.service', () => ({
  default: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true)
  }
}))

jest.mock('../../src/services/guest-session.service', () => ({
  default: {
    getSession: jest.fn().mockResolvedValue(null),
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'guest-session-123',
      createdAt: new Date(),
      conversionsUsed: 0,
      ipAddress: '127.0.0.1'
    }),
    validateConversion: jest.fn().mockResolvedValue({ allowed: true }),
    recordConversion: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../src/utils/auth.utils', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  verifyPassword: jest.fn()
}))

jest.mock('../../src/config/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Import after mocks
import { app } from '../../src/server'
import { User, mockUser } from '../../src/models'
import { verifyToken, verifyPassword, verifyRefreshToken } from '../../src/utils/auth.utils'

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // =========================================================================
  // POST /api/auth/register
  // =========================================================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null) // No existing user
      ;(User.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        toJSON: () => ({
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          plan: 'free',
          role: 'user'
        })
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User'
        })
        .expect(201)

      expect(response.body).toHaveProperty('message', 'User registered successfully')
      expect(response.body).toHaveProperty('token')
      expect(response.body.user).toHaveProperty('email', 'newuser@example.com')
    })

    it('should reject registration with existing email', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.message).toContain('already')
    })

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: '123', // Too short
          name: 'Test User'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject registration without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com'
          // Missing password and name
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  // =========================================================================
  // POST /api/auth/login
  // =========================================================================
  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const userWithMethods = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          plan: 'free',
          role: 'user'
        })
      }

      ;(User.findOne as jest.Mock).mockResolvedValue(userWithMethods)
      ;(verifyPassword as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Login successful')
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body.user).toHaveProperty('email', 'test@example.com')
    })

    it('should reject login with invalid password', async () => {
      const userWithMethods = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(true)
      }

      ;(User.findOne as jest.Mock).mockResolvedValue(userWithMethods)
      ;(verifyPassword as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!'
        })
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.message).toContain('Invalid')
    })

    it('should reject login with non-existent user', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject login for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        account_locked_until: new Date(Date.now() + 60000), // Locked for 1 minute
        failed_login_attempts: 5
      }

      ;(User.findOne as jest.Mock).mockResolvedValue(lockedUser)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SomePassword123!'
        })
        .expect(423) // Locked

      expect(response.body).toHaveProperty('error')
      expect(response.body.message).toContain('locked')
    })
  })

  // =========================================================================
  // GET /api/auth/profile
  // =========================================================================
  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        toJSON: () => ({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          plan: 'free',
          role: 'user',
          conversions_used: 5,
          conversions_limit: 10
        })
      })

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body.user).toHaveProperty('email', 'test@example.com')
      expect(response.body.user).toHaveProperty('plan', 'free')
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.body).toHaveProperty('error', 'Authentication required')
    })

    it('should reject request with invalid token', async () => {
      ;(verifyToken as jest.Mock).mockReturnValue(null)

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toHaveProperty('error', 'Invalid token')
    })
  })

  // =========================================================================
  // POST /api/auth/refresh
  // =========================================================================
  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
      ;(User.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        toJSON: () => ({
          id: 'user-123',
          email: 'test@example.com',
          plan: 'free'
        })
      })

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('refreshToken')
    })

    it('should reject refresh with invalid refresh token', async () => {
      ;(verifyRefreshToken as jest.Mock).mockReturnValue(null)

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  // =========================================================================
  // POST /api/auth/forgot-password
  // =========================================================================
  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const userWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(true)
      }
      ;(User.findOne as jest.Mock).mockResolvedValue(userWithSave)

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('reset')
    })

    it('should return success even for non-existent email (security)', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200)

      // Should not reveal whether email exists
      expect(response.body).toHaveProperty('message')
    })

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  // =========================================================================
  // POST /api/auth/reset-password
  // =========================================================================
  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const userWithSave = {
        ...mockUser,
        reset_token: 'valid-reset-token',
        reset_token_expiry: new Date(Date.now() + 3600000), // 1 hour from now
        password_history: [],
        save: jest.fn().mockResolvedValue(true)
      }
      ;(User.findOne as jest.Mock).mockResolvedValue(userWithSave)

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'NewSecurePass123!'
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('reset')
    })

    it('should reject expired reset token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        reset_token: 'expired-token',
        reset_token_expiry: new Date(Date.now() - 3600000) // 1 hour ago
      }
      ;(User.findOne as jest.Mock).mockResolvedValue(userWithExpiredToken)

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          newPassword: 'NewSecurePass123!'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.message).toContain('expired')
    })

    it('should reject invalid reset token', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewSecurePass123!'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('timestamp')
    })
  })
})
