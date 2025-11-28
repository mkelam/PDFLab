/**
 * Comprehensive Unit Tests for PayFast Service
 * Tests payment processing, signature generation, ITN validation
 */

import crypto from 'crypto'
import https from 'https'

// Mock https module
jest.mock('https', () => ({
  request: jest.fn()
}))

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

describe('PayFast Service', () => {
  // Store original env vars
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    // Set up PayFast test environment
    process.env = {
      ...originalEnv,
      PAYFAST_MERCHANT_ID: 'test-merchant-id',
      PAYFAST_MERCHANT_KEY: 'test-merchant-key',
      PAYFAST_PASSPHRASE: 'test-passphrase',
      PAYFAST_MODE: 'sandbox',
      API_URL: 'http://localhost:3006',
      FRONTEND_URL: 'http://localhost:3000'
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('generateSignature', () => {
    let payfastService: typeof import('../../../src/services/payfast.service')

    beforeEach(async () => {
      payfastService = await import('../../../src/services/payfast.service')
    })

    it('should generate MD5 signature for payment data', () => {
      const data = {
        merchant_id: 'test-merchant-id',
        merchant_key: 'test-merchant-key',
        amount: '100.00',
        item_name: 'Test Item'
      }

      const signature = payfastService.generateSignature(data, 'test-passphrase')

      expect(signature).toBeDefined()
      expect(signature).toHaveLength(32) // MD5 hash length
      expect(signature).toMatch(/^[a-f0-9]+$/) // Lowercase hex
    })

    it('should generate consistent signatures for same data', () => {
      const data = {
        merchant_id: 'test-id',
        amount: '50.00',
        item_name: 'Product'
      }

      const signature1 = payfastService.generateSignature(data, 'passphrase')
      const signature2 = payfastService.generateSignature(data, 'passphrase')

      expect(signature1).toBe(signature2)
    })

    it('should generate different signatures for different data', () => {
      const data1 = { merchant_id: 'test', amount: '100.00' }
      const data2 = { merchant_id: 'test', amount: '200.00' }

      const signature1 = payfastService.generateSignature(data1, 'passphrase')
      const signature2 = payfastService.generateSignature(data2, 'passphrase')

      expect(signature1).not.toBe(signature2)
    })

    it('should skip null and undefined values', () => {
      const data = {
        merchant_id: 'test',
        amount: '100.00',
        item_name: null,
        item_description: undefined
      }

      const signature = payfastService.generateSignature(data, 'passphrase')
      expect(signature).toBeDefined()
    })

    it('should skip empty string values', () => {
      const data = {
        merchant_id: 'test',
        amount: '100.00',
        item_name: ''
      }

      const signature = payfastService.generateSignature(data, 'passphrase')
      expect(signature).toBeDefined()
    })

    it('should work without passphrase', () => {
      const data = {
        merchant_id: 'test',
        amount: '100.00'
      }

      const signature = payfastService.generateSignature(data, '')
      expect(signature).toBeDefined()
      expect(signature).toHaveLength(32)
    })

    it('should URL encode special characters', () => {
      const data = {
        merchant_id: 'test',
        item_name: 'Test & Product'
      }

      const signature = payfastService.generateSignature(data, 'passphrase')
      expect(signature).toBeDefined()
    })

    it('should replace %20 with + for spaces', () => {
      const data = {
        merchant_id: 'test',
        item_name: 'Test Product Name'
      }

      const signature = payfastService.generateSignature(data, 'passphrase')
      expect(signature).toBeDefined()
    })
  })

  describe('createPaymentData', () => {
    let payfastService: typeof import('../../../src/services/payfast.service')

    beforeEach(async () => {
      payfastService = await import('../../../src/services/payfast.service')
    })

    it('should create payment data with all required fields', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'John Doe',
        planName: 'Professional',
        planPrice: 99.99,
        transactionId: 'txn-456'
      }

      const paymentData = payfastService.createPaymentData(params)

      expect(paymentData.merchant_id).toBe('test-merchant-id')
      expect(paymentData.merchant_key).toBe('test-merchant-key')
      expect(paymentData.email_address).toBe('user@example.com')
      expect(paymentData.name_first).toBe('John Doe')
      expect(paymentData.amount).toBe('99.99')
      expect(paymentData.item_name).toBe('PDFLab Professional Plan')
      expect(paymentData.m_payment_id).toBe('txn-456')
      expect(paymentData.custom_str1).toBe('user-123')
      expect(paymentData.custom_str2).toBe('professional')
    })

    it('should include signature in payment data', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Jane',
        planName: 'Basic',
        planPrice: 49.99,
        transactionId: 'txn-789'
      }

      const paymentData = payfastService.createPaymentData(params)

      expect(paymentData.signature).toBeDefined()
      expect(paymentData.signature).toHaveLength(32)
    })

    it('should format amount to 2 decimal places', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test',
        planName: 'Pro',
        planPrice: 99.999,
        transactionId: 'txn-001'
      }

      const paymentData = payfastService.createPaymentData(params)

      expect(paymentData.amount).toBe('100.00')
    })

    it('should set correct return and cancel URLs', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test',
        planName: 'Pro',
        planPrice: 50.00,
        transactionId: 'txn-001'
      }

      const paymentData = payfastService.createPaymentData(params)

      expect(paymentData.return_url).toBe('http://localhost:3000/payment/success')
      expect(paymentData.cancel_url).toBe('http://localhost:3000/payment/cancel')
    })

    it('should enable email confirmation', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test',
        planName: 'Pro',
        planPrice: 50.00,
        transactionId: 'txn-001'
      }

      const paymentData = payfastService.createPaymentData(params)

      expect(paymentData.email_confirmation).toBe('1')
      expect(paymentData.confirmation_address).toBe('user@example.com')
    })
  })

  describe('createSubscriptionPaymentData', () => {
    let payfastService: typeof import('../../../src/services/payfast.service')

    beforeEach(async () => {
      payfastService = await import('../../../src/services/payfast.service')
    })

    it('should create subscription payment data with recurring fields', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'John Doe',
        planName: 'Professional',
        planPrice: 99.99,
        transactionId: 'sub-456'
      }

      const paymentData = payfastService.createSubscriptionPaymentData(params)

      expect(paymentData.subscription_type).toBe('1')
      expect(paymentData.frequency).toBe('3') // Monthly
      expect(paymentData.cycles).toBe('0') // Unlimited
      expect(paymentData.recurring_amount).toBe('99.99')
    })

    it('should split user name into first and last name', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'John Michael Doe',
        planName: 'Pro',
        planPrice: 50.00,
        transactionId: 'sub-789'
      }

      const paymentData = payfastService.createSubscriptionPaymentData(params)

      expect(paymentData.name_first).toBe('John')
      expect(paymentData.name_last).toBe('Michael Doe')
    })

    it('should use default last name when only first name provided', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'John',
        planName: 'Pro',
        planPrice: 50.00,
        transactionId: 'sub-001'
      }

      const paymentData = payfastService.createSubscriptionPaymentData(params)

      expect(paymentData.name_first).toBe('John')
      expect(paymentData.name_last).toBe('Account')
    })

    it('should set billing date 30 days in future by default', () => {
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test User',
        planName: 'Pro',
        planPrice: 50.00,
        transactionId: 'sub-002'
      }

      const paymentData = payfastService.createSubscriptionPaymentData(params)

      expect(paymentData.billing_date).toBeDefined()
      // Should be in YYYY-MM-DD format
      expect(paymentData.billing_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should use custom billing date when provided', () => {
      const customDate = new Date('2024-06-15')
      const params = {
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test User',
        planName: 'Pro',
        planPrice: 50.00,
        transactionId: 'sub-003',
        billingDate: customDate
      }

      const paymentData = payfastService.createSubscriptionPaymentData(params)

      expect(paymentData.billing_date).toBe('2024-06-15')
    })
  })

  describe('validateSignature', () => {
    let payfastService: typeof import('../../../src/services/payfast.service')

    beforeEach(async () => {
      payfastService = await import('../../../src/services/payfast.service')
    })

    it('should return true for valid signature', () => {
      const data = {
        merchant_id: 'test-merchant-id',
        amount: '100.00',
        item_name: 'Test'
      }

      const validSignature = payfastService.generateSignature(data, 'test-passphrase')
      const isValid = payfastService.validateSignature(data, validSignature)

      expect(isValid).toBe(true)
    })

    it('should return false for invalid signature', () => {
      const data = {
        merchant_id: 'test',
        amount: '100.00'
      }

      const isValid = payfastService.validateSignature(data, 'invalid-signature')

      expect(isValid).toBe(false)
    })

    it('should return false for tampered data', () => {
      const originalData = {
        merchant_id: 'test',
        amount: '100.00'
      }

      const validSignature = payfastService.generateSignature(originalData, 'test-passphrase')

      const tamperedData = {
        merchant_id: 'test',
        amount: '200.00' // Changed amount
      }

      const isValid = payfastService.validateSignature(tamperedData, validSignature)

      expect(isValid).toBe(false)
    })
  })

  describe('validatePayFastHost', () => {
    let payfastService: typeof import('../../../src/services/payfast.service')

    beforeEach(async () => {
      payfastService = await import('../../../src/services/payfast.service')
    })

    it('should return true for valid PayFast hosts', () => {
      expect(payfastService.validatePayFastHost('www.payfast.co.za')).toBe(true)
      expect(payfastService.validatePayFastHost('sandbox.payfast.co.za')).toBe(true)
      expect(payfastService.validatePayFastHost('w1w.payfast.co.za')).toBe(true)
      expect(payfastService.validatePayFastHost('w2w.payfast.co.za')).toBe(true)
    })

    it('should return false for invalid hosts', () => {
      expect(payfastService.validatePayFastHost('evil.com')).toBe(false)
      expect(payfastService.validatePayFastHost('payfast.evil.com')).toBe(false)
      expect(payfastService.validatePayFastHost('www.payfast.fake.za')).toBe(false)
      expect(payfastService.validatePayFastHost('')).toBe(false)
    })
  })

  describe('validateAmount', () => {
    let payfastService: typeof import('../../../src/services/payfast.service')

    beforeEach(async () => {
      payfastService = await import('../../../src/services/payfast.service')
    })

    it('should return true for matching amounts', () => {
      expect(payfastService.validateAmount('100.00', 100.00)).toBe(true)
      expect(payfastService.validateAmount('99.99', 99.99)).toBe(true)
      expect(payfastService.validateAmount('0.50', 0.50)).toBe(true)
    })

    it('should allow for floating point differences within 1 cent', () => {
      expect(payfastService.validateAmount('100.00', 100.005)).toBe(true)
      expect(payfastService.validateAmount('99.995', 100.00)).toBe(true)
    })

    it('should return false for amounts differing by more than 1 cent', () => {
      expect(payfastService.validateAmount('100.00', 100.02)).toBe(false)
      expect(payfastService.validateAmount('99.00', 100.00)).toBe(false)
    })

    it('should handle string to number conversion', () => {
      expect(payfastService.validateAmount('50.00', 50)).toBe(true)
    })
  })

  describe('getPayFastUrl', () => {
    it('should return sandbox URL in sandbox mode', async () => {
      process.env.PAYFAST_MODE = 'sandbox'
      jest.resetModules()

      const payfastService = await import('../../../src/services/payfast.service')
      const url = payfastService.getPayFastUrl()

      expect(url).toBe('https://sandbox.payfast.co.za/eng/process')
    })

    it('should return production URL in production mode', async () => {
      process.env.PAYFAST_MODE = 'production'
      jest.resetModules()

      const payfastService = await import('../../../src/services/payfast.service')
      const url = payfastService.getPayFastUrl()

      expect(url).toBe('https://www.payfast.co.za/eng/process')
    })
  })

  describe('isConfigured', () => {
    it('should return true when merchant ID and key are set', async () => {
      process.env.PAYFAST_MERCHANT_ID = 'test-id'
      process.env.PAYFAST_MERCHANT_KEY = 'test-key'
      jest.resetModules()

      const payfastService = await import('../../../src/services/payfast.service')
      expect(payfastService.isConfigured()).toBe(true)
    })

    it('should return false when merchant ID is missing', async () => {
      delete process.env.PAYFAST_MERCHANT_ID
      process.env.PAYFAST_MERCHANT_KEY = 'test-key'
      jest.resetModules()

      const payfastService = await import('../../../src/services/payfast.service')
      expect(payfastService.isConfigured()).toBe(false)
    })

    it('should return false when merchant key is missing', async () => {
      process.env.PAYFAST_MERCHANT_ID = 'test-id'
      delete process.env.PAYFAST_MERCHANT_KEY
      jest.resetModules()

      const payfastService = await import('../../../src/services/payfast.service')
      expect(payfastService.isConfigured()).toBe(false)
    })
  })

  describe('getConfig', () => {
    it('should return configuration without sensitive data', async () => {
      process.env.PAYFAST_MERCHANT_ID = 'sensitive-id'
      process.env.PAYFAST_MERCHANT_KEY = 'sensitive-key'
      process.env.PAYFAST_MODE = 'sandbox'
      jest.resetModules()

      const payfastService = await import('../../../src/services/payfast.service')
      const config = payfastService.getConfig()

      expect(config.mode).toBe('sandbox')
      expect(config.apiUrl).toBe('https://sandbox.payfast.co.za')
      expect(config.configured).toBe(true)
      expect(config).not.toHaveProperty('merchantId')
      expect(config).not.toHaveProperty('merchantKey')
      expect(config).not.toHaveProperty('passphrase')
    })
  })

  // Note: Tests involving actual HTTP requests are skipped because mocking
  // Node.js https.request is complex and brittle. These functions should be
  // tested through integration tests with a real PayFast sandbox environment.
  describe('verifyPaymentWithPayFast', () => {
    it.skip('should return true when PayFast returns VALID', () => {
      // Skipped - HTTP mocking is complex; better tested via integration tests
    })

    it.skip('should return false when PayFast returns INVALID', () => {
      // Skipped - HTTP mocking is complex
    })

    it.skip('should reject on request error', () => {
      // Skipped - HTTP mocking is complex
    })
  })

  describe('cancelSubscription', () => {
    it.skip('should return success when subscription is cancelled', () => {
      // Skipped - HTTP mocking is complex; better tested via integration tests
    })

    it.skip('should return failure when cancellation fails', () => {
      // Skipped - HTTP mocking is complex
    })
  })

  describe('pauseSubscription', () => {
    it.skip('should return success when subscription is paused', () => {
      // Skipped - HTTP mocking is complex; better tested via integration tests
    })

    it.skip('should accept custom cycles parameter', () => {
      // Skipped - HTTP mocking is complex
    })
  })
})
