/**
 * Comprehensive Unit Tests for Error Utilities
 * Tests error response formatting and logging functions
 */

import { Response } from 'express'

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9abc-defghijklmno')
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

import {
  generateErrorId,
  sendErrorResponse,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendGone,
  sendPayloadTooLarge,
  sendUnprocessableEntity,
  sendTooManyRequests,
  sendInternalServerError,
  sendServiceUnavailable,
  logError
} from '../../../src/utils/error.utils'
import logger from '../../../src/config/logger'

describe('Error Utilities', () => {
  let mockRes: Partial<Response>
  let mockJson: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })

    mockRes = {
      status: mockStatus,
      json: mockJson
    }
  })

  // =========================================================================
  // generateErrorId TESTS
  // =========================================================================
  describe('generateErrorId', () => {
    it('should generate error ID with err_ prefix', () => {
      const errorId = generateErrorId()

      expect(errorId).toMatch(/^err_/)
    })

    it('should generate unique-looking error IDs', () => {
      // With mocked UUID, should use first segment
      const errorId = generateErrorId()

      expect(errorId).toBe('err_mock')
    })

    it('should be a string', () => {
      const errorId = generateErrorId()

      expect(typeof errorId).toBe('string')
    })
  })

  // =========================================================================
  // sendErrorResponse TESTS
  // =========================================================================
  describe('sendErrorResponse', () => {
    it('should send error response with correct status code', () => {
      sendErrorResponse(mockRes as Response, 400, 'Bad request', 'Invalid input')

      expect(mockStatus).toHaveBeenCalledWith(400)
    })

    it('should include error and message in response', () => {
      sendErrorResponse(mockRes as Response, 400, 'Bad request', 'Invalid input')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad request',
          message: 'Invalid input'
        })
      )
    })

    it('should include timestamp in response', () => {
      const beforeTime = new Date().toISOString()
      sendErrorResponse(mockRes as Response, 400, 'Error', 'Message')
      const afterTime = new Date().toISOString()

      const response = mockJson.mock.calls[0][0]
      expect(response.timestamp).toBeDefined()
      expect(response.timestamp >= beforeTime).toBe(true)
      expect(response.timestamp <= afterTime).toBe(true)
    })

    it('should include additional data in response', () => {
      sendErrorResponse(mockRes as Response, 400, 'Error', 'Message', {
        field: 'email',
        code: 'INVALID_FORMAT'
      })

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'email',
          code: 'INVALID_FORMAT'
        })
      )
    })

    it('should add error_id for 500 status codes', () => {
      sendErrorResponse(mockRes as Response, 500, 'Server error', 'Something went wrong')

      const response = mockJson.mock.calls[0][0]
      expect(response.error_id).toBeDefined()
      expect(response.error_id).toMatch(/^err_/)
    })

    it('should log error for 500 status codes', () => {
      sendErrorResponse(mockRes as Response, 500, 'Server error', 'Something went wrong')

      expect(logger.error).toHaveBeenCalled()
    })

    it('should add error_id for all 5xx status codes', () => {
      sendErrorResponse(mockRes as Response, 502, 'Bad Gateway', 'Gateway error')

      const response = mockJson.mock.calls[0][0]
      expect(response.error_id).toBeDefined()
    })

    it('should NOT add error_id for 4xx status codes', () => {
      sendErrorResponse(mockRes as Response, 404, 'Not found', 'Resource not found')

      const response = mockJson.mock.calls[0][0]
      expect(response.error_id).toBeUndefined()
    })
  })

  // =========================================================================
  // sendBadRequest TESTS
  // =========================================================================
  describe('sendBadRequest', () => {
    it('should send 400 status code', () => {
      sendBadRequest(mockRes as Response, 'Invalid email format')

      expect(mockStatus).toHaveBeenCalledWith(400)
    })

    it('should include "Bad request" error label', () => {
      sendBadRequest(mockRes as Response, 'Invalid input')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad request'
        })
      )
    })

    it('should include custom message', () => {
      sendBadRequest(mockRes as Response, 'Email is required')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email is required'
        })
      )
    })

    it('should pass additional data', () => {
      sendBadRequest(mockRes as Response, 'Validation failed', {
        errors: ['email is required', 'password too short']
      })

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: ['email is required', 'password too short']
        })
      )
    })
  })

  // =========================================================================
  // sendUnauthorized TESTS
  // =========================================================================
  describe('sendUnauthorized', () => {
    it('should send 401 status code', () => {
      sendUnauthorized(mockRes as Response, 'Invalid credentials')

      expect(mockStatus).toHaveBeenCalledWith(401)
    })

    it('should include "Authentication required" error label', () => {
      sendUnauthorized(mockRes as Response, 'Token expired')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required'
        })
      )
    })

    it('should include custom message', () => {
      sendUnauthorized(mockRes as Response, 'Please log in to continue')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please log in to continue'
        })
      )
    })
  })

  // =========================================================================
  // sendForbidden TESTS
  // =========================================================================
  describe('sendForbidden', () => {
    it('should send 403 status code', () => {
      sendForbidden(mockRes as Response, 'Access denied')

      expect(mockStatus).toHaveBeenCalledWith(403)
    })

    it('should include "Forbidden" error label', () => {
      sendForbidden(mockRes as Response, 'Insufficient permissions')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden'
        })
      )
    })

    it('should include custom message', () => {
      sendForbidden(mockRes as Response, 'Admin access required')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin access required'
        })
      )
    })
  })

  // =========================================================================
  // sendNotFound TESTS
  // =========================================================================
  describe('sendNotFound', () => {
    it('should send 404 status code', () => {
      sendNotFound(mockRes as Response, 'User not found')

      expect(mockStatus).toHaveBeenCalledWith(404)
    })

    it('should include "Not found" error label', () => {
      sendNotFound(mockRes as Response, 'Resource does not exist')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not found'
        })
      )
    })

    it('should include custom message', () => {
      sendNotFound(mockRes as Response, 'Document with ID 123 not found')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Document with ID 123 not found'
        })
      )
    })
  })

  // =========================================================================
  // sendGone TESTS
  // =========================================================================
  describe('sendGone', () => {
    it('should send 410 status code', () => {
      sendGone(mockRes as Response, 'File has expired')

      expect(mockStatus).toHaveBeenCalledWith(410)
    })

    it('should include "File expired" error label', () => {
      sendGone(mockRes as Response, 'Download link expired')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File expired'
        })
      )
    })

    it('should include custom message', () => {
      sendGone(mockRes as Response, 'This file was deleted 24 hours ago')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This file was deleted 24 hours ago'
        })
      )
    })
  })

  // =========================================================================
  // sendPayloadTooLarge TESTS
  // =========================================================================
  describe('sendPayloadTooLarge', () => {
    it('should send 413 status code', () => {
      sendPayloadTooLarge(mockRes as Response, 'File exceeds 10MB limit')

      expect(mockStatus).toHaveBeenCalledWith(413)
    })

    it('should include "File too large" error label', () => {
      sendPayloadTooLarge(mockRes as Response, 'Upload too big')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File too large'
        })
      )
    })

    it('should include custom message with size info', () => {
      sendPayloadTooLarge(mockRes as Response, 'File size 25MB exceeds 10MB limit', {
        maxSize: '10MB',
        receivedSize: '25MB'
      })

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSize: '10MB',
          receivedSize: '25MB'
        })
      )
    })
  })

  // =========================================================================
  // sendUnprocessableEntity TESTS
  // =========================================================================
  describe('sendUnprocessableEntity', () => {
    it('should send 422 status code', () => {
      sendUnprocessableEntity(mockRes as Response, 'Cannot process request')

      expect(mockStatus).toHaveBeenCalledWith(422)
    })

    it('should include "Validation failed" error label', () => {
      sendUnprocessableEntity(mockRes as Response, 'Invalid file format')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed'
        })
      )
    })

    it('should include validation errors', () => {
      sendUnprocessableEntity(mockRes as Response, 'Validation failed', {
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'age', message: 'Must be a positive number' }
        ]
      })

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            { field: 'email', message: 'Invalid email format' }
          ])
        })
      )
    })
  })

  // =========================================================================
  // sendTooManyRequests TESTS
  // =========================================================================
  describe('sendTooManyRequests', () => {
    it('should send 429 status code', () => {
      sendTooManyRequests(mockRes as Response, 'Rate limit exceeded')

      expect(mockStatus).toHaveBeenCalledWith(429)
    })

    it('should include "Rate limit exceeded" error label', () => {
      sendTooManyRequests(mockRes as Response, 'Too many requests')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded'
        })
      )
    })

    it('should include retry-after info', () => {
      sendTooManyRequests(mockRes as Response, 'Please slow down', {
        retryAfter: 60,
        limit: 100,
        remaining: 0
      })

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 60,
          limit: 100,
          remaining: 0
        })
      )
    })
  })

  // =========================================================================
  // sendInternalServerError TESTS
  // =========================================================================
  describe('sendInternalServerError', () => {
    it('should send 500 status code', () => {
      sendInternalServerError(mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
    })

    it('should include "Internal server error" error label', () => {
      sendInternalServerError(mockRes as Response)

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error'
        })
      )
    })

    it('should use default message when none provided', () => {
      sendInternalServerError(mockRes as Response)

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred'
        })
      )
    })

    it('should use custom message when provided', () => {
      sendInternalServerError(mockRes as Response, 'Database connection failed')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection failed'
        })
      )
    })

    it('should always include error_id', () => {
      sendInternalServerError(mockRes as Response)

      const response = mockJson.mock.calls[0][0]
      expect(response.error_id).toBeDefined()
      expect(response.error_id).toMatch(/^err_/)
    })

    it('should include support message with error ID', () => {
      sendInternalServerError(mockRes as Response)

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          support_message: expect.stringContaining('contact support with error ID')
        })
      )
    })
  })

  // =========================================================================
  // sendServiceUnavailable TESTS
  // =========================================================================
  describe('sendServiceUnavailable', () => {
    it('should send 503 status code', () => {
      sendServiceUnavailable(mockRes as Response, 'Service temporarily unavailable')

      expect(mockStatus).toHaveBeenCalledWith(503)
    })

    it('should include "Service unavailable" error label', () => {
      sendServiceUnavailable(mockRes as Response, 'Maintenance in progress')

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Service unavailable'
        })
      )
    })

    it('should include maintenance info', () => {
      sendServiceUnavailable(mockRes as Response, 'Scheduled maintenance', {
        estimatedDowntime: '2 hours',
        maintenanceWindow: '2024-01-15 00:00 - 02:00 UTC'
      })

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedDowntime: '2 hours'
        })
      )
    })
  })

  // =========================================================================
  // logError TESTS
  // =========================================================================
  describe('logError', () => {
    it('should log error with context', () => {
      logError('PaymentService', new Error('Payment failed'))

      expect(logger.error).toHaveBeenCalled()
      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[0]).toContain('PaymentService')
    })

    it('should include error message in log', () => {
      logError('AuthController', new Error('Invalid token'))

      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[1].error).toBe('Invalid token')
    })

    it('should include error stack in log', () => {
      const error = new Error('Test error')
      logError('TestContext', error)

      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[1].stack).toBeDefined()
      expect(logCall[1].stack).toContain('Error: Test error')
    })

    it('should include error_id in log', () => {
      logError('Context', new Error('Error'))

      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[1].error_id).toMatch(/^err_/)
    })

    it('should include timestamp in log', () => {
      logError('Context', new Error('Error'))

      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[1].timestamp).toBeDefined()
    })

    it('should include additional info in log', () => {
      logError('Context', new Error('Error'), {
        userId: 'user-123',
        action: 'delete'
      })

      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[1].userId).toBe('user-123')
      expect(logCall[1].action).toBe('delete')
    })

    it('should handle non-Error objects', () => {
      logError('Context', 'String error message')

      const logCall = (logger.error as jest.Mock).mock.calls[0]
      expect(logCall[1].error).toBe('String error message')
    })

    it('should handle error objects without message', () => {
      logError('Context', { code: 'ERR_001' })

      expect(logger.error).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================
  describe('Integration Tests', () => {
    it('should produce consistent error response format', () => {
      sendBadRequest(mockRes as Response, 'Test error')

      const response = mockJson.mock.calls[0][0]

      // All responses should have these fields
      expect(response).toHaveProperty('error')
      expect(response).toHaveProperty('message')
      expect(response).toHaveProperty('timestamp')

      // Timestamp should be ISO format
      expect(Date.parse(response.timestamp)).not.toBeNaN()
    })

    it('should handle rapid successive calls', () => {
      sendBadRequest(mockRes as Response, 'Error 1')
      sendNotFound(mockRes as Response, 'Error 2')
      sendInternalServerError(mockRes as Response, 'Error 3')

      expect(mockStatus).toHaveBeenCalledTimes(3)
      expect(mockJson).toHaveBeenCalledTimes(3)
    })

    it('should maintain proper status code mapping', () => {
      const statusCodeTests = [
        { fn: sendBadRequest, expectedCode: 400 },
        { fn: sendUnauthorized, expectedCode: 401 },
        { fn: sendForbidden, expectedCode: 403 },
        { fn: sendNotFound, expectedCode: 404 },
        { fn: sendGone, expectedCode: 410 },
        { fn: sendPayloadTooLarge, expectedCode: 413 },
        { fn: sendUnprocessableEntity, expectedCode: 422 },
        { fn: sendTooManyRequests, expectedCode: 429 },
        { fn: sendServiceUnavailable, expectedCode: 503 }
      ]

      statusCodeTests.forEach(({ fn, expectedCode }) => {
        mockStatus.mockClear()
        fn(mockRes as Response, 'Test message')
        expect(mockStatus).toHaveBeenCalledWith(expectedCode)
      })
    })
  })
})
