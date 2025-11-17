import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { Request } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Helper function to get absolute storage path
const getStoragePath = (): string => {
  const storagePath = process.env['STORAGE_PATH'] || './storage'
  return path.resolve(storagePath)
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    // Use userId for authenticated users, 'guest' for guest users
    const userId = req.userId || 'guest'
    const jobId = uuidv4()

    const uploadPath = path.join(
      getStoragePath(),
      'uploads',
      userId,
      jobId
    )

    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true })

    // Store jobId in request for later use
    ;(req as any).jobId = jobId

    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp
    const timestamp = Date.now()
    const originalName = file.originalname.replace(/\s+/g, '-')
    cb(null, `${timestamp}-${originalName}`)
  }
})

// File filter - only PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true)
  } else {
    cb(new Error('Only PDF files are allowed'))
  }
}

// Multer configuration for single file upload
// Note: Using maximum possible size (500MB for enterprise), plan-specific validation done in routes
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 524288000, // 500MB max (enterprise limit)
    files: 1 // Single file upload
  }
})

// Multer configuration for multiple file uploads (for PDF merge)
// Note: Using maximum possible size (500MB for enterprise), plan-specific validation done in routes
export const uploadMultipleMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 524288000, // 500MB max (enterprise limit)
    files: 10 // Maximum 10 files for merging
  }
})

// Error handler for multer errors
export const handleUploadError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size exceeds your plan limit',
        code: err.code
      })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Please upload only one file at a time',
        code: err.code
      })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Unexpected file field in the request',
        code: err.code
      })
    }
  }

  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only PDF files are allowed'
    })
  }

  // Generic error
  return res.status(500).json({
    error: 'Upload failed',
    message: err.message || 'An error occurred during file upload'
  })
}
