import { Request, Response } from 'express'

// Mock dependencies BEFORE importing controller
jest.mock('../../../src/models')
jest.mock('../../../src/config/redis', () => ({
  conversionQueue: {
    add: jest.fn().mockResolvedValue({}),
    process: jest.fn(),
    on: jest.fn()
  }
}))
jest.mock('fs')
jest.mock('../../../src/config/logger')
jest.mock('../../../src/services/guest-session.service', () => ({
  default: {
    recordConversion: jest.fn().mockResolvedValue(undefined)
  }
}))
jest.mock('../../../src/middleware/guest.middleware', () => ({
  getClientIp: jest.fn().mockReturnValue('192.168.1.1')
}))

// Import after mocking
import {
  uploadFile,
  getJobStatus,
  downloadFile,
  compressPDF,
  mergePDFs,
  getConversionHistory
} from '../../../src/controllers/conversion.controller'
import { ConversionJob, ConversionType, JobStatus } from '../../../src/models'
import { conversionQueue } from '../../../src/config/redis'
import fs from 'fs'
import logger from '../../../src/config/logger'

describe('Conversion Controller Tests', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      user: undefined,
      file: undefined,
      files: undefined,
      body: {},
      params: {},
      query: {},
      guestSession: undefined
    }

    const jsonMock = jest.fn()
    const statusMock = jest.fn(() => mockResponse)
    const setHeaderMock = jest.fn()
    mockResponse = {
      status: statusMock as any,
      json: jsonMock,
      setHeader: setHeaderMock
    }

    mockNext = jest.fn()

    // Mock fs
    ;(fs.unlinkSync as jest.Mock).mockImplementation(() => {})
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)

    // Mock conversionQueue
    ;(conversionQueue.add as jest.Mock).mockResolvedValue({})
  })

  // ============================================================================
  // uploadFile - Authentication
  // ============================================================================

  describe('uploadFile - Authentication', () => {
    it('should reject requests without file', async () => {
      mockRequest.user = { id: 'user-123', plan: 'pro' } as any

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No file uploaded',
        message: 'Please provide a PDF file'
      })
    })

    it('should accept authenticated user uploads', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro',
        getMaxFileSize: jest.fn().mockReturnValue(100 * 1024 * 1024)
      } as any
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_PPTX }

      const mockJob = {
        id: 'job-123',
        status: JobStatus.PENDING,
        save: jest.fn()
      }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(ConversionJob.create).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(201)
    })

    it('should accept guest user uploads', async () => {
      mockRequest.guestSession = { sessionId: 'guest-123' }
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_PPTX }

      const mockJob = {
        id: 'job-123',
        status: JobStatus.PENDING,
        save: jest.fn()
      }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(ConversionJob.create).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(201)
    })
  })

  // ============================================================================
  // uploadFile - Validation
  // ============================================================================

  describe('uploadFile - Validation', () => {
    it('should reject invalid conversion type', async () => {
      mockRequest.user = { id: 'user-123', plan: 'pro' } as any
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: 'invalid' }

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid conversion type' })
      )
    })

    it('should reject file size over user limit', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'free',
        getMaxFileSize: jest.fn().mockReturnValue(10 * 1024 * 1024) // 10MB
      } as any
      mockRequest.file = {
        path: '/tmp/large.pdf',
        size: 50 * 1024 * 1024, // 50MB
        originalname: 'large.pdf'
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_PPTX }

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/large.pdf')
      expect(mockResponse.status).toHaveBeenCalledWith(413)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File too large',
          upgrade_required: true
        })
      )
    })

    it('should reject file size over guest limit (5MB)', async () => {
      mockRequest.guestSession = { sessionId: 'guest-123' }
      mockRequest.file = {
        path: '/tmp/large.pdf',
        size: 10 * 1024 * 1024, // 10MB
        originalname: 'large.pdf'
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_PPTX }

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/large.pdf')
      expect(mockResponse.status).toHaveBeenCalledWith(413)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File too large',
          max_file_size_mb: 5
        })
      )
    })
  })

  // ============================================================================
  // uploadFile - Guest Restrictions
  // ============================================================================

  describe('uploadFile - Guest Restrictions', () => {
    it('should allow guest PPTX conversion', async () => {
      mockRequest.guestSession = { sessionId: 'guest-123' }
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_PPTX }

      const mockJob = { id: 'job-123', status: JobStatus.PENDING, save: jest.fn() }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
    })

    it('should allow guest DOCX conversion', async () => {
      mockRequest.guestSession = { sessionId: 'guest-123' }
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_DOCX }

      const mockJob = { id: 'job-123', status: JobStatus.PENDING, save: jest.fn() }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
    })

    it('should reject guest XLSX conversion (premium format)', async () => {
      mockRequest.guestSession = { sessionId: 'guest-123' }
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_XLSX }

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Premium format',
          available_guest_formats: ['pptx', 'docx']
        })
      )
    })

    it('should reject guest IMAGES conversion (premium format)', async () => {
      mockRequest.guestSession = { sessionId: 'guest-123' }
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { conversion_type: ConversionType.PDF_TO_IMAGES }

      await uploadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Premium format' })
      )
    })
  })

  // ============================================================================
  // compressPDF
  // ============================================================================

  describe('compressPDF', () => {
    it('should require authentication', async () => {
      await compressPDF(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' })
    })

    it('should require file upload', async () => {
      mockRequest.user = { id: 'user-123', plan: 'pro' } as any

      await compressPDF(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No file uploaded' })
      )
    })

    it('should accept valid compression levels', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro',
        getMaxFileSize: jest.fn().mockReturnValue(100 * 1024 * 1024)
      } as any
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { compression_level: 'recommended' }

      const mockJob = { id: 'job-123', status: JobStatus.PENDING, save: jest.fn() }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await compressPDF(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ compression_level: 'recommended' })
      )
    })

    it('should reject invalid compression level', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro',
        getMaxFileSize: jest.fn().mockReturnValue(100 * 1024 * 1024)
      } as any
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = { compression_level: 'ultra' }

      await compressPDF(mockRequest as Request, mockResponse as Response)

      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid compression level' })
      )
    })

    it('should default to recommended compression level', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro',
        getMaxFileSize: jest.fn().mockReturnValue(100 * 1024 * 1024)
      } as any
      mockRequest.file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        size: 1024000
      } as any
      mockRequest.body = {}

      const mockJob = { id: 'job-123', status: JobStatus.PENDING, save: jest.fn() }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await compressPDF(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ compression_level: 'recommended' })
      )
    })
  })

  // ============================================================================
  // mergePDFs
  // ============================================================================

  describe('mergePDFs', () => {
    it('should require authentication', async () => {
      await mergePDFs(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
    })

    it('should require at least 2 files', async () => {
      mockRequest.user = { id: 'user-123', plan: 'pro' } as any
      mockRequest.files = []

      await mergePDFs(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Insufficient files' })
      )
    })

    it('should accept valid merge request', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'pro',
        getMaxFileSize: jest.fn().mockReturnValue(100 * 1024 * 1024)
      } as any
      mockRequest.files = [
        { path: '/tmp/file1.pdf', originalname: 'file1.pdf', size: 1024000 },
        { path: '/tmp/file2.pdf', originalname: 'file2.pdf', size: 1024000 }
      ] as any

      const mockJob = { id: 'job-123', status: JobStatus.PENDING, save: jest.fn() }
      ;(ConversionJob.create as jest.Mock).mockResolvedValue(mockJob)

      await mergePDFs(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ file_count: 2 })
      )
    })

    it('should reject when total size exceeds limit', async () => {
      mockRequest.user = {
        id: 'user-123',
        plan: 'free',
        getMaxFileSize: jest.fn().mockReturnValue(10 * 1024 * 1024)
      } as any
      mockRequest.files = [
        { path: '/tmp/file1.pdf', size: 8 * 1024 * 1024 },
        { path: '/tmp/file2.pdf', size: 8 * 1024 * 1024 }
      ] as any

      await mergePDFs(mockRequest as Request, mockResponse as Response)

      expect(fs.unlinkSync).toHaveBeenCalledTimes(2)
      expect(mockResponse.status).toHaveBeenCalledWith(413)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Total file size too large' })
      )
    })
  })

  // ============================================================================
  // getJobStatus
  // ============================================================================

  describe('getJobStatus', () => {
    it('should return job not found for non-existent job', async () => {
      mockRequest.params = { job_id: 'nonexistent' }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(null)

      await getJobStatus(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Job not found' })
      )
    })

    it('should return job status for existing job', async () => {
      mockRequest.params = { job_id: 'job-123' }
      const mockJob = {
        id: 'job-123',
        status: JobStatus.COMPLETED,
        progress: 100,
        output_file: '/tmp/output.pptx',
        getProcessingTime: jest.fn().mockReturnValue(5),
        created_at: new Date(),
        updated_at: new Date()
      }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(mockJob)

      await getJobStatus(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: 'job-123',
          status: JobStatus.COMPLETED,
          progress: 100
        })
      )
    })

    it('should calculate remaining time for processing jobs', async () => {
      mockRequest.params = { job_id: 'job-123' }
      const mockJob = {
        id: 'job-123',
        status: JobStatus.PROCESSING,
        progress: 50,
        estimated_time: 10,
        processing_started_at: new Date(Date.now() - 3000),
        getProcessingTime: jest.fn().mockReturnValue(null),
        created_at: new Date(),
        updated_at: new Date()
      }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(mockJob)

      await getJobStatus(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobStatus.PROCESSING,
          estimated_time_remaining: expect.any(Number)
        })
      )
    })
  })

  // ============================================================================
  // downloadFile
  // ============================================================================

  describe('downloadFile', () => {
    it('should return 404 for non-existent job', async () => {
      mockRequest.params = { job_id: 'nonexistent' }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(null)

      await downloadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
    })

    it('should enforce ownership for authenticated users', async () => {
      mockRequest.user = { id: 'user-123' } as any
      mockRequest.params = { job_id: 'job-456' }
      const mockJob = {
        id: 'job-456',
        user_id: 'other-user',
        status: JobStatus.COMPLETED
      }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(mockJob)

      await downloadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Forbidden' })
      )
    })

    it('should reject download of incomplete job', async () => {
      mockRequest.params = { job_id: 'job-123' }
      const mockJob = {
        id: 'job-123',
        status: JobStatus.PROCESSING
      }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(mockJob)

      await downloadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Job not completed' })
      )
    })

    it('should return 410 for expired files', async () => {
      mockRequest.params = { job_id: 'job-123' }
      const mockJob = {
        id: 'job-123',
        user_id: null,
        status: JobStatus.COMPLETED,
        output_file: '/tmp/expired.pptx',
        type: ConversionType.PDF_TO_PPTX,
        file_name: 'test.pdf',
        expires_at: new Date()
      }
      ;(ConversionJob.findByPk as jest.Mock).mockResolvedValue(mockJob)
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      await downloadFile(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(410)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'File expired' })
      )
    })
  })

  // ============================================================================
  // getConversionHistory
  // ============================================================================

  describe('getConversionHistory', () => {
    it('should require authentication', async () => {
      await getConversionHistory(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated conversion history', async () => {
      mockRequest.user = { id: 'user-123' } as any
      mockRequest.query = { page: '1', limit: '20' }

      const mockJobs = [
        {
          id: 'job-1',
          type: ConversionType.PDF_TO_PPTX,
          status: JobStatus.COMPLETED,
          file_name: 'file1.pdf',
          file_size: 1024000,
          created_at: new Date(),
          processing_completed_at: new Date(),
          getProcessingTime: jest.fn().mockReturnValue(5)
        },
        {
          id: 'job-2',
          type: ConversionType.PDF_TO_DOCX,
          status: JobStatus.COMPLETED,
          file_name: 'file2.pdf',
          file_size: 2048000,
          created_at: new Date(),
          processing_completed_at: new Date(),
          getProcessingTime: jest.fn().mockReturnValue(7)
        }
      ]

      ;(ConversionJob.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockJobs
      })

      await getConversionHistory(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: expect.arrayContaining([
            expect.objectContaining({ job_id: 'job-1' }),
            expect.objectContaining({ job_id: 'job-2' })
          ]),
          pagination: expect.objectContaining({
            total: 2,
            page: 1,
            limit: 20
          })
        })
      )
    })

    it('should limit page size to 100', async () => {
      mockRequest.user = { id: 'user-123' } as any
      mockRequest.query = { page: '1', limit: '500' }

      ;(ConversionJob.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: []
      })

      await getConversionHistory(mockRequest as Request, mockResponse as Response)

      expect(ConversionJob.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      )
    })
  })
})
