import { Router } from 'express'
import {
  uploadFile,
  batchConvert,
  compressPDF,
  mergePDFs,
  getJobStatus,
  downloadFile,
  downloadBatchZip,
  getConversionHistory
} from '../controllers/conversion.controller'
import { authMiddleware, optionalAuthMiddleware, checkConversionQuota } from '../middleware/auth.middleware'
import { uploadMiddleware, uploadMultipleMiddleware, handleUploadError } from '../middleware/upload.middleware'
import { uploadLimiter, downloadLimiter } from '../middleware/ratelimit.middleware'
import { validateGuestQuota, recordGuestConversion } from '../middleware/guest.middleware'
import { trackUpload, trackDownload, trackQuotaReached } from '../middleware/analytics.middleware'

const router = Router()

// Upload and start conversion (supports both authenticated and guest users)
router.post(
  '/upload',
  uploadLimiter,
  optionalAuthMiddleware, // Auth is optional - allows guests
  validateGuestQuota, // Check guest quota if not authenticated
  trackQuotaReached, // Track when guests hit quota limit
  checkConversionQuota, // Check user quota if authenticated
  uploadMiddleware.single('file'),
  handleUploadError,
  trackUpload, // Track successful uploads
  uploadFile
)

// Batch convert multiple files (requires authentication - Pro/Enterprise only)
router.post(
  '/batch-convert',
  uploadLimiter,
  authMiddleware,
  uploadMultipleMiddleware.array('files', 10),
  handleUploadError,
  trackUpload,
  batchConvert
)

// Compress PDF (requires authentication)
router.post(
  '/compress',
  uploadLimiter,
  authMiddleware,
  checkConversionQuota,
  uploadMiddleware.single('file'),
  handleUploadError,
  trackUpload,
  compressPDF
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

// Get job status (public - no auth required)
router.get('/status/:job_id', getJobStatus)

// Download converted file (supports both authenticated and guest users)
router.get('/download/:job_id', downloadLimiter, optionalAuthMiddleware, trackDownload, downloadFile)

// Download multiple files as ZIP (batch conversion results)
router.get('/download-batch', downloadLimiter, optionalAuthMiddleware, downloadBatchZip)

// Get conversion history (requires authentication)
router.get('/history', authMiddleware, getConversionHistory)

// Merge PDFs requires authentication
router.use('/merge', authMiddleware)

export default router
