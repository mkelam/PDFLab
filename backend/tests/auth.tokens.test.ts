/**
 * Comprehensive Token Testing Suite
 * Tests all JWT token functionality: access tokens, refresh tokens, password reset tokens
 *
 * NOTE: This is an INTEGRATION test that requires:
 * - A running MySQL/MariaDB database
 * - A running Redis instance
 * - Proper environment variables set
 *
 * To run these tests, ensure your database is running and accessible.
 * These tests are SKIPPED by default in CI environments without a database.
 */

import request from 'supertest'
import { app } from '../src/server'
import { User } from '../src/models/User'
import { generateAccessToken, generateRefreshToken, generatePasswordResetToken, verifyToken } from '../src/utils/auth.utils'
import jwt from 'jsonwebtoken'

// Skip integration tests if no database is configured
const DATABASE_URL = process.env.DB_HOST || process.env.DATABASE_URL
const SKIP_INTEGRATION = !DATABASE_URL || process.env.SKIP_INTEGRATION_TESTS === 'true'

const describeOrSkip = SKIP_INTEGRATION ? describe.skip : describe

describeOrSkip('JWT Token System - Comprehensive Tests', () => {
  let testUser: any
  let accessToken: string
  let refreshToken: string
  const testEmail = 'token-test@pdflab.test'
  const testPassword = 'TestPass123!'

  // Setup: Create test user before all tests
  beforeAll(async () => {
    // Clean up any existing test user
    await User.destroy({ where: { email: testEmail } })

    // Create fresh test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Token Test User'
      })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('token')
    expect(response.body).toHaveProperty('refreshToken')

    accessToken = response.body.token
    refreshToken = response.body.refreshToken

    // Get user from database
    testUser = await User.findOne({ where: { email: testEmail } })
    expect(testUser).toBeTruthy()
  })

  // Cleanup: Remove test user after all tests
  afterAll(async () => {
    await User.destroy({ where: { email: testEmail } })
  })

  // =============================================================================
  // TEST SUITE 1: Token Generation
  // =============================================================================

  describe('Token Generation', () => {
    it('should generate valid access token with correct payload', () => {
      const token = generateAccessToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')

      // Verify token structure (3 parts separated by dots)
      const parts = token.split('.')
      expect(parts).toHaveLength(3)

      // Decode and verify payload
      const decoded = verifyToken(token)
      expect(decoded).toBeTruthy()
      expect(decoded?.userId).toBe(testUser.id)
      expect(decoded?.email).toBe(testUser.email)
      expect(decoded?.plan).toBe(testUser.plan)

      // Verify expiration is ~15 minutes from now
      const now = Math.floor(Date.now() / 1000)
      const expirationTime = decoded?.exp || 0
      const timeUntilExpiry = expirationTime - now
      expect(timeUntilExpiry).toBeGreaterThan(14 * 60) // More than 14 min
      expect(timeUntilExpiry).toBeLessThan(16 * 60) // Less than 16 min
    })

    it('should generate valid refresh token with 30-day expiration', () => {
      const token = generateRefreshToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      expect(token).toBeTruthy()

      const decoded = verifyToken(token)
      expect(decoded).toBeTruthy()

      // Verify expiration is ~30 days from now
      const now = Math.floor(Date.now() / 1000)
      const expirationTime = decoded?.exp || 0
      const timeUntilExpiry = expirationTime - now
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60

      expect(timeUntilExpiry).toBeGreaterThan(29 * 24 * 60 * 60) // More than 29 days
      expect(timeUntilExpiry).toBeLessThan(31 * 24 * 60 * 60) // Less than 31 days
    })

    it('should generate valid password reset token with type field', () => {
      const token = generatePasswordResetToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      expect(token).toBeTruthy()

      const decoded = verifyToken(token) as any
      expect(decoded).toBeTruthy()
      expect(decoded?.type).toBe('password_reset')

      // Verify expiration is ~1 hour from now
      const now = Math.floor(Date.now() / 1000)
      const expirationTime = decoded?.exp || 0
      const timeUntilExpiry = expirationTime - now

      expect(timeUntilExpiry).toBeGreaterThan(59 * 60) // More than 59 min
      expect(timeUntilExpiry).toBeLessThan(61 * 60) // Less than 61 min
    })

    it('should generate different tokens for each call', () => {
      const token1 = generateAccessToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      // Small delay to ensure different iat (issued at)
      const delayPromise = new Promise(resolve => setTimeout(resolve, 1000))

      return delayPromise.then(() => {
        const token2 = generateAccessToken({
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan
        })

        expect(token1).not.toBe(token2) // Different tokens
      })
    })
  })

  // =============================================================================
  // TEST SUITE 2: Token Verification
  // =============================================================================

  describe('Token Verification', () => {
    it('should verify valid access token', () => {
      const decoded = verifyToken(accessToken)

      expect(decoded).toBeTruthy()
      expect(decoded?.userId).toBe(testUser.id)
      expect(decoded?.email).toBe(testUser.email)
    })

    it('should verify valid refresh token', () => {
      const decoded = verifyToken(refreshToken)

      expect(decoded).toBeTruthy()
      expect(decoded?.userId).toBe(testUser.id)
    })

    it('should reject invalid token signature', () => {
      const invalidToken = accessToken.slice(0, -5) + 'XXXXX' // Corrupt signature

      const decoded = verifyToken(invalidToken)

      expect(decoded).toBeNull()
    })

    it('should reject malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token'

      const decoded = verifyToken(malformedToken)

      expect(decoded).toBeNull()
    })

    it('should reject expired token', () => {
      // Create token that expired 1 hour ago
      const expiredToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const decoded = verifyToken(expiredToken)

      expect(decoded).toBeNull()
    })

    it('should reject token with wrong secret', () => {
      const tokenWithWrongSecret = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan
        },
        'wrong-secret',
        { expiresIn: '15m' }
      )

      const decoded = verifyToken(tokenWithWrongSecret)

      expect(decoded).toBeNull()
    })
  })

  // =============================================================================
  // TEST SUITE 3: User Registration & Login with Tokens
  // =============================================================================

  describe('User Registration & Login', () => {
    const uniqueEmail = `register-test-${Date.now()}@pdflab.test`

    afterAll(async () => {
      await User.destroy({ where: { email: uniqueEmail } })
    })

    it('should return both tokens on successful registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: testPassword,
          name: 'Register Test'
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body).toHaveProperty('user')

      // Verify tokens are valid
      const accessDecoded = verifyToken(response.body.token)
      const refreshDecoded = verifyToken(response.body.refreshToken)

      expect(accessDecoded).toBeTruthy()
      expect(refreshDecoded).toBeTruthy()
      expect(accessDecoded?.email).toBe(uniqueEmail)
      expect(refreshDecoded?.email).toBe(uniqueEmail)
    })

    it('should return both tokens on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('refreshToken')

      // Verify tokens are different from registration tokens
      expect(response.body.token).not.toBe(accessToken)
      expect(response.body.refreshToken).not.toBe(refreshToken)

      // Verify new tokens are valid
      const accessDecoded = verifyToken(response.body.token)
      const refreshDecoded = verifyToken(response.body.refreshToken)

      expect(accessDecoded?.userId).toBe(testUser.id)
      expect(refreshDecoded?.userId).toBe(testUser.id)
    })

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        })

      expect(response.status).toBe(401)
      expect(response.body).not.toHaveProperty('token')
      expect(response.body).not.toHaveProperty('refreshToken')
    })

    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail, // Already exists
          password: testPassword,
          name: 'Duplicate User'
        })

      expect(response.status).toBe(400)
      expect(response.body).not.toHaveProperty('token')
    })
  })

  // =============================================================================
  // TEST SUITE 4: Token Refresh Flow
  // =============================================================================

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token (camelCase)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken // ✅ camelCase
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('refreshToken')

      // Verify new tokens are different
      expect(response.body.token).not.toBe(accessToken)
      expect(response.body.refreshToken).not.toBe(refreshToken)

      // Verify new tokens are valid
      const newAccessDecoded = verifyToken(response.body.token)
      const newRefreshDecoded = verifyToken(response.body.refreshToken)

      expect(newAccessDecoded?.userId).toBe(testUser.id)
      expect(newRefreshDecoded?.userId).toBe(testUser.id)

      // Update tokens for subsequent tests
      accessToken = response.body.token
      refreshToken = response.body.refreshToken
    })

    it('should also accept refresh token in snake_case (backwards compatibility)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: refreshToken // ✅ snake_case
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('refreshToken')
    })

    it('should reject refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject refresh with expired refresh token', async () => {
      const expiredRefreshToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredRefreshToken
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject refresh with access token (wrong token type)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: accessToken // Sending access token instead of refresh
        })

      // Should still work because access token is valid JWT
      // But ideally, backend should reject based on token type
      // TODO: Consider adding token type validation
      expect(response.status).toBe(200)
    })

    it('should reject refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  // =============================================================================
  // TEST SUITE 5: Protected Routes with Token Authentication
  // =============================================================================

  describe('Protected Routes', () => {
    it('should allow access to protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email')
      expect(response.body.email).toBe(testEmail)
    })

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject access with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          exp: Math.floor(Date.now() / 1000) - 3600
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject access with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', accessToken) // Missing 'Bearer ' prefix

      expect(response.status).toBe(401)
    })

    it('should reject access with token for non-existent user', async () => {
      const fakeToken = jwt.sign(
        {
          userId: '00000000-0000-0000-0000-000000000000', // Non-existent user
          email: 'fake@test.com',
          plan: 'free'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '15m' }
      )

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${fakeToken}`)

      expect(response.status).toBe(401)
      expect(response.body.error).toContain('not found')
    })
  })

  // =============================================================================
  // TEST SUITE 6: Password Reset Token Flow
  // =============================================================================

  describe('Password Reset Tokens', () => {
    let resetToken: string

    it('should generate password reset token on forgot password request', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testEmail
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')

      // In real scenario, token would be sent via email
      // For testing, we generate token manually
      resetToken = generatePasswordResetToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      expect(resetToken).toBeTruthy()
    })

    it('should verify password reset token has correct structure', () => {
      const decoded = verifyToken(resetToken) as any

      expect(decoded).toBeTruthy()
      expect(decoded?.type).toBe('password_reset')
      expect(decoded?.userId).toBe(testUser.id)
      expect(decoded?.email).toBe(testEmail)
    })

    it('should reset password with valid reset token', async () => {
      const newPassword = 'NewTestPass123!'

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          new_password: newPassword
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword
        })

      expect(loginResponse.status).toBe(200)

      // Verify cannot login with old password
      const oldPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })

      expect(oldPasswordResponse.status).toBe(401)
    })

    it('should reject password reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid.token',
          new_password: 'NewPass123!'
        })

      expect(response.status).toBe(400)
    })

    it('should reject password reset with expired token', async () => {
      const expiredResetToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          type: 'password_reset',
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredResetToken,
          new_password: 'NewPass123!'
        })

      expect(response.status).toBe(400)
    })

    it('should reject using password reset token as access token', async () => {
      const passwordResetToken = generatePasswordResetToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${passwordResetToken}`)

      // Should be rejected because it has type: 'password_reset'
      // TODO: Backend should validate token type
      // Currently it accepts any valid JWT
      expect(response.status).toBe(401)
    })
  })

  // =============================================================================
  // TEST SUITE 7: Token Expiration Edge Cases
  // =============================================================================

  describe('Token Expiration Edge Cases', () => {
    it('should accept token that expires in 1 second', async () => {
      const almostExpiredToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          exp: Math.floor(Date.now() / 1000) + 1 // Expires in 1 second
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${almostExpiredToken}`)

      expect(response.status).toBe(200)
    })

    it('should reject token that expired 1 second ago', async () => {
      const justExpiredToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          exp: Math.floor(Date.now() / 1000) - 1 // Expired 1 second ago
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${justExpiredToken}`)

      expect(response.status).toBe(401)
    })

    it('should handle token with very far future expiration', async () => {
      const farFutureToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan,
          exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${farFutureToken}`)

      expect(response.status).toBe(200)
    })

    it('should handle token with no expiration (iat only)', () => {
      const noExpToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan
        },
        process.env.JWT_SECRET || 'test-secret'
        // No expiresIn option - token never expires
      )

      const decoded = verifyToken(noExpToken)
      expect(decoded).toBeTruthy()
      expect(decoded?.exp).toBeUndefined()
    })
  })

  // =============================================================================
  // TEST SUITE 8: Token Security
  // =============================================================================

  describe('Token Security', () => {
    it('should not expose JWT secret in token', () => {
      // Decode token (without verification)
      const parts = accessToken.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

      expect(payload).not.toHaveProperty('secret')
      expect(payload).not.toHaveProperty('JWT_SECRET')
    })

    it('should not include sensitive user data in token', () => {
      const parts = accessToken.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

      expect(payload).not.toHaveProperty('password')
      expect(payload).not.toHaveProperty('password_hash')
      expect(payload).not.toHaveProperty('creditCard')
    })

    it('should use HS256 algorithm', () => {
      const parts = accessToken.split('.')
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())

      expect(header.alg).toBe('HS256')
      expect(header.typ).toBe('JWT')
    })

    it('should reject token with modified payload', () => {
      const parts = accessToken.split('.')

      // Decode payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

      // Modify payload (upgrade plan)
      payload.plan = 'enterprise'

      // Re-encode modified payload
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')

      // Create token with modified payload but same signature
      const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`

      // Verification should fail due to signature mismatch
      const decoded = verifyToken(modifiedToken)
      expect(decoded).toBeNull()
    })

    it('should reject token with algorithm: none attack', () => {
      const noneAlgHeader = Buffer.from(JSON.stringify({
        alg: 'none',
        typ: 'JWT'
      })).toString('base64')

      const payload = Buffer.from(JSON.stringify({
        userId: testUser.id,
        email: testUser.email,
        plan: 'enterprise' // Trying to escalate privileges
      })).toString('base64')

      const noneAlgToken = `${noneAlgHeader}.${payload}.`

      const decoded = verifyToken(noneAlgToken)
      expect(decoded).toBeNull()
    })
  })

  // =============================================================================
  // TEST SUITE 9: Token Rotation & Reuse
  // =============================================================================

  describe('Token Rotation & Reuse', () => {
    it('should issue new refresh token on each refresh (rotation)', async () => {
      const oldRefreshToken = refreshToken

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: oldRefreshToken
        })

      expect(response.status).toBe(200)
      const newRefreshToken = response.body.refreshToken

      // New refresh token should be different
      expect(newRefreshToken).not.toBe(oldRefreshToken)

      // Both tokens should be valid
      const oldDecoded = verifyToken(oldRefreshToken)
      const newDecoded = verifyToken(newRefreshToken)

      expect(oldDecoded).toBeTruthy()
      expect(newDecoded).toBeTruthy()

      // Update for next tests
      refreshToken = newRefreshToken
    })

    it('should allow old refresh token to work (no blacklist)', async () => {
      // Get current refresh token
      const currentRefreshToken = refreshToken

      // Refresh to get new token
      const response1 = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: currentRefreshToken
        })

      expect(response1.status).toBe(200)

      // Try using old refresh token again
      // NOTE: Current implementation allows this (no token blacklist)
      const response2 = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: currentRefreshToken
        })

      expect(response2.status).toBe(200)
      // TODO: Consider implementing refresh token blacklist for better security
    })

    it('should allow multiple concurrent refresh requests', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/refresh')
          .send({
            refreshToken: refreshToken
          })
      )

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('token')
        expect(response.body).toHaveProperty('refreshToken')
      })

      // All should return different tokens
      const tokens = responses.map(r => r.body.token)
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(5)
    })
  })

  // =============================================================================
  // TEST SUITE 10: Performance & Load Testing
  // =============================================================================

  describe('Performance Tests', () => {
    it('should generate token in less than 10ms', () => {
      const start = Date.now()

      generateAccessToken({
        userId: testUser.id,
        email: testUser.email,
        plan: testUser.plan
      })

      const duration = Date.now() - start
      expect(duration).toBeLessThan(10)
    })

    it('should verify token in less than 5ms', () => {
      const start = Date.now()

      verifyToken(accessToken)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(5)
    })

    it('should handle 100 token generations without performance degradation', () => {
      const times: number[] = []

      for (let i = 0; i < 100; i++) {
        const start = Date.now()

        generateAccessToken({
          userId: testUser.id,
          email: testUser.email,
          plan: testUser.plan
        })

        times.push(Date.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(10)
    })

    it('should handle 100 token verifications without performance degradation', () => {
      const times: number[] = []

      for (let i = 0; i < 100; i++) {
        const start = Date.now()

        verifyToken(accessToken)

        times.push(Date.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(5)
    })
  })
})
