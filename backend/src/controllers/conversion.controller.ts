import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { ConversionJob, ConversionType, JobStatus, UsageLog } from '../models'
import { conversionQueue, cleanupQueue } from '../config/redis'

/**
 * Merge multiple PDF files
 */
export const mergePDFs = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    // Check if files were uploaded
    if (!req.files || !Array.isArray(req.files) || req.files.length < 2) {
      res.status(400).json({
        error: 'Insufficient files',
        message: 'Please provide at least 2 PDF files to merge'
      })
      return
    }

    const files = req.files as Express.Multer.File[]

    // Validate total file size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxFileSize = user.getMaxFileSize()

    if (totalSize > maxFileSize) {
      // Delete uploaded files
      files.forEach(file => fs.unlinkSync(file.path))

      res.status(413).json({
        error: 'Total file size too large',
        message: `Combined file size exceeds your plan limit (${Math.round(maxFileSize / 1024 / 1024)}MB)`,
        total_size: totalSize,
        max_file_size: maxFileSize,
        upgrade_required: true
      })
      return
    }

    // Create conversion job
    const jobId = uuidv4()
    const filePaths = files.map(f => f.path)
    const fileNames = files.map(f => f.originalname).join(', ')

    const job = await ConversionJob.create({
      id: jobId,
      user_id: user.id,
      type: ConversionType.PDF_MERGE,
      status: JobStatus.PENDING,
      progress: 0,
      input_file: filePaths[0], // Store first file path as primary
      file_name: `Merge: ${fileNames}`,
      file_size: totalSize,
      estimated_time: estimateProcessingTime(ConversionType.PDF_MERGE, totalSize),
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 3600000) // 1 hour
    })

    // Add job to queue with all file paths
    await conversionQueue.add({
      job_id: jobId,
      user_id: user.id,
      input_files: filePaths, // Multiple input files for merging
      output_format: 'pdf',
      conversion_type: ConversionType.PDF_MERGE,
      options: {}
    })

    // Update job status to queued
    job.status = JobStatus.QUEUED
    await job.save()

    res.status(201).json({
      message: 'Files uploaded successfully, merge queued',
      job_id: jobId,
      status: job.status,
      progress: job.progress,
      estimated_time: job.estimated_time,
      file_count: files.length,
      total_size: totalSize,
      created_at: job.created_at
    })
  } catch (error) {
    console.error('Merge PDFs error:', error)
    res.status(500).json({
      error: 'Merge failed',
      message: 'An error occurred during PDF merge'
    })
  }
}

/**
 * Upload file and create conversion job
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a PDF file'
      })
      return
    }

    const { conversion_type, dpi, pages } = req.body

    // Validate conversion type
    if (!conversion_type || !Object.values(ConversionType).includes(conversion_type)) {
      res.status(400).json({
        error: 'Invalid conversion type',
        message: `Conversion type must be one of: ${Object.values(ConversionType).join(', ')}`
      })
      return
    }

    // Validate file size
    const maxFileSize = user.getMaxFileSize()
    if (req.file.size > maxFileSize) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path)

      res.status(413).json({
        error: 'File too large',
        message: `File size exceeds your plan limit (${Math.round(maxFileSize / 1024 / 1024)}MB)`,
        file_size: req.file.size,
        max_file_size: maxFileSize,
        upgrade_required: true
      })
      return
    }

    // Create conversion job
    const jobId = uuidv4()
    const job = await ConversionJob.create({
      id: jobId,
      user_id: user.id,
      type: conversion_type as ConversionType,
      status: JobStatus.PENDING,
      progress: 0,
      input_file: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      estimated_time: estimateProcessingTime(conversion_type, req.file.size),
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 3600000) // 1 hour
    })

    // Add job to queue
    await conversionQueue.add({
      job_id: jobId,
      user_id: user.id,
      input_file: req.file.path,
      output_format: getOutputFormat(conversion_type as ConversionType),
      conversion_type: conversion_type,
      options: {
        dpi: dpi ? parseInt(dpi) : 300,
        pages: pages || 'all'
      }
    })

    // Update job status to queued
    job.status = JobStatus.QUEUED
    await job.save()

    res.status(201).json({
      message: 'File uploaded successfully, conversion queued',
      job_id: jobId,
      status: job.status,
      progress: job.progress,
      estimated_time: job.estimated_time,
      created_at: job.created_at
    })
  } catch (error) {
    console.error('Upload file error:', error)
    res.status(500).json({
      error: 'Upload failed',
      message: 'An error occurred during file upload'
    })
  }
}

/**
 * Get conversion job status
 */
