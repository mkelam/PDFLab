/**
 * E2E Tests for Conversion API Endpoints
 * Tests file upload, conversion status, and download flows
 */

import request from 'supertest'
import path from 'path'
import fs from 'fs'

// Mock all external dependencies
jest.mock('../../src/config/database', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  syncDatabase: jest.fn().mockResolvedValue(true),
  sequelize: {
    close: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(false),
  closeQueues: jest.fn().mockResolvedValue(undefined),
  redisClient: {
    ping: jest.fn().mockResolvedValue('PONG'),
    isOpen: false,
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  },
  conversionQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' })
  }
}))

jest.mock('../../src/models', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    plan: 'pro',
    role: 'user',
    conversions_used: 5,
    conversions_limit: 100,
    canConvert: jest.fn().mockReturnValue(true),
    incrementConversions: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true),
    toJSON: () => ({
      id: 'user-123',
      email: 'test@example.com',
      plan: 'pro',
      conversions_used: 5,
      conversions_limit: 100
    })
  }

  const mockJob = {
    id: 'job-456',
    user_id: 'user-123',
    original_filename: 'document.pdf',
    output_format: 'docx',
    status: 'pending',
    progress: 0,
    file_size: 1024,
    created_at: new Date(),
    save: jest.fn().mockResolvedValue(true),
    toJSON: () => ({
      id: 'job-456',
      status: 'pending',
      progress: 0
    })
  }

  return {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn()
    },
    ConversionJob: {
      findAll: jest.fn().mockResolvedValue([mockJob]),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue(mockJob),
      findByPk: jest.fn()
    },
    mockUser,
    mockJob
  }
})

jest.mock('../../src/services/guest-session.service', () => ({
  default: {
    getSession: jest.fn().mockResolvedValue(null),
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'guest-session-123',
      createdAt: new Date(),
      conversionsUsed: 0,
      ipAddress: '127.0.0.1'
    }),
    validateConversion: jest.fn().mockResolvedValue({ allowed: true }),
    recordConversion: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('../../src/utils/auth.utils', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  verifyToken: jest.fn(),
  verifyRefreshToken: jest.fn()
}))

jest.mock('../../src/config/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Import after mocks
import { app } from '../../src/server'
import { User, ConversionJob, mockUser, mockJob } from '../../src/models'
import { verifyToken } from '../../src/utils/auth.utils'
import { conversionQueue, redisClient } from '../../src/config/redis'

describe('Conversion E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Setup default auth mock
    ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })
  })

  // =========================================================================
  // GET /api/history
  // =========================================================================
  describe('GET /api/history', () => {
    it('should return conversion history for authenticated user', async () => {
      const mockHistory = [
        {
          id: 'job-1',
          original_filename: 'doc1.pdf',
          output_format: 'docx',
          status: 'completed',
          created_at: new Date()
        },
        {
          id: 'job-2',
          original_filename: 'doc2.pdf',
          output_format: 'pptx',
          status: 'completed',
          created_at: new Date()
        }
      ]

      ;(ConversionJob.findAll as jest.Mock).mockResolvedValue(mockHistory)

      const response = await request(app)
        .get('/api/history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toHaveProperty('jobs')
      expect(Array.isArray(response.body.jobs)).toBe(true)
    })

    it('should return empty array for user with no history', async () => {
      ;(ConversionJob.findAll as jest.Mock).mockResolvedValue([])

      const response = await request(app)
        .get('/api/history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body.jobs).toEqual([])
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/history')
        .expect(401)

      expect(response.body).toHaveProperty('error', 'Authentication required')
    })

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/history')
        .query({ page: 1, limit: 10 })
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toHaveProperty('jobs')
    })
  })

  // =========================================================================
  // GET /api/status/:job_id
  // =========================================================================
  describe('GET /api/status/:job_id', () => {
    it('should return job status for valid job ID', async () => {
      const completedJob = {
        id: 'job-789',
        user_id: 'user-123',
        original_filename: 'document.pdf',
        output_format: 'docx',
        status: 'completed',
        progress: 100,
        output_filename: 'document.docx',
        toJSON: () => ({
          id: 'job-789',
          status: 'completed',
          progress: 100,
          output_filename: 'document.docx'
        })
      }

      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(completedJob)

      const response = await request(app)
        .get('/api/status/job-789')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'completed')
      expect(response.body).toHaveProperty('progress', 100)
    })

    it('should return processing status for in-progress job', async () => {
      const processingJob = {
        id: 'job-processing',
        user_id: 'user-123',
        status: 'processing',
        progress: 45,
        toJSON: () => ({
          id: 'job-processing',
          status: 'processing',
          progress: 45
        })
      }

      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(processingJob)

      const response = await request(app)
        .get('/api/status/job-processing')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'processing')
      expect(response.body).toHaveProperty('progress', 45)
    })

    it('should return 404 for non-existent job', async () => {
      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/status/non-existent-job')
        .set('Authorization', 'Bearer valid-token')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject access to other users job', async () => {
      const otherUserJob = {
        id: 'job-other',
        user_id: 'other-user-456' // Different user
      }

      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(null) // findOne with user_id filter returns null

      const response = await request(app)
        .get('/api/status/job-other')
        .set('Authorization', 'Bearer valid-token')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  // =========================================================================
  // GET /api/download/:job_id
  // =========================================================================
  describe('GET /api/download/:job_id', () => {
    it('should return 404 for non-existent job', async () => {
      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/download/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should return error for incomplete job', async () => {
      const incompleteJob = {
        id: 'job-incomplete',
        user_id: 'user-123',
        status: 'processing',
        progress: 50
      }

      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(incompleteJob)

      const response = await request(app)
        .get('/api/download/job-incomplete')
        .set('Authorization', 'Bearer valid-token')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return error for failed job', async () => {
      const failedJob = {
        id: 'job-failed',
        user_id: 'user-123',
        status: 'failed',
        error_message: 'Conversion failed'
      }

      ;(ConversionJob.findOne as jest.Mock).mockResolvedValue(failedJob)

      const response = await request(app)
        .get('/api/download/job-failed')
        .set('Authorization', 'Bearer valid-token')
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  // =========================================================================
  // User Quota Tests
  // =========================================================================
  describe('User Quota Management', () => {
    it('should track conversion usage', async () => {
      const userWithUsage = {
        ...mockUser,
        conversions_used: 50,
        conversions_limit: 100,
        canConvert: jest.fn().mockReturnValue(true),
        toJSON: () => ({
          conversions_used: 50,
          conversions_limit: 100,
          conversions_remaining: 50
        })
      }

      ;(User.findByPk as jest.Mock).mockResolvedValue(userWithUsage)

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      // User profile should include quota info
      expect(response.body.user).toBeDefined()
    })
  })

  // =========================================================================
  // Guest User Tests
  // =========================================================================
  describe('Guest User Conversions', () => {
    beforeEach(() => {
      // No auth token - guest user
      ;(verifyToken as jest.Mock).mockReturnValue(null)
    })

    it('should allow guest access to public endpoints', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status')
    })
  })

  // =========================================================================
  // Rate Limiting Tests
  // =========================================================================
  describe('Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' })

      const response = await request(app)
        .get('/api/history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      // Rate limit headers should be present
      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
    })
  })

  // =========================================================================
  // Error Handling Tests
  // =========================================================================
  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Not Found')
      expect(response.body).toHaveProperty('availableRoutes')
    })

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400)

      // Should return error for malformed JSON
      expect(response.status).toBe(400)
    })
  })
})
