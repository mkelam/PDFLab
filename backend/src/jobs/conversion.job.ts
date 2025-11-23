import { Job } from 'bull'
import path from 'path'
import { getConversionQueue, getCleanupQueue } from '../config/redis'
import { cloudConvertService } from '../services/cloudconvert.service'
import { ConversionJob, JobStatus, User, UsageLog } from '../models'
import logger from '../config/logger'
import {
  recordConversion,
  updateQueueMetrics,
  cloudconvertErrors,
  queueJobDuration
} from '../config/metrics'

// Helper function to get absolute storage path
const getStoragePath = (): string => {
  const storagePath = process.env['STORAGE_PATH'] || './storage'
  return path.resolve(storagePath)
}

interface ConversionJobData {
  job_id: string
  user_id: string
  input_file?: string
  input_files?: string[] // For PDF merge
  output_format: 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg' | 'pdf'
  conversion_type: string
  options?: {
    dpi?: number
    pages?: string
    ocr?: boolean
    compression_level?: 'good' | 'recommended' | 'extreme'
  }
}

/**
 * Export the conversion queue for external use
 */
export const conversionQueue = getConversionQueue()

/**
 * Initialize conversion job worker
 */
export const initializeConversionWorker = () => {
  const conversionQueue = getConversionQueue()
  const cleanupQueue = getCleanupQueue()

  if (!conversionQueue || !cleanupQueue) {
    logger.warn('⚠ Cannot initialize conversion worker - Redis not available')
    return
  }

  logger.info('✓ Initializing conversion worker...')

  /**
   * Process conversion jobs from the queue
   * Concurrency: 3 workers (safe for 4GB VPS)
   * Memory calculation: 3 workers × 100MB = 300MB (safe for 1GB backend limit)
   * Configurable via WORKER_CONCURRENCY environment variable
   */
  const concurrency = process.env.WORKER_CONCURRENCY
    ? parseInt(process.env.WORKER_CONCURRENCY)
    : 3  // Safe for 4GB VPS (reduced from 5)

  logger.info('Starting conversion queue', {
    maxConcurrency: concurrency,
    vpsRAM: '4GB',
    estimatedMemoryPerJob: '~100MB'
  })

  conversionQueue.process(concurrency, async (job: Job<ConversionJobData>) => {
  const { job_id, user_id, input_file, output_format, conversion_type, options } = job.data

  logger.info(`[Conversion Worker] Processing job ${job_id} for user ${user_id}`)

  const startTime = Date.now()
  const jobCreatedAt = job.timestamp
  const queueWaitTime = (startTime - jobCreatedAt) / 1000 // seconds

  // Track time spent in queue
  queueJobDuration.observe({ queue: 'conversion' }, queueWaitTime)

  try {
    // 1. Get the conversion job record to retrieve original filename
    const conversionJobRecord = await ConversionJob.findByPk(job_id)
    if (!conversionJobRecord) {
      throw new Error(`Conversion job ${job_id} not found`)
    }

    const originalFileName = conversionJobRecord.file_name
    const fileBaseName = path.basename(originalFileName, path.extname(originalFileName))

    // 2. Update job status to processing
    await ConversionJob.update(
      {
        status: JobStatus.PROCESSING,
        processing_started_at: new Date(),
        progress: 10
      },
      { where: { id: job_id } }
    )

    job.progress(10)

    // 3. Define output path with original filename
    // For guest users (user_id = null), use 'guest' as folder name
    const userFolder = user_id || 'guest'
    const outputDir = path.join(
      getStoragePath(),
      'outputs',
      userFolder,
      job_id
    )

    // Use original filename for office formats, special handling for images
    let outputFileName: string
    if (output_format === 'jpg' || output_format === 'png') {
      // For images, we'll handle naming in the CloudConvert service
      // Single page: presentation.jpg
      // Multi-page: presentation-images.zip (with presentation-page-1.jpg inside)
      outputFileName = `${fileBaseName}.${output_format}`
    } else {
      // For office formats: presentation.pptx, presentation.docx, etc.
      outputFileName = `${fileBaseName}.${output_format}`
    }

    const outputFile = path.join(outputDir, outputFileName)

    // 3. Call CloudConvert service
    logger.info(`[Conversion Worker] Starting CloudConvert for job ${job_id}`)

    let result

    // Check if this is a compression job
    if (conversion_type === 'pdf_compress' && input_file) {
      logger.info(`[Conversion Worker] Compressing PDF file with level: ${options?.compression_level || 'recommended'}`)
      result = await cloudConvertService.compressPDF(
        input_file,
        outputFile,
        options?.compression_level || 'recommended'
      )
    }
    // Check if this is a merge job (multiple input files)
    else if (job.data.input_files && job.data.input_files.length > 0) {
      logger.info(`[Conversion Worker] Merging ${job.data.input_files.length} PDF files`)
      result = await cloudConvertService.mergePDFs(job.data.input_files, outputFile)
    } else if (input_file) {
      // Single file conversion
      result = await cloudConvertService.convertFile({
        inputFormat: 'pdf',
        outputFormat: output_format as 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg',
        inputFilePath: input_file,
        outputFilePath: outputFile,
        originalFileName: fileBaseName, // Pass original filename for proper naming
        webhookUrl: `${process.env['API_URL']}/webhook/cloudconvert`,
        options: options || {}
      })
    } else {
      throw new Error('No input file(s) provided')
    }

    if (!result.success) {
      // Track CloudConvert errors
      cloudconvertErrors.inc({ error_type: 'conversion_failed' })

      // Provide specific error messages for common issues
      let errorMessage = result.error || 'CloudConvert operation failed'

      // XLSX conversion specific error handling
      if (output_format === 'xlsx') {
        // Check if error is related to missing table data
        if (errorMessage.toLowerCase().includes('table') ||
            errorMessage.toLowerCase().includes('no data') ||
            errorMessage.toLowerCase().includes('empty')) {
          errorMessage = 'XLSX conversion failed: This PDF does not contain table data that can be converted to Excel format. Please try converting to DOCX or PPTX instead, or use a PDF with structured table content.'
        } else {
          errorMessage = `XLSX conversion failed: ${errorMessage}. Note: XLSX format requires PDFs with table data. Consider using DOCX or PPTX for better results.`
        }
      }

      throw new Error(errorMessage)
    }

    job.progress(90)

    // 4. Update job as completed
    // Use result.outputPath instead of outputFile to handle ZIP creation for multi-page images
    await ConversionJob.update(
      {
        status: JobStatus.COMPLETED,
        output_file: result.outputPath || outputFile,
        progress: 100,
        processing_completed_at: new Date(),
        cloudconvert_job_id: result.jobId
      },
      { where: { id: job_id } }
    )

    // 5. Increment user conversion count (skip for guest users)
    if (user_id) {
      await User.increment('conversions_used', { where: { id: user_id } })
    }

    // 6. Log usage (skip for guest users - they don't have usage logs)
    const processingTime = Date.now() - startTime
    if (user_id) {
      await UsageLog.create({
        user_id,
        job_id,
        operation_type: conversion_type,
        success: true,
        processing_time: processingTime,
        file_size: 0, // Will be set from ConversionJob
        timestamp: new Date()
      })
    }

    // 7. Schedule cleanup (delete files after 1 hour)
    await cleanupQueue.add(
      { job_id, user_id },
      {
        delay: 3600000 // 1 hour in milliseconds
      }
    )

    logger.info(`[Conversion Worker] Job ${job_id} completed successfully in ${processingTime}ms`)

    job.progress(100)

    return {
      success: true,
      output_file: result.outputPath || outputFile,
      processing_time: processingTime
    }
  } catch (error: any) {
    logger.error(`[Conversion Worker] Job ${job_id} failed:`, { error: error instanceof Error ? error.message : String(error) })

    // Update job as failed
    await ConversionJob.update(
      {
        status: JobStatus.FAILED,
        error_message: error.message || 'Unknown error during conversion',
        progress: 0
      },
      { where: { id: job_id } }
    )

    // Log failure (skip for guest users)
    const processingTime = Date.now() - startTime
    if (user_id) {
      await UsageLog.create({
        user_id,
        job_id,
        operation_type: conversion_type,
        success: false,
        processing_time: processingTime,
        file_size: 0,
        error_code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date()
      })
    }

    // Re-throw to trigger Bull retry logic
    throw error
  }
})

  // Queue event listeners (already defined in redis.ts, but adding specific logging)
  conversionQueue.on('completed', (job, result) => {
    logger.info(`✓ Conversion job ${job.id} completed:`, { result })
  })

  conversionQueue.on('failed', (job, error) => {
    logger.error(`✗ Conversion job ${job?.id} failed:`, { error: error.message instanceof Error ? error.message.message : String(error.message) })
  })

  conversionQueue.on('stalled', (job) => {
    logger.warn(`⚠ Conversion job ${job.id} stalled - will be retried`)
  })
}

// DO NOT initialize on module load - let server.ts call this after Redis connects
// initializeConversionWorker()
