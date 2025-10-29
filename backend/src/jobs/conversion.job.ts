import { Job } from 'bull'
import path from 'path'
import { conversionQueue, cleanupQueue } from '../config/redis'
import { cloudConvertService } from '../services/cloudconvert.service'
import { ConversionJob, JobStatus, User, UsageLog } from '../models'

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
  }
}

/**
 * Process conversion jobs from the queue
 */
conversionQueue.process(5, async (job: Job<ConversionJobData>) => {
  const { job_id, user_id, input_file, output_format, conversion_type, options } = job.data

  console.log(`[Conversion Worker] Processing job ${job_id} for user ${user_id}`)

  const startTime = Date.now()

  try {
    // 1. Update job status to processing
    await ConversionJob.update(
      {
        status: JobStatus.PROCESSING,
        processing_started_at: new Date(),
        progress: 10
      },
      { where: { id: job_id } }
    )

    job.progress(10)

    // 2. Define output path
    const outputDir = path.join(
      process.env.STORAGE_PATH || './storage',
      'outputs',
      user_id,
      job_id
    )

    const outputFile = path.join(outputDir, `output.${output_format}`)

    // 3. Call CloudConvert service
    console.log(`[Conversion Worker] Starting CloudConvert for job ${job_id}`)

    let result

    // Check if this is a merge job (multiple input files)
    if (job.data.input_files && job.data.input_files.length > 0) {
      console.log(`[Conversion Worker] Merging ${job.data.input_files.length} PDF files`)
      result = await cloudConvertService.mergePDFs(job.data.input_files, outputFile)
    } else if (input_file) {
      // Single file conversion
      result = await cloudConvertService.convertFile({
        inputFormat: 'pdf',
        outputFormat: output_format,
        inputFilePath: input_file,
        outputFilePath: outputFile,
        webhookUrl: `${process.env.API_URL}/webhook/cloudconvert`,
        options: options || {}
      })
    } else {
      throw new Error('No input file(s) provided')
    }

    if (!result.success) {
      throw new Error(result.error || 'CloudConvert operation failed')
    }

    job.progress(90)

    // 4. Update job as completed
    await ConversionJob.update(
      {
        status: JobStatus.COMPLETED,
        output_file: outputFile,
        progress: 100,
        processing_completed_at: new Date(),
        cloudconvert_job_id: result.jobId
      },
      { where: { id: job_id } }
    )

    // 5. Increment user conversion count
    await User.increment('conversions_used', { where: { id: user_id } })

    // 6. Log usage
    const processingTime = Date.now() - startTime
    await UsageLog.create({
      user_id,
      job_id,
      operation_type: conversion_type,
      success: true,
      processing_time: processingTime,
      file_size: 0, // Will be set from ConversionJob
      timestamp: new Date()
    })

    // 7. Schedule cleanup (delete files after 1 hour)
    await cleanupQueue.add(
      { job_id, user_id },
      {
        delay: 3600000 // 1 hour in milliseconds
      }
    )

    console.log(`[Conversion Worker] Job ${job_id} completed successfully in ${processingTime}ms`)

    job.progress(100)

    return {
      success: true,
      output_file: outputFile,
      processing_time: processingTime
    }
  } catch (error: any) {
    console.error(`[Conversion Worker] Job ${job_id} failed:`, error)

    // Update job as failed
    await ConversionJob.update(
      {
        status: JobStatus.FAILED,
        error_message: error.message || 'Unknown error during conversion',
        progress: 0
      },
      { where: { id: job_id } }
    )

    // Log failure
    const processingTime = Date.now() - startTime
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

    // Re-throw to trigger Bull retry logic
    throw error
  }
})

// Queue event listeners (already defined in redis.ts, but adding specific logging)
conversionQueue.on('completed', (job, result) => {
  console.log(`✓ Conversion job ${job.id} completed:`, result)
})

conversionQueue.on('failed', (job, error) => {
  console.error(`✗ Conversion job ${job?.id} failed:`, error.message)
})

conversionQueue.on('stalled', (job) => {
  console.warn(`⚠ Conversion job ${job.id} stalled - will be retried`)
})

export default conversionQueue