export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    const { job_id } = req.params

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const job = await ConversionJob.findByPk(job_id)

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
        message: 'Conversion job does not exist'
      })
      return
    }

    // Check ownership
    if (job.user_id !== user.id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this job'
      })
      return
    }

    // Calculate remaining time
    let estimated_time_remaining: number | undefined
    if (job.status === JobStatus.PROCESSING && job.estimated_time) {
      const elapsedTime = job.processing_started_at
        ? Math.floor((Date.now() - job.processing_started_at.getTime()) / 1000)
        : 0
      estimated_time_remaining = Math.max(0, job.estimated_time - elapsedTime)
    }

    res.status(200).json({
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      estimated_time_remaining,
      output_file: job.output_file ? `/download/${job.id}` : undefined,
      error: job.error_message,
      created_at: job.created_at,
      updated_at: job.updated_at,
      processing_time: job.getProcessingTime()
    })
  } catch (error) {
    console.error('Get job status error:', error)
    res.status(500).json({
      error: 'Failed to fetch status',
      message: 'An error occurred while fetching job status'
    })
  }
}

/**
 * Download converted file
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    const { job_id } = req.params

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const job = await ConversionJob.findByPk(job_id)

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
        message: 'Conversion job does not exist'
      })
      return
    }

    // Check ownership
    if (job.user_id !== user.id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this file'
      })
      return
    }

    // Check if job is completed
    if (job.status !== JobStatus.COMPLETED) {
      res.status(400).json({
        error: 'Job not completed',
        message: `Job is currently ${job.status}. Please wait for completion.`,
        status: job.status
      })
      return
    }

    // Check if file exists
    if (!job.output_file || !fs.existsSync(job.output_file)) {
      res.status(410).json({
        error: 'File expired',
        message: 'The converted file has been deleted (files are deleted after 1 hour)'
      })
      return
    }

    // Set headers for download
    const fileName = `converted-${Date.now()}.${job.getOutputFormat()}`
    res.setHeader('Content-Type', getContentType(job.getOutputFormat()))
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    // Stream file to response
    const fileStream = fs.createReadStream(job.output_file)
    fileStream.pipe(res)

    fileStream.on('error', (error) => {
      console.error('File stream error:', error)
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Download failed',
          message: 'An error occurred while downloading the file'
        })
      }
    })
  } catch (error) {
    console.error('Download file error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Download failed',
        message: 'An error occurred while downloading the file'
      })
    }
  }
}

/**
 * Get user's conversion history
 */
export const getConversionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = (page - 1) * limit

    const { count, rows: jobs } = await ConversionJob.findAndCountAll({
      where: { user_id: user.id },
      limit,
      offset,
      order: [['created_at', 'DESC']],
      attributes: [
        'id',
        'type',
        'status',
        'file_name',
        'file_size',
        'created_at',
        'processing_completed_at',
        'error_message'
      ]
    })

    res.status(200).json({
      jobs: jobs.map(job => ({
        job_id: job.id,
        type: job.type,
        status: job.status,
        file_name: job.file_name,
        file_size: job.file_size,
        created_at: job.created_at,
        completed_at: job.processing_completed_at,
        processing_time: job.getProcessingTime(),
        error: job.error_message
      })),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    console.error('Get conversion history error:', error)
    res.status(500).json({
      error: 'Failed to fetch history',
      message: 'An error occurred while fetching conversion history'
    })
  }
}

// Helper functions

function estimateProcessingTime(conversionType: string, fileSize: number): number {
  // Rough estimates based on PRD (<5s for 20 pages)
  const baseTimes: Record<string, number> = {
    [ConversionType.PDF_TO_PPTX]: 4,
    [ConversionType.PDF_TO_DOCX]: 4,
    [ConversionType.PDF_TO_XLSX]: 4,
    [ConversionType.PDF_TO_IMAGES]: 8,
    [ConversionType.PDF_MERGE]: 2
  }

  // Scale based on file size (assume 1MB = 10 pages)
  const sizeFactor = Math.ceil(fileSize / (1024 * 1024 * 2)) // Every 2MB
  return (baseTimes[conversionType] || 5) * sizeFactor
}

function getOutputFormat(conversionType: ConversionType): string {
  switch (conversionType) {
    case ConversionType.PDF_TO_PPTX:
      return 'pptx'
    case ConversionType.PDF_TO_DOCX:
      return 'docx'
    case ConversionType.PDF_TO_XLSX:
      return 'xlsx'
    case ConversionType.PDF_TO_IMAGES:
      return 'png'
    case ConversionType.PDF_MERGE:
      return 'pdf'
    default:
      return 'bin'
  }
}

function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    zip: 'application/zip'
  }
  return contentTypes[format] || 'application/octet-stream'
}
