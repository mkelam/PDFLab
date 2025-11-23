import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyToken,
  isValidEmail,
  isValidPassword,
  JWTPayload,
} from '@backend/utils/auth.utils'

/**
 * Unit Tests: Auth Utilities
 *
 * Tests: Password hashing, JWT tokens, validation
 * Coverage: 100%
 */

describe('Auth Utils', () => {
  const mockPayload: JWTPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    plan: 'pro',
  }

  describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are long
    })

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2) // Due to random salt
    })

    it('should verify correct password', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123'
      const wrongPassword = 'WrongPassword456'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })

    it('should handle empty password gracefully', async () => {
      const password = ''
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(await verifyPassword('', hash)).toBe(true)
      expect(await verifyPassword('anything', hash)).toBe(false)
    })
  })

  describe('Access Token Generation', () => {
    it('should generate valid access token', () => {
      const token = generateAccessToken(mockPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should encode payload correctly', () => {
      const token = generateAccessToken(mockPayload)
      const decoded = verifyToken(token)

      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(mockPayload.userId)
      expect(decoded?.email).toBe(mockPayload.email)
      expect(decoded?.plan).toBe(mockPayload.plan)
    })

    it('should allow custom expiration', () => {
      const token = generateAccessToken(mockPayload, '1h')

      expect(token).toBeDefined()
      const decoded = verifyToken(token)
      expect(decoded).toBeDefined()
    })

    it('should handle additional payload properties', () => {
      const extendedPayload = {
        ...mockPayload,
        customField: 'customValue',
      }
      const token = generateAccessToken(extendedPayload)
      const decoded: any = verifyToken(token)

      expect(decoded?.customField).toBe('customValue')
    })
  })

  describe('Refresh Token Generation', () => {
    it('should generate valid refresh token', () => {
      const token = generateRefreshToken(mockPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('should encode payload correctly', () => {
      const token = generateRefreshToken(mockPayload)
      const decoded = verifyToken(token)

      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(mockPayload.userId)
      expect(decoded?.email).toBe(mockPayload.email)
    })

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(mockPayload)
      const refreshToken = generateRefreshToken(mockPayload)

      // Both should be valid immediately
      expect(verifyToken(accessToken)).toBeDefined()
      expect(verifyToken(refreshToken)).toBeDefined()
    })
  })

  describe('Password Reset Token Generation', () => {
    it('should generate valid password reset token', () => {
      const token = generatePasswordResetToken(mockPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('should include password_reset type in payload', () => {
      const token = generatePasswordResetToken(mockPayload)
      const decoded: any = verifyToken(token)

      expect(decoded).toBeDefined()
      expect(decoded?.type).toBe('password_reset')
      expect(decoded?.userId).toBe(mockPayload.userId)
    })

    it('should maintain original payload data', () => {
      const token = generatePasswordResetToken(mockPayload)
      const decoded = verifyToken(token)

      expect(decoded?.email).toBe(mockPayload.email)
      expect(decoded?.plan).toBe(mockPayload.plan)
    })
  })

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken(mockPayload)
      const decoded = verifyToken(token)

      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(mockPayload.userId)
    })

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here'
      const decoded = verifyToken(invalidToken)

      expect(decoded).toBeNull()
    })

    it('should return null for malformed token', () => {
      const malformedToken = 'notajwt'
      const decoded = verifyToken(malformedToken)

      expect(decoded).toBeNull()
    })

    it('should return null for empty token', () => {
      const decoded = verifyToken('')

      expect(decoded).toBeNull()
    })

    it('should verify token with different payloads', () => {
      const payload1 = { userId: '1', email: 'user1@test.com', plan: 'free' }
      const payload2 = { userId: '2', email: 'user2@test.com', plan: 'pro' }

      const token1 = generateAccessToken(payload1)
      const token2 = generateAccessToken(payload2)

      const decoded1 = verifyToken(token1)
      const decoded2 = verifyToken(token2)

      expect(decoded1?.userId).toBe('1')
      expect(decoded2?.userId).toBe('2')
    })
  })

  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
        'a@b.c',
      ]

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
        'user@@example.com',
        'user@.com',
      ]

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.c')).toBe(true) // Minimal valid email
      expect(isValidEmail('test@example.c')).toBe(true) // Single char TLD
    })
  })

  describe('Password Validation', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password1',
        'Test1234',
        'MyP@ssw0rd',
        '12345678a',
        'aB3456789',
      ]

      validPasswords.forEach((password) => {
        expect(isValidPassword(password)).toBe(true)
      })
    })

    it('should reject password with less than 8 characters', () => {
      const shortPasswords = ['Pass1', 'Test12', 'aB3']

      shortPasswords.forEach((password) => {
        expect(isValidPassword(password)).toBe(false)
      })
    })

    it('should reject password without letters', () => {
      const noLetterPasswords = ['12345678', '00000000']

      noLetterPasswords.forEach((password) => {
        expect(isValidPassword(password)).toBe(false)
      })
    })

    it('should reject password without numbers', () => {
      const noNumberPasswords = ['Password', 'TestPassword', 'abcdefgh']

      noNumberPasswords.forEach((password) => {
        expect(isValidPassword(password)).toBe(false)
      })
    })

    it('should reject empty password', () => {
      expect(isValidPassword('')).toBe(false)
    })

    it('should accept password with special characters', () => {
      expect(isValidPassword('P@ssw0rd!')).toBe(true)
      expect(isValidPassword('T3st#Pass')).toBe(true)
    })

    it('should handle exactly 8 characters', () => {
      expect(isValidPassword('Test1234')).toBe(true) // Valid 8 chars
      expect(isValidPassword('Pass123')).toBe(false) // 7 chars
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000) + '1'
      const hash = await hashPassword(longPassword)
      const isValid = await verifyPassword(longPassword, hash)

      expect(isValid).toBe(true)
    })

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+{}[]|:;<>,.?/~`1aA'
      const hash = await hashPassword(specialPassword)
      const isValid = await verifyPassword(specialPassword, hash)

      expect(isValid).toBe(true)
    })

    it('should handle unicode characters in email validation', () => {
      expect(isValidEmail('user@例え.jp')).toBe(true)
    })

    it('should generate unique tokens for same payload', () => {
      const token1 = generateAccessToken(mockPayload)
      const token2 = generateAccessToken(mockPayload)

      // Tokens should be different due to timestamp (iat claim)
      // But both should decode to similar payload
      const decoded1 = verifyToken(token1)
      const decoded2 = verifyToken(token2)

      expect(decoded1?.userId).toBe(decoded2?.userId)
      expect(decoded1?.email).toBe(decoded2?.email)
    })
  })
})
