import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { Request } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const userId = req.userId || 'anonymous'
    const jobId = uuidv4()

    const uploadPath = path.join(
      process.env.STORAGE_PATH || './storage',
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
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (req: Request) => {
      // Dynamic file size based on user plan
      const userPlan = req.userPlan || 'free'

      switch (userPlan) {
        case 'enterprise':
          return 524288000 // 500MB
        case 'pro':
          return parseInt(process.env.MAX_FILE_SIZE_PRO || '104857600') // 100MB
        case 'starter':
          return parseInt(process.env.MAX_FILE_SIZE_STARTER || '26214400') // 25MB
        case 'free':
        default:
          return parseInt(process.env.MAX_FILE_SIZE_FREE || '10485760') // 10MB
      }
    },
    files: 1 // Single file upload
  }
})

// Multer configuration for multiple file uploads (for PDF merge)
export const uploadMultipleMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (req: Request) => {
      // Dynamic file size based on user plan
      const userPlan = req.userPlan || 'free'

      switch (userPlan) {
        case 'enterprise':
          return 524288000 // 500MB
        case 'pro':
          return parseInt(process.env.MAX_FILE_SIZE_PRO || '104857600') // 100MB
        case 'starter':
          return parseInt(process.env.MAX_FILE_SIZE_STARTER || '26214400') // 25MB
        case 'free':
        default:
          return parseInt(process.env.MAX_FILE_SIZE_FREE || '10485760') // 10MB
      }
    },
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
    return res.status(415).json({
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
