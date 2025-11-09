import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { uploadMultipleMiddleware } from '../middleware/upload.middleware'
import {
  uploadBatchFiles,
  getBatchStatus,
  downloadBatchZip,
  getBatchHistory,
  cancelBatch
} from '../controllers/batch.controller'

const router = Router()

/**
 * Batch Processing Routes
 * All routes require authentication
 */

// Upload multiple files for batch processing
// Supports up to 50 files (plan-dependent limits apply)
router.post(
  '/upload',
  authMiddleware,
  uploadMultipleMiddleware.array('files', 50), // Max 50 files (will be filtered by plan limits)
  uploadBatchFiles
)

// Get batch job status with individual file progress
router.get('/status/:id', authMiddleware, getBatchStatus)

// Download ZIP archive of all converted files
router.get('/download/:id', authMiddleware, downloadBatchZip)

// Get user's batch processing history
router.get('/history', authMiddleware, getBatchHistory)

// Cancel batch job (if pending or processing)
router.delete('/:id', authMiddleware, cancelBatch)

export default router
