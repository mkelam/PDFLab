/**
 * Test Fixtures and Constants
 * Centralized test data for consistent testing
 */

export const TEST_PDF = {
  small: 'tests/fixtures/test-sample.pdf', // 13KB
  medium: 'tests/fixtures/test-medium.pdf', // 5MB
  large: 'tests/fixtures/test-large.pdf', // 100MB
  malformed: 'tests/fixtures/test-malformed.pdf', // Invalid PDF
}

export const API_BASE_URL = process.env.API_URL || 'http://localhost:3006'
export const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export const DEFAULT_TIMEOUTS = {
  short: 5000, // 5 seconds
  medium: 15000, // 15 seconds
  long: 30000, // 30 seconds
  safari: 20000, // Safari needs extra time
  conversion: 60000, // Conversion can take up to 1 minute
}

export const CONVERSION_FORMATS = {
  pptx: 'PowerPoint',
  docx: 'Word',
  xlsx: 'Excel',
  png: 'Images',
} as const

export const COMPRESSION_LEVELS = {
  good: 'Good',
  recommended: 'Recommended',
  extreme: 'Extreme',
} as const

export const USER_PLANS = {
  free: {
    name: 'Free',
    conversions: 3,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    batchProcessing: false,
  },
  starter: {
    name: 'Starter',
    conversions: 100,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    batchProcessing: false,
  },
  pro: {
    name: 'Pro',
    conversions: 999999,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    batchProcessing: true,
  },
  enterprise: {
    name: 'Enterprise',
    conversions: 999999,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    batchProcessing: true,
  },
}

export const PAYFAST_PLANS = {
  starter: {
    name: 'Starter',
    price: 9.99,
    currency: 'USD',
    frequency: 'monthly',
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    currency: 'USD',
    frequency: 'monthly',
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    currency: 'USD',
    frequency: 'monthly',
  },
}

/**
 * Generate unique test email
 * @param prefix - Email prefix
 * @returns Unique email address
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  return `${prefix}${timestamp}@pdflab.test`
}

/**
 * Generate unique test user data
 * @param plan - User plan
 * @returns Test user object
 */
export function generateTestUser(plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free') {
  const timestamp = Date.now()
  return {
    email: generateTestEmail('user'),
    password: 'TestPass123!',
    name: `Test User ${timestamp}`,
    plan,
  }
}

/**
 * Create a dummy PDF buffer for testing
 * @param size - Size in bytes
 * @returns Buffer containing minimal valid PDF
 */
export function createDummyPDF(size: number = 1024): Buffer {
  const pdfHeader = '%PDF-1.4\n'
  const pdfFooter = '\n%%EOF'
  const padding = 'x'.repeat(Math.max(0, size - pdfHeader.length - pdfFooter.length))
  return Buffer.from(pdfHeader + padding + pdfFooter)
}

/**
 * Create a dummy file for testing
 * @param name - File name
 * @param mimeType - MIME type
 * @param size - Size in bytes
 * @returns File object
 */
export function createDummyFile(name: string, mimeType: string, size: number = 1024) {
  let buffer: Buffer

  if (mimeType === 'application/pdf') {
    buffer = createDummyPDF(size)
  } else {
    buffer = Buffer.alloc(size, 'x')
  }

  return {
    name,
    mimeType,
    buffer,
  }
}

/**
 * Wait for a specific amount of time
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function until it succeeds or max retries reached
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param delayMs - Delay between retries in ms
 * @returns Result of function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await delay(delayMs)
      }
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * PayFast test credentials (sandbox mode)
 */
export const PAYFAST_TEST = {
  merchantId: '10000100',
  merchantKey: '46f0cd694581a',
  passphrase: '', // Empty for testing
  mode: 'sandbox',
  testCardNumber: '4000000000000002', // Test card for successful payment
  testCardCVV: '123',
  testCardExpiry: '12/25',
}

/**
 * CloudConvert test data
 */
export const CLOUDCONVERT_TEST = {
  sandboxMode: false, // Use production API with test files
  webhookUrl: 'http://localhost:3006/api/cloudconvert/webhook',
  maxWaitTime: 60000, // 1 minute max for conversion
}

/**
 * Test job statuses
 */
export const JOB_STATUS = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
} as const

/**
 * Test subscription statuses
 */
export const SUBSCRIPTION_STATUS = {
  active: 'active',
  cancelled: 'cancelled',
  expired: 'expired',
  pending: 'pending',
} as const
