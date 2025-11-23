import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import archiver from 'archiver'
import { BatchJob, BatchOperationType, BatchStatus, ConversionJob, ConversionType, JobStatus } from '../models'
import { conversionQueue } from '../config/redis'
import { PLAN_QUOTAS } from '../utils/quota.utils'
import logger from '../config/logger'

// Helper function to get storage path
const getStoragePath = (): string => {
  const storagePath = process.env['STORAGE_PATH'] || './storage'
  return path.resolve(storagePath)
}

// Helper to estimate processing time
const estimateProcessingTime = (type: string, fileSize: number): number => {
  const baseTime = 5000 // 5 seconds base
  const sizeMultiplier = Math.ceil(fileSize / (1024 * 1024)) // Per MB
  return baseTime + sizeMultiplier * 2000
}

/**
 * Upload multiple files for batch processing
 * POST /api/batch/upload
 */
export const uploadBatchFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    // Check if files were uploaded
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      res.status(400).json({
        error: 'No files uploaded',
        message: 'Please provide at least one file for batch processing'
      })
      return
    }

    // Get operation type and options from request
    const operation_type = req.body.operation_type as BatchOperationType
    const batch_name = req.body.batch_name || `Batch ${new Date().toLocaleString()}`
    const output_format = req.body.output_format as 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg' | undefined
    const compression_level = req.body.compression_level as 'good' | 'recommended' | 'extreme' | undefined

    // Validate operation type
    if (!Object.values(BatchOperationType).includes(operation_type)) {
      // Cleanup uploaded files
      files.forEach(file => fs.unlinkSync(file.path))
      res.status(400).json({
        error: 'Invalid operation type',
        message: 'Operation type must be one of: convert, compress, merge'
      })
      return
    }

    // Validate file count based on plan
    const maxBatchSize = PLAN_QUOTAS[user.plan].batch_size
    if (files.length > maxBatchSize) {
      // Cleanup uploaded files
      files.forEach(file => fs.unlinkSync(file.path))
      res.status(400).json({
        error: 'Too many files',
        message: `Your ${user.plan} plan supports up to ${maxBatchSize} files per batch`,
        uploaded_files: files.length,
        max_batch_size: maxBatchSize,
        upgrade_required: true
      })
      return
    }

    // Calculate total size and validate
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxFileSize = user.getMaxFileSize()

    // Check if any individual file exceeds limit
    const oversizedFile = files.find(file => file.size > maxFileSize)
    if (oversizedFile) {
      // Cleanup uploaded files
      files.forEach(file => fs.unlinkSync(file.path))
      res.status(413).json({
        error: 'File too large',
        message: `File "${oversizedFile.originalname}" exceeds your ${user.plan} plan limit of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        file_name: oversizedFile.originalname,
        file_size: oversizedFile.size,
        max_file_size: maxFileSize,
        upgrade_required: true
      })
      return
    }

    // Create batch job
    const batchId = uuidv4()
    const batchJob = await BatchJob.create({
      id: batchId,
      user_id: user.id,
      batch_name,
      operation_type,
      total_files: files.length,
      completed_files: 0,
      failed_files: 0,
      status: BatchStatus.PENDING,
      progress: 0,
      conversion_job_ids: [],
      total_size: totalSize,
      options: {
        output_format,
        compression_level
      },
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
    })

    // Create individual conversion jobs for each file
    const conversionJobIds: string[] = []

    for (const file of files) {
      const jobId = uuidv4()

      // Determine conversion type based on operation
      let conversionType: ConversionType
      switch (operation_type) {
        case BatchOperationType.CONVERT:
          if (output_format === 'pptx') conversionType = ConversionType.PDF_TO_PPTX
          else if (output_format === 'docx') conversionType = ConversionType.PDF_TO_DOCX
          else if (output_format === 'xlsx') conversionType = ConversionType.PDF_TO_XLSX
          else conversionType = ConversionType.PDF_TO_IMAGES
          break
        case BatchOperationType.COMPRESS:
          conversionType = ConversionType.PDF_COMPRESS
          break
        case BatchOperationType.MERGE:
          conversionType = ConversionType.PDF_MERGE
          break
        default:
          conversionType = ConversionType.PDF_TO_DOCX
      }

      // Create conversion job
      const conversionJob = await ConversionJob.create({
        id: jobId,
        user_id: user.id,
        type: conversionType,
        status: JobStatus.PENDING,
        progress: 0,
        input_file: file.path,
        file_name: file.originalname,
        file_size: file.size,
        estimated_time: estimateProcessingTime(conversionType, file.size),
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
      })

      conversionJobIds.push(jobId)

      // Add job to conversion queue
      await conversionQueue.add({
        job_id: jobId,
        user_id: user.id,
        input_file: file.path,
        output_format: output_format || 'docx',
        conversion_type: conversionType,
        batch_id: batchId, // Link to batch job
        options: {
          compression_level
        }
      })

      // Update job status to queued
      conversionJob.status = JobStatus.QUEUED
      await conversionJob.save()
    }

    // Update batch job with conversion IDs
    batchJob.conversion_job_ids = conversionJobIds
    batchJob.status = BatchStatus.PROCESSING
    batchJob.processing_started_at = new Date()
    await batchJob.save()

    res.status(201).json({
      message: 'Batch uploaded successfully, processing started',
      batch_id: batchId,
      batch_name,
      operation_type,
      total_files: files.length,
      status: batchJob.status,
      progress: batchJob.progress,
      conversion_job_ids: conversionJobIds,
      created_at: batchJob.created_at
    })
  } catch (error) {
    const { sendInternalServerError, logError } = require('../utils/error.utils')
    logError(error, 'Batch upload error')
    sendInternalServerError(res, 'Failed to upload batch files', error)
  }
}

/**
 * Get batch job status with individual file progress
 * GET /api/batch/status/:id
 */
export const getBatchStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const batchId = req.params.id

    // Find batch job
    const batchJob = await BatchJob.findByPk(batchId)

    if (!batchJob) {
      res.status(404).json({
        error: 'Batch not found',
        message: 'The requested batch job does not exist'
      })
      return
    }

    // Verify ownership
    if (batchJob.user_id !== user.id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this batch'
      })
      return
    }

    // Get all conversion jobs for this batch
    const conversionJobs = await ConversionJob.findAll({
      where: {
        id: batchJob.conversion_job_ids
      },
      order: [['created_at', 'ASC']]
    })

    // Update batch progress based on conversion jobs
    const completedCount = conversionJobs.filter(job => job.status === JobStatus.COMPLETED).length
    const failedCount = conversionJobs.filter(job => job.status === JobStatus.FAILED).length

    batchJob.completed_files = completedCount
    batchJob.failed_files = failedCount
    batchJob.updateProgress()
    await batchJob.save()

    res.json({
      batch_id: batchJob.id,
      batch_name: batchJob.batch_name,
      operation_type: batchJob.operation_type,
      status: batchJob.status,
      progress: batchJob.progress,
      total_files: batchJob.total_files,
      completed_files: batchJob.completed_files,
      failed_files: batchJob.failed_files,
      success_rate: batchJob.getSuccessRate(),
      failure_rate: batchJob.getFailureRate(),
      zip_file_path: batchJob.zip_file_path,
      processing_time: batchJob.getProcessingTime(),
      created_at: batchJob.created_at,
      expires_at: batchJob.expires_at,
      files: conversionJobs.map(job => ({
        job_id: job.id,
        file_name: job.file_name,
        file_size: job.file_size,
        status: job.status,
        progress: job.progress,
        error_message: job.error_message,
        output_file: job.output_file
      }))
    })
  } catch (error) {
    const { sendInternalServerError, logError } = require('../utils/error.utils')
    logError(error, 'Get batch status error')
    sendInternalServerError(res, 'Failed to get batch status', error)
  }
}

/**
 * Download ZIP archive of all converted files in batch
 * GET /api/batch/download/:id
 */
export const downloadBatchZip = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const batchId = req.params.id

    // Find batch job
    const batchJob = await BatchJob.findByPk(batchId)

    if (!batchJob) {
      res.status(404).json({
        error: 'Batch not found',
        message: 'The requested batch job does not exist'
      })
      return
    }

    // Verify ownership
    if (batchJob.user_id !== user.id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this batch'
      })
      return
    }

    // Check if batch is complete
    if (!batchJob.isComplete()) {
      res.status(400).json({
        error: 'Batch not ready',
        message: 'Batch processing is not complete yet',
        status: batchJob.status,
        progress: batchJob.progress
      })
      return
    }

    // Check if batch has expired
    if (batchJob.isExpired()) {
      res.status(410).json({
        error: 'Batch expired',
        message: 'Batch files have been deleted after 7 days',
        expired_at: batchJob.expires_at
      })
      return
    }

    // Get all completed conversion jobs
    const conversionJobs = await ConversionJob.findAll({
      where: {
        id: batchJob.conversion_job_ids,
        status: JobStatus.COMPLETED
      }
    })

    if (conversionJobs.length === 0) {
      res.status(404).json({
        error: 'No files available',
        message: 'No successfully converted files found in this batch'
      })
      return
    }

    // Create ZIP archive if it doesn't exist
    if (!batchJob.zip_file_path || !fs.existsSync(batchJob.zip_file_path)) {
      const storagePath = getStoragePath()
      const zipDir = path.join(storagePath, 'batch_downloads', user.id)

      // Ensure directory exists
      if (!fs.existsSync(zipDir)) {
        fs.mkdirSync(zipDir, { recursive: true })
      }

      const zipPath = path.join(zipDir, `${batchId}.zip`)
      const output = fs.createWriteStream(zipPath)
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      })

      // Handle archive errors
      archive.on('error', (err) => {
        throw err
      })

      // Pipe archive to file
      archive.pipe(output)

      // Add all converted files to archive
      for (const job of conversionJobs) {
        if (job.output_file && fs.existsSync(job.output_file)) {
          const fileName = path.basename(job.output_file)
          archive.file(job.output_file, { name: fileName })
        }
      }

      // Finalize archive
      await archive.finalize()

      // Wait for stream to finish
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve())
        output.on('error', reject)
      })

      // Update batch job with ZIP path
      batchJob.zip_file_path = zipPath
      await batchJob.save()
    }

    // Download ZIP file
    const zipPath = batchJob.zip_file_path
    const fileName = `${batchJob.batch_name.replace(/[^a-z0-9]/gi, '_')}.zip`

    res.download(zipPath, fileName, (err) => {
      if (err) {
        logger.error('Download error:', { error: err instanceof Error ? err.message : String(err) })
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Download failed',
            message: 'Failed to download ZIP file'
          })
        }
      }
    })
  } catch (error) {
    const { sendInternalServerError, logError } = require('../utils/error.utils')
    logError(error, 'Download batch ZIP error')
    sendInternalServerError(res, 'Failed to download batch files', error)
  }
}

/**
 * Get user's batch history
 * GET /api/batch/history
 */
export const getBatchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    const { count, rows: batchJobs } = await BatchJob.findAndCountAll({
      where: {
        user_id: user.id
      },
      order: [['created_at', 'DESC']],
      limit,
      offset
    })

    res.json({
      batches: batchJobs.map(batch => ({
        batch_id: batch.id,
        batch_name: batch.batch_name,
        operation_type: batch.operation_type,
        status: batch.status,
        progress: batch.progress,
        total_files: batch.total_files,
        completed_files: batch.completed_files,
        failed_files: batch.failed_files,
        success_rate: batch.getSuccessRate(),
        created_at: batch.created_at,
        expires_at: batch.expires_at
      })),
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    const { sendInternalServerError, logError } = require('../utils/error.utils')
    logError(error, 'Get batch history error')
    sendInternalServerError(res, 'Failed to get batch history', error)
  }
}

/**
 * Cancel batch job (if not started or in progress)
 * DELETE /api/batch/:id
 */
export const cancelBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const batchId = req.params.id

    // Find batch job
    const batchJob = await BatchJob.findByPk(batchId)

    if (!batchJob) {
      res.status(404).json({
        error: 'Batch not found',
        message: 'The requested batch job does not exist'
      })
      return
    }

    // Verify ownership
    if (batchJob.user_id !== user.id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to cancel this batch'
      })
      return
    }

    // Check if batch can be cancelled
    if (!batchJob.canCancel()) {
      res.status(400).json({
        error: 'Cannot cancel',
        message: `Batch cannot be cancelled in ${batchJob.status} status`,
        status: batchJob.status
      })
      return
    }

    // Update batch status
    batchJob.status = BatchStatus.CANCELLED
    await batchJob.save()

    res.json({
      message: 'Batch cancelled successfully',
      batch_id: batchJob.id,
      status: batchJob.status
    })
  } catch (error) {
    const { sendInternalServerError, logError } = require('../utils/error.utils')
    logError(error, 'Cancel batch error')
    sendInternalServerError(res, 'Failed to cancel batch', error)
  }
}
