import { Router } from 'express'
import { addTextToPDF, analyzePdf, replacePdfText } from '../controllers/pdf.editor.controller'
import { optionalAuthMiddleware } from '../middleware/auth.middleware'
import { handleUploadError, uploadMiddleware } from '../middleware/upload.middleware'

const router = Router()

// Add text to PDF
router.post(
  '/edit/add-text',
  optionalAuthMiddleware, // Allow guests for now, or enforce auth
  uploadMiddleware.single('file'),
  handleUploadError,
  addTextToPDF
)

// Analyze PDF (Convert to JSON)
router.post(
  '/edit/analyze',
  optionalAuthMiddleware,
  uploadMiddleware.single('file'),
  handleUploadError,
  analyzePdf
)

// Replace Text in PDF
router.post(
  '/edit/replace-text',
  optionalAuthMiddleware,
  uploadMiddleware.single('file'),
  handleUploadError,
  replacePdfText
)

export default router
