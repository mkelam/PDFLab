/**
 * Jest Setup File for Backend Unit Tests
 *
 * Global test configuration and mocks
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '3306'
process.env.DB_USER = 'pdflab_test'
process.env.DB_PASSWORD = 'test123'
process.env.DB_NAME = 'pdflab_test'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.JWT_SECRET = 'test-secret-key-for-testing'
process.env.JWT_EXPIRATION = '15m'
process.env.CLOUDCONVERT_API_KEY = 'test-cloudconvert-key'
process.env.PAYFAST_MERCHANT_ID = 'test-merchant-id'
process.env.PAYFAST_MERCHANT_KEY = 'test-merchant-key'

// Increase timeout for integration tests
jest.setTimeout(10000)

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
