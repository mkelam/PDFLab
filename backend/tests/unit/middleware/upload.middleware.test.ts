/**
 * Comprehensive Unit Tests for Upload Middleware
 * Tests file upload handling, magic byte validation, and error handling
 */

import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'

// Mock dependencies
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  openSync: jest.fn(),
  readSync: jest.fn(),
  closeSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
  rmdirSync: jest.fn(),
  existsSync: jest.fn()
}))

// file-type exports fromFile at module level
const mockFromFile = jest.fn()
jest.mock('file-type', () => ({
  __esModule: true,
  default: {
    fromFile: mockFromFile
  },
  fromFile: mockFromFile
}))

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}))

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: mockLogger
}))

import {
  handleUploadError,
  validateFileMagicBytes,
  validateMultipleFileMagicBytes
} from '../../../src/middleware/upload.middleware'
import { fromFile as FileTypeFromFile } from 'file-type'

describe('Upload Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let mockJson: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })
    mockNext = jest.fn()

    mockReq = {
      userId: undefined,
      file: undefined,
      files: undefined,
      ip: '192.168.1.1'
    }

    mockRes = {
      status: mockStatus,
      json: mockJson
    }
  })

  // =========================================================================
  // handleUploadError TESTS
  // =========================================================================
  describe('handleUploadError', () => {
    describe('MulterErrors', () => {
      it('should handle LIMIT_FILE_SIZE error', () => {
        const error = new multer.MulterError('LIMIT_FILE_SIZE')

        handleUploadError(error, mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(413)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'File too large',
          message: 'File size exceeds your plan limit',
          code: 'LIMIT_FILE_SIZE'
        })
      })

      it('should handle LIMIT_FILE_COUNT error', () => {
        const error = new multer.MulterError('LIMIT_FILE_COUNT')

        handleUploadError(error, mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(400)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Too many files',
          message: 'Please upload only one file at a time',
          code: 'LIMIT_FILE_COUNT'
        })
      })

      it('should handle LIMIT_UNEXPECTED_FILE error', () => {
        const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE')

        handleUploadError(error, mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(400)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Unexpected field',
          message: 'Unexpected file field in the request',
          code: 'LIMIT_UNEXPECTED_FILE'
        })
      })
    })

    describe('File Type Error', () => {
      it('should handle PDF-only error', () => {
        const error = new Error('Only PDF files are allowed')

        handleUploadError(error, mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(400)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Invalid file type',
          message: 'Only PDF files are allowed'
        })
      })
    })

    describe('Generic Errors', () => {
      it('should handle generic errors with message', () => {
        const error = new Error('Something went wrong')

        handleUploadError(error, mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(500)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Upload failed',
          message: 'Something went wrong'
        })
      })

      it('should handle errors without message', () => {
        const error = new Error()

        handleUploadError(error, mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(500)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Upload failed',
          message: 'An error occurred during file upload'
        })
      })
    })
  })

  // =========================================================================
  // validateFileMagicBytes TESTS
  // =========================================================================
  describe('validateFileMagicBytes', () => {
    const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]) // %PDF-

    describe('No File Uploaded', () => {
      it('should call next when no file is present', async () => {
        mockReq.file = undefined

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(fs.openSync).not.toHaveBeenCalled()
      })
    })

    describe('Valid PDF File', () => {
      it('should call next for valid PDF with correct magic bytes', async () => {
        mockReq.file = {
          path: '/storage/uploads/test.pdf',
          originalname: 'document.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        // Mock file operations
        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          PDF_MAGIC_BYTES.copy(buffer, 0)
          return 5
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(fs.openSync).toHaveBeenCalledWith('/storage/uploads/test.pdf', 'r')
        expect(fs.closeSync).toHaveBeenCalledWith(1)
        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })
    })

    describe('Invalid PDF File', () => {
      it('should reject file with invalid magic bytes', async () => {
        mockReq.file = {
          path: '/storage/uploads/fake.pdf',
          originalname: 'fake.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        // Mock file operations - return non-PDF magic bytes
        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          // Write non-PDF magic bytes
          Buffer.from([0x89, 0x50, 0x4E, 0x47]).copy(buffer, 0) // PNG magic bytes
          return 4
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        ;(mockFromFile as jest.Mock).mockResolvedValue({ mime: 'image/png' })
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)
        ;(fs.readdirSync as jest.Mock).mockReturnValue([])
        ;(fs.rmdirSync as jest.Mock).mockReturnValue(undefined)

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(400)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Invalid file',
          message: 'The uploaded file is not a valid PDF document. Please ensure you are uploading an actual PDF file.'
        })
        expect(mockNext).not.toHaveBeenCalled()
        expect(fs.unlinkSync).toHaveBeenCalledWith('/storage/uploads/fake.pdf')
      })

      it('should log warning for spoofed MIME type', async () => {
        mockReq.file = {
          path: '/storage/uploads/spoofed.pdf',
          originalname: 'malicious.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          Buffer.from([0xFF, 0xD8, 0xFF]).copy(buffer, 0) // JPEG magic bytes
          return 3
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        ;(mockFromFile as jest.Mock).mockResolvedValue({ mime: 'image/jpeg' })
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)
        ;(fs.readdirSync as jest.Mock).mockReturnValue([])

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Rejected file with spoofed MIME type',
          expect.objectContaining({
            originalname: 'malicious.pdf',
            mimetype: 'application/pdf',
            detectedType: 'image/jpeg'
          })
        )
      })

      it('should clean up job directory if empty after file deletion', async () => {
        mockReq.file = {
          path: '/storage/uploads/user-123/job-456/fake.pdf',
          originalname: 'fake.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          Buffer.from([0x00, 0x00, 0x00]).copy(buffer, 0)
          return 3
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        ;(mockFromFile as jest.Mock).mockResolvedValue(null)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)
        ;(fs.readdirSync as jest.Mock).mockReturnValue([]) // Empty directory

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(fs.rmdirSync).toHaveBeenCalledWith('/storage/uploads/user-123/job-456')
      })

      it('should not remove directory if files remain', async () => {
        mockReq.file = {
          path: '/storage/uploads/user-123/job-456/fake.pdf',
          originalname: 'fake.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          Buffer.from([0x00, 0x00, 0x00]).copy(buffer, 0)
          return 3
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        ;(mockFromFile as jest.Mock).mockResolvedValue(null)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)
        ;(fs.readdirSync as jest.Mock).mockReturnValue(['other-file.pdf'])

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(fs.rmdirSync).not.toHaveBeenCalled()
      })
    })

    describe('Fallback to file-type Library', () => {
      it('should accept PDF if file-type library confirms PDF despite invalid magic bytes', async () => {
        mockReq.file = {
          path: '/storage/uploads/special.pdf',
          originalname: 'special.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          // Non-standard magic bytes
          Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]).copy(buffer, 0)
          return 5
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        // file-type confirms it's a PDF despite unusual header
        ;(mockFromFile as jest.Mock).mockResolvedValue({ mime: 'application/pdf' })

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        // Since magic bytes don't match, it checks file-type, which returns PDF
        // The implementation rejects if BOTH checks fail
        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      it('should return 500 on file read errors', async () => {
        mockReq.file = {
          path: '/storage/uploads/error.pdf',
          originalname: 'error.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        ;(fs.openSync as jest.Mock).mockImplementation(() => {
          throw new Error('File not found')
        })
        ;(fs.existsSync as jest.Mock).mockReturnValue(false)

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(500)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Validation failed',
          message: 'An error occurred while validating the uploaded file'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should attempt cleanup on validation errors', async () => {
        mockReq.file = {
          path: '/storage/uploads/error.pdf',
          originalname: 'error.pdf',
          mimetype: 'application/pdf'
        } as Express.Multer.File

        ;(fs.openSync as jest.Mock).mockImplementation(() => {
          throw new Error('Read error')
        })
        ;(fs.existsSync as jest.Mock).mockReturnValue(true)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)

        await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(fs.existsSync).toHaveBeenCalledWith('/storage/uploads/error.pdf')
        expect(fs.unlinkSync).toHaveBeenCalledWith('/storage/uploads/error.pdf')
      })
    })
  })

  // =========================================================================
  // validateMultipleFileMagicBytes TESTS
  // =========================================================================
  describe('validateMultipleFileMagicBytes', () => {
    const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D])

    describe('No Files Uploaded', () => {
      it('should call next when no files are present', async () => {
        mockReq.files = undefined

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('should call next for empty files array', async () => {
        mockReq.files = []

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('All Valid PDF Files', () => {
      it('should call next when all files are valid PDFs', async () => {
        mockReq.files = [
          { path: '/storage/file1.pdf', originalname: 'file1.pdf', mimetype: 'application/pdf' },
          { path: '/storage/file2.pdf', originalname: 'file2.pdf', mimetype: 'application/pdf' }
        ] as Express.Multer.File[]

        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          PDF_MAGIC_BYTES.copy(buffer, 0)
          return 5
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(mockStatus).not.toHaveBeenCalled()
        expect(mockLogger.debug).toHaveBeenCalledWith('All files magic bytes validated', { fileCount: 2 })
      })
    })

    describe('Invalid File in Batch', () => {
      it('should reject batch if any file is invalid', async () => {
        mockReq.files = [
          { path: '/storage/valid.pdf', originalname: 'valid.pdf', mimetype: 'application/pdf' },
          { path: '/storage/invalid.pdf', originalname: 'invalid.pdf', mimetype: 'application/pdf' }
        ] as Express.Multer.File[]

        let callCount = 0
        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          callCount++
          if (callCount === 1) {
            PDF_MAGIC_BYTES.copy(buffer, 0) // First file is valid
          } else {
            Buffer.from([0x89, 0x50, 0x4E, 0x47]).copy(buffer, 0) // Second file is PNG
          }
          return 5
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        ;(mockFromFile as jest.Mock).mockResolvedValue({ mime: 'image/png' })
        ;(fs.existsSync as jest.Mock).mockReturnValue(true)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(400)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Invalid file',
          message: 'The file "invalid.pdf" is not a valid PDF document. All files must be valid PDF files.'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should delete all uploaded files when one is invalid', async () => {
        mockReq.files = [
          { path: '/storage/file1.pdf', originalname: 'file1.pdf', mimetype: 'application/pdf' },
          { path: '/storage/file2.pdf', originalname: 'file2.pdf', mimetype: 'application/pdf' },
          { path: '/storage/file3.pdf', originalname: 'file3.pdf', mimetype: 'application/pdf' }
        ] as Express.Multer.File[]

        ;(fs.openSync as jest.Mock).mockReturnValue(1)
        ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
          Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]).copy(buffer, 0) // Invalid
          return 5
        })
        ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
        ;(mockFromFile as jest.Mock).mockResolvedValue(null)
        ;(fs.existsSync as jest.Mock).mockReturnValue(true)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        // All files should be deleted
        expect(fs.unlinkSync).toHaveBeenCalledWith('/storage/file1.pdf')
        expect(fs.unlinkSync).toHaveBeenCalledWith('/storage/file2.pdf')
        expect(fs.unlinkSync).toHaveBeenCalledWith('/storage/file3.pdf')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 on validation errors', async () => {
        mockReq.files = [
          { path: '/storage/error.pdf', originalname: 'error.pdf', mimetype: 'application/pdf' }
        ] as Express.Multer.File[]

        ;(fs.openSync as jest.Mock).mockImplementation(() => {
          throw new Error('Cannot open file')
        })
        ;(fs.existsSync as jest.Mock).mockReturnValue(true)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(mockStatus).toHaveBeenCalledWith(500)
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Validation failed',
          message: 'An error occurred while validating the uploaded files'
        })
      })

      it('should clean up all files on error', async () => {
        mockReq.files = [
          { path: '/storage/file1.pdf', originalname: 'file1.pdf', mimetype: 'application/pdf' },
          { path: '/storage/file2.pdf', originalname: 'file2.pdf', mimetype: 'application/pdf' }
        ] as Express.Multer.File[]

        ;(fs.openSync as jest.Mock).mockImplementation(() => {
          throw new Error('System error')
        })
        ;(fs.existsSync as jest.Mock).mockReturnValue(true)
        ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)

        await validateMultipleFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

        expect(fs.unlinkSync).toHaveBeenCalledTimes(2)
      })
    })
  })

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================
  describe('Integration Tests', () => {
    it('should handle complete upload validation flow', async () => {
      const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D])

      mockReq.file = {
        path: '/storage/uploads/user-123/job-456/document.pdf',
        originalname: 'document.pdf',
        mimetype: 'application/pdf'
      } as Express.Multer.File

      ;(fs.openSync as jest.Mock).mockReturnValue(1)
      ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
        PDF_MAGIC_BYTES.copy(buffer, 0)
        return 5
      })
      ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)

      await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith('File magic bytes validated', { originalname: 'document.pdf' })
    })

    it('should properly handle file spoofing attempt', async () => {
      mockReq.file = {
        path: '/storage/uploads/guest/job-789/malware.pdf',
        originalname: 'malware.pdf',
        mimetype: 'application/pdf'
      } as Express.Multer.File

      ;(fs.openSync as jest.Mock).mockReturnValue(1)
      ;(fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
        // Executable magic bytes disguised as PDF
        Buffer.from([0x4D, 0x5A]).copy(buffer, 0) // MZ - Windows executable
        return 2
      })
      ;(fs.closeSync as jest.Mock).mockReturnValue(undefined)
      ;(mockFromFile as jest.Mock).mockResolvedValue({ mime: 'application/x-msdownload' })
      ;(fs.unlinkSync as jest.Mock).mockReturnValue(undefined)
      ;(fs.readdirSync as jest.Mock).mockReturnValue([])

      await validateFileMagicBytes(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rejected file with spoofed MIME type',
        expect.objectContaining({
          detectedType: 'application/x-msdownload'
        })
      )
    })
  })
})
