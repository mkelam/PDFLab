import { Request, Response } from 'express'
import { ConversionJob } from '../models/ConversionJob'
import { User } from '../models/User'
import { Op } from 'sequelize'

/**
 * GET /api/admin/conversions
 * List all conversion jobs with filtering and pagination
 */
export const getAllConversionJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      status,
      type,
      userId,
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (search) {
      where[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { file_name: { [Op.like]: `%${search}%` } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (type && type !== 'all') {
      where.type = type
    }

    if (userId) {
      where.user_id = userId
    }

    // Get jobs with user info
    const { count, rows: jobs } = await ConversionJob.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name']
      }],
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    const totalPages = Math.ceil(count / limitNum)

    // Calculate today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completedToday = await ConversionJob.count({
      where: {
        status: 'completed',
        created_at: { [Op.gte]: today }
      }
    })

    const failedToday = await ConversionJob.count({
      where: {
        status: 'failed',
        created_at: { [Op.gte]: today }
      }
    })

    const pending = await ConversionJob.count({ where: { status: 'pending' } })
    const processing = await ConversionJob.count({ where: { status: 'processing' } })

    res.json({
      success: true,
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages
      },
      stats: {
        pending,
        processing,
        completed_today: completedToday,
        failed_today: failedToday
      }
    })
  } catch (error) {
    console.error('Get all conversion jobs error:', error)
    res.status(500).json({
      error: 'Failed to fetch conversion jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/conversions/:id
 * Get detailed job information
 */
export const getConversionJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const job = await ConversionJob.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name', 'plan']
      }]
    })

    if (!job) {
      res.status(404).json({
        error: 'Job not found'
      })
      return
    }

    res.json({
      success: true,
      job
    })
  } catch (error) {
    console.error('Get conversion job error:', error)
    res.status(500).json({
      error: 'Failed to fetch job',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/conversions/:id/retry
 * Retry a failed conversion job
 */
export const retryConversionJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const job = await ConversionJob.findByPk(id)

    if (!job) {
      res.status(404).json({
        error: 'Job not found'
      })
      return
    }

    if (job.status !== 'failed') {
      res.status(400).json({
        error: 'Can only retry failed jobs',
        message: `Job status is currently: ${job.status}`
      })
      return
    }

    // Reset job status and re-queue
    await job.update({
      status: 'pending',
      progress: 0,
      error_message: null,
      cloudconvert_job_id: null
    })

    // Re-add to Bull queue
    const { conversionQueue } = await import('../jobs/conversion.job')
    await conversionQueue.add('convert', { jobId: job.id }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    })

    res.json({
      success: true,
      message: 'Job queued for retry',
      job
    })
  } catch (error) {
    console.error('Retry job error:', error)
    res.status(500).json({
      error: 'Failed to retry job',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/conversions/:id/cancel
 * Cancel a pending/processing job
 */
export const cancelConversionJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const job = await ConversionJob.findByPk(id)

    if (!job) {
      res.status(404).json({
        error: 'Job not found'
      })
      return
    }

    if (job.status !== 'pending' && job.status !== 'processing') {
      res.status(400).json({
        error: 'Can only cancel pending or processing jobs',
        message: `Job status is currently: ${job.status}`
      })
      return
    }

    // TODO: Cancel CloudConvert job if it exists
    // This requires CloudConvert SDK implementation

    await job.update({
      status: 'failed',
      error_message: 'Cancelled by administrator'
    })

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      job
    })
  } catch (error) {
    console.error('Cancel job error:', error)
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * DELETE /api/admin/conversions/:id
 * Delete a conversion job
 */
export const deleteConversionJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const job = await ConversionJob.findByPk(id)

    if (!job) {
      res.status(404).json({
        error: 'Job not found'
      })
      return
    }

    // Delete files from storage
    const fs = await import('fs/promises')
    const path = await import('path')

    if (job.input_file) {
      try {
        const inputPath = path.join(process.cwd(), job.input_file)
        await fs.unlink(inputPath)
      } catch (err) {
        console.log('Input file already deleted or not found')
      }
    }

    if (job.output_file) {
      try {
        const outputPath = path.join(process.cwd(), job.output_file)
        await fs.unlink(outputPath)
      } catch (err) {
        console.log('Output file already deleted or not found')
      }
    }

    await job.destroy()

    res.json({
      success: true,
      message: 'Job deleted successfully'
    })
  } catch (error) {
    console.error('Delete job error:', error)
    res.status(500).json({
      error: 'Failed to delete job',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/conversions/bulk-retry
 * Retry multiple failed jobs
 */
export const bulkRetryJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobIds } = req.body

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'jobIds must be a non-empty array'
      })
      return
    }

    const jobs = await ConversionJob.findAll({
      where: {
        id: jobIds,
        status: 'failed'
      }
    })

    if (jobs.length === 0) {
      res.status(400).json({
        error: 'No failed jobs found with provided IDs'
      })
      return
    }

    // Reset jobs and re-queue
    const { conversionQueue } = await import('../jobs/conversion.job')

    for (const job of jobs) {
      await job.update({
        status: 'pending',
        progress: 0,
        error_message: null,
        cloudconvert_job_id: null
      })

      await conversionQueue.add('convert', { jobId: job.id }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      })
    }

    res.json({
      success: true,
      message: `${jobs.length} jobs queued for retry`,
      count: jobs.length
    })
  } catch (error) {
    console.error('Bulk retry error:', error)
    res.status(500).json({
      error: 'Failed to retry jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/queue/status
 * Get Bull queue health metrics
 */
export const getQueueStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversionQueue } = await import('../jobs/conversion.job')

    const waiting = await conversionQueue.getWaitingCount()
    const active = await conversionQueue.getActiveCount()
    const completed = await conversionQueue.getCompletedCount()
    const failed = await conversionQueue.getFailedCount()
    const delayed = await conversionQueue.getDelayedCount()

    // Get jobs processed in last hour for rate calculation
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const recentCompleted = await ConversionJob.count({
      where: {
        status: 'completed',
        updated_at: { [Op.gte]: new Date(oneHourAgo) }
      }
    })

    const processingRate = recentCompleted / 60 // per minute

    res.json({
      success: true,
      queue: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: await conversionQueue.isPaused(),
        processing_rate: processingRate,
        health_status: active > 0 ? 'healthy' : waiting > 100 ? 'warning' : 'healthy'
      }
    })
  } catch (error) {
    console.error('Get queue status error:', error)
    res.status(500).json({
      error: 'Failed to fetch queue status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
