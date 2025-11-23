import { Response } from 'express'
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
  logError,
} from '@backend/utils/error.utils'

/**
 * Unit Tests: Error Utilities
 *
 * Tests: Error formatting, HTTP error responses, error logging
 * Coverage: 100%
 */

describe('Error Utils', () => {
  let mockResponse: Partial<Response>
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('generateErrorId', () => {
    it('should generate error ID with err_ prefix', () => {
      const errorId = generateErrorId()

      expect(errorId).toMatch(/^err_[a-f0-9]{8}$/)
    })

    it('should generate unique error IDs', () => {
      const id1 = generateErrorId()
      const id2 = generateErrorId()
      const id3 = generateErrorId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should generate consistent format', () => {
      const ids = Array.from({ length: 100 }, () => generateErrorId())

      ids.forEach((id) => {
        expect(id).toMatch(/^err_[a-f0-9]{8}$/)
      })
    })
  })

  describe('sendErrorResponse', () => {
    it('should send error response with correct format', () => {
      sendErrorResponse(mockResponse as Response, 400, 'Test Error', 'Test message')

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test Error',
          message: 'Test message',
          timestamp: expect.any(String),
        })
      )
    })

    it('should include additional data in response', () => {
      const additionalData = { field: 'value', count: 42 }

      sendErrorResponse(
        mockResponse as Response,
        400,
        'Test Error',
        'Test message',
        additionalData
      )

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test Error',
          message: 'Test message',
          field: 'value',
          count: 42,
        })
      )
    })

    it('should add error_id for 500-level errors', () => {
      sendErrorResponse(mockResponse as Response, 500, 'Server Error', 'Something broke')

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Server Error',
          message: 'Something broke',
          error_id: expect.stringMatching(/^err_[a-f0-9]{8}$/),
        })
      )
    })

    it('should log errors for 500-level status codes', () => {
      sendErrorResponse(mockResponse as Response, 500, 'Server Error', 'Something broke')

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should not add error_id for 400-level errors', () => {
      sendErrorResponse(mockResponse as Response, 404, 'Not Found', 'Resource not found')

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(jsonCall.error_id).toBeUndefined()
    })

    it('should include valid ISO timestamp', () => {
      sendErrorResponse(mockResponse as Response, 400, 'Error', 'Message')

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0]
      const timestamp = new Date(jsonCall.timestamp)

      expect(timestamp.toISOString()).toBe(jsonCall.timestamp)
    })
  })

  describe('sendBadRequest', () => {
    it('should send 400 status code', () => {
      sendBadRequest(mockResponse as Response, 'Invalid input')

      expect(mockResponse.status).toHaveBeenCalledWith(400)
    })

    it('should include correct error message', () => {
      sendBadRequest(mockResponse as Response, 'Invalid input')

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad request',
          message: 'Invalid input',
        })
      )
    })

    it('should support additional data', () => {
      sendBadRequest(mockResponse as Response, 'Invalid input', { field: 'email' })

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'email',
        })
      )
    })
  })

  describe('sendUnauthorized', () => {
    it('should send 401 status code', () => {
      sendUnauthorized(mockResponse as Response, 'Invalid credentials')

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required',
          message: 'Invalid credentials',
        })
      )
    })
  })

  describe('sendForbidden', () => {
    it('should send 403 status code', () => {
      sendForbidden(mockResponse as Response, 'Access denied')

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Access denied',
        })
      )
    })
  })

  describe('sendNotFound', () => {
    it('should send 404 status code', () => {
      sendNotFound(mockResponse as Response, 'Resource not found')

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not found',
          message: 'Resource not found',
        })
      )
    })
  })

  describe('sendGone', () => {
    it('should send 410 status code', () => {
      sendGone(mockResponse as Response, 'File has expired')

      expect(mockResponse.status).toHaveBeenCalledWith(410)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File expired',
          message: 'File has expired',
        })
      )
    })
  })

  describe('sendPayloadTooLarge', () => {
    it('should send 413 status code', () => {
      sendPayloadTooLarge(mockResponse as Response, 'File exceeds limit')

      expect(mockResponse.status).toHaveBeenCalledWith(413)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File too large',
          message: 'File exceeds limit',
        })
      )
    })
  })

  describe('sendUnprocessableEntity', () => {
    it('should send 422 status code', () => {
      sendUnprocessableEntity(mockResponse as Response, 'Validation failed')

      expect(mockResponse.status).toHaveBeenCalledWith(422)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: 'Validation failed',
        })
      )
    })
  })

  describe('sendTooManyRequests', () => {
    it('should send 429 status code', () => {
      sendTooManyRequests(mockResponse as Response, 'Rate limit exceeded')

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          message: 'Rate limit exceeded',
        })
      )
    })
  })

  describe('sendInternalServerError', () => {
    it('should send 500 status code', () => {
      sendInternalServerError(mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })

    it('should include error_id', () => {
      sendInternalServerError(mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error_id: expect.stringMatching(/^err_[a-f0-9]{8}$/),
        })
      )
    })

    it('should include support message', () => {
      sendInternalServerError(mockResponse as Response)

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0]
      expect(jsonCall.support_message).toContain('Please contact support with error ID:')
    })

    it('should use default message when none provided', () => {
      sendInternalServerError(mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred',
        })
      )
    })

    it('should use custom message when provided', () => {
      sendInternalServerError(mockResponse as Response, 'Database connection failed')

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection failed',
        })
      )
    })
  })

  describe('sendServiceUnavailable', () => {
    it('should send 503 status code', () => {
      sendServiceUnavailable(mockResponse as Response, 'Service is down')

      expect(mockResponse.status).toHaveBeenCalledWith(503)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Service unavailable',
          message: 'Service is down',
        })
      )
    })
  })

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error')

      logError('Test Context', error)

      expect(consoleErrorSpy).toHaveBeenCalled()
      const logCall = consoleErrorSpy.mock.calls[0]
      expect(logCall[0]).toMatch(/^\[Error err_[a-f0-9]{8}\] Test Context:$/)
    })

    it('should log error message and stack', () => {
      const error = new Error('Test error message')

      logError('Context', error)

      const logCall = consoleErrorSpy.mock.calls[0][1]
      expect(logCall.error).toBe('Test error message')
      expect(logCall.stack).toBeDefined()
    })

    it('should include additional info', () => {
      const error = new Error('Test error')
      const additionalInfo = { userId: '123', action: 'upload' }

      logError('Context', error, additionalInfo)

      const logCall = consoleErrorSpy.mock.calls[0][1]
      expect(logCall.userId).toBe('123')
      expect(logCall.action).toBe('upload')
    })

    it('should handle non-Error objects', () => {
      const errorString = 'Something went wrong'

      logError('Context', errorString)

      const logCall = consoleErrorSpy.mock.calls[0][1]
      expect(logCall.error).toBe('Something went wrong')
    })

    it('should include timestamp', () => {
      const error = new Error('Test error')

      logError('Context', error)

      const logCall = consoleErrorSpy.mock.calls[0][1]
      expect(logCall.timestamp).toBeDefined()
      expect(new Date(logCall.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty additional data', () => {
      sendErrorResponse(mockResponse as Response, 400, 'Error', 'Message', {})

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error',
          message: 'Message',
        })
      )
    })

    it('should handle multiple 500-level errors with unique IDs', () => {
      sendInternalServerError(mockResponse as Response, 'Error 1')
      const id1 = (mockResponse.json as jest.Mock).mock.calls[0][0].error_id

      sendInternalServerError(mockResponse as Response, 'Error 2')
      const id2 = (mockResponse.json as jest.Mock).mock.calls[1][0].error_id

      expect(id1).not.toBe(id2)
    })

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000)

      sendBadRequest(mockResponse as Response, longMessage)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        })
      )
    })

    it('should handle special characters in messages', () => {
      const specialMessage = 'Error: <script>alert("xss")</script>'

      sendBadRequest(mockResponse as Response, specialMessage)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: specialMessage,
        })
      )
    })
  })
})
