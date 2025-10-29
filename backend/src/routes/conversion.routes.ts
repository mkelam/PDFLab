import { Router } from 'express'
import {
  uploadFile,
  mergePDFs,
  getJobStatus,
  downloadFile,
  getConversionHistory
} from '../controllers/conversion.controller'
import { authMiddleware, checkConversionQuota } from '../middleware/auth.middleware'
import { uploadMiddleware, uploadMultipleMiddleware, handleUploadError } from '../middleware/upload.middleware'
import { uploadLimiter, downloadLimiter } from '../middleware/ratelimit.middleware'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Upload and start conversion
router.post(
  '/upload',
  uploadLimiter,
  checkConversionQuota,
  uploadMiddleware.single('file'),
  handleUploadError,
  uploadFile
)

// Merge multiple PDFs
router.post(
  '/merge',
  uploadLimiter,
  checkConversionQuota,
  uploadMultipleMiddleware.array('files', 10),
  handleUploadError,
  mergePDFs
)

// Get job status
router.get('/status/:job_id', getJobStatus)

// Download converted file
router.get('/download/:job_id', downloadLimiter, downloadFile)

// Get conversion history
router.get('/history', getConversionHistory)

export default router
