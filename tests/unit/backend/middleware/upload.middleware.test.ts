import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { handleUploadError } from '@backend/middleware/upload.middleware'

/**
 * Unit Tests: Upload Middleware
 *
 * Tests: handleUploadError function
 * Coverage: Error handling for multer errors
 *
 * Note: Testing multer storage/fileFilter requires integration tests
 * This unit test focuses on the error handler logic
 */

describe('Upload Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFunction = jest.fn()
    jest.clearAllMocks()
  })

  describe('handleUploadError', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE')

      handleUploadError(
        multerError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(413)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'File too large',
        message: 'File size exceeds your plan limit',
        code: 'LIMIT_FILE_SIZE',
      })
    })

    it('should handle LIMIT_FILE_COUNT error', () => {
      const multerError = new multer.MulterError('LIMIT_FILE_COUNT')

      handleUploadError(
        multerError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many files',
        message: 'Please upload only one file at a time',
        code: 'LIMIT_FILE_COUNT',
      })
    })

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE')

      handleUploadError(
        multerError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unexpected field',
        message: 'Unexpected file field in the request',
        code: 'LIMIT_UNEXPECTED_FILE',
      })
    })

    it('should handle invalid file type error', () => {
      const fileTypeError = new Error('Only PDF files are allowed')

      handleUploadError(
        fileTypeError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(415)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid file type',
        message: 'Only PDF files are allowed',
      })
    })

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong')

      handleUploadError(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Upload failed',
        message: 'Something went wrong',
      })
    })

    it('should handle errors without message', () => {
      const errorWithoutMessage = {}

      handleUploadError(
        errorWithoutMessage,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Upload failed',
        message: 'An error occurred during file upload',
      })
    })

    it('should handle LIMIT_PART_COUNT multer error', () => {
      const multerError = new multer.MulterError('LIMIT_PART_COUNT')

      handleUploadError(
        multerError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Upload failed',
        message: expect.any(String),
      })
    })

    it('should handle LIMIT_FIELD_KEY multer error', () => {
      const multerError = new multer.MulterError('LIMIT_FIELD_KEY')

      handleUploadError(
        multerError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Upload failed',
        message: expect.any(String),
      })
    })
  })
})
