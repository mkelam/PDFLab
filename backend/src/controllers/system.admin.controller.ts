import { Request, Response } from 'express'
import { Op, QueryTypes } from 'sequelize'
import { sequelize } from '../config/database'
import { redisClient, conversionQueue } from '../config/redis'
import { ConversionJob, JobStatus } from '../models/ConversionJob'
import { User } from '../models/User'
import { SystemHealthLog, HealthStatus } from '../models/SystemHealthLog'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const unlink = promisify(fs.unlink)

/**
 * Get overall system health summary
 * GET /api/admin/system/health
 */
export const getSystemHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    // CloudConvert health
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const totalJobs = await ConversionJob.count({
      where: { created_at: { [Op.gte]: last24Hours } }
    })
    const completedJobs = await ConversionJob.count({
      where: { status: 'completed', created_at: { [Op.gte]: last24Hours } }
    })
    const failedJobs = await ConversionJob.count({
      where: { status: 'failed', created_at: { [Op.gte]: last24Hours } }
    })
    const successRate = totalJobs > 0 ? completedJobs / totalJobs : 1
    const errorRate = totalJobs > 0 ? failedJobs / totalJobs : 0

    // Redis/Queue health
    const queueCounts = await conversionQueue.getJobCounts()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completedToday = await ConversionJob.count({
      where: { status: 'completed', created_at: { [Op.gte]: today } }
    })
    const failedToday = await ConversionJob.count({
      where: { status: 'failed', created_at: { [Op.gte]: today } }
    })

    // Database health
    const dbPool = (sequelize.connectionManager as any).pool
    const dbStats = {
      active: dbPool._inUseObjects?.length || 0,
      idle: dbPool._availableObjects?.length || 0,
      max: dbPool._config?.max || 100
    }

    // Storage health
    const storageDir = path.join(__dirname, '../../storage/uploads')
    let totalSize = 0
    let fileCount = 0

    try {
      const calculateSize = async (dir: string): Promise<void> => {
        const files = await readdir(dir)
        for (const file of files) {
          const filePath = path.join(dir, file)
          try {
            const stats = await stat(filePath)
            if (stats.isDirectory()) {
              await calculateSize(filePath)
            } else {
              totalSize += stats.size
              fileCount++
            }
          } catch (err) {
            // Skip files that can't be read
          }
        }
      }

      if (fs.existsSync(storageDir)) {
        await calculateSize(storageDir)
      }
    } catch (err) {
      console.error('Storage calculation error:', err)
    }

    // Determine overall status
    let overallStatus: HealthStatus = HealthStatus.HEALTHY
    let cloudconvertStatus: HealthStatus = HealthStatus.HEALTHY
    let redisStatus: HealthStatus = HealthStatus.HEALTHY
    let databaseStatus: HealthStatus = HealthStatus.HEALTHY
    let storageStatus: HealthStatus = HealthStatus.HEALTHY

    // CloudConvert status
    if (errorRate > 0.2) cloudconvertStatus = HealthStatus.CRITICAL
    else if (errorRate > 0.1) cloudconvertStatus = HealthStatus.WARNING

    // Redis status
    if (queueCounts.waiting > 100) redisStatus = HealthStatus.WARNING
    if (queueCounts.waiting > 500) redisStatus = HealthStatus.CRITICAL

    // Database status
    const dbUsagePercent = (dbStats.active / dbStats.max) * 100
    if (dbUsagePercent > 80) databaseStatus = HealthStatus.WARNING
    if (dbUsagePercent > 95) databaseStatus = HealthStatus.CRITICAL

    // Storage status (assuming 100GB capacity)
    const storageGB = totalSize / (1024 * 1024 * 1024)
    const capacityGB = 100
    const storagePercent = (storageGB / capacityGB) * 100
    if (storagePercent > 80) storageStatus = HealthStatus.WARNING
    if (storagePercent > 95) storageStatus = HealthStatus.CRITICAL

    // Overall status is worst component status
    const statuses = [cloudconvertStatus, redisStatus, databaseStatus, storageStatus]
    if (statuses.includes(HealthStatus.CRITICAL)) overallStatus = HealthStatus.CRITICAL
    else if (statuses.includes(HealthStatus.WARNING)) overallStatus = HealthStatus.WARNING

    const health = {
      overall_status: overallStatus,
      components: {
        cloudconvert: {
          status: cloudconvertStatus,
          success_rate: successRate.toFixed(3),
          error_rate: errorRate.toFixed(3),
          total_jobs_24h: totalJobs,
          completed_24h: completedJobs,
          failed_24h: failedJobs
        },
        redis: {
          status: redisStatus,
          waiting: queueCounts.waiting,
          active: queueCounts.active,
          completed: queueCounts.completed,
          failed: queueCounts.failed,
          completed_today: completedToday,
          failed_today: failedToday
        },
        database: {
          status: databaseStatus,
          connections: dbStats,
          usage_percent: dbUsagePercent.toFixed(1)
        },
        storage: {
          status: storageStatus,
          total_gb: storageGB.toFixed(2),
          capacity_gb: capacityGB,
          usage_percent: storagePercent.toFixed(1),
          file_count: fileCount
        }
      },
      last_updated: new Date().toISOString()
    }

    // Log health metrics
    await SystemHealthLog.create({
      metric_name: 'overall_system_health',
      metric_value: overallStatus === HealthStatus.HEALTHY ? 100 : overallStatus === HealthStatus.WARNING ? 50 : 0,
      status: overallStatus,
      details: health
    })

    res.json({
      success: true,
      health
    })
  } catch (error: any) {
    console.error('Get system health error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: error.message
    })
  }
}

/**
 * Get CloudConvert API health
 * GET /api/admin/system/cloudconvert
 */
export const getCloudConvertHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const _last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Get error logs for last 24 hours
    const recentErrors = await ConversionJob.findAll({
      where: {
        status: 'failed',
        created_at: { [Op.gte]: last24Hours }
      },
      order: [['created_at', 'DESC']],
      limit: 10,
      attributes: ['id', 'file_name', 'error_message', 'created_at']
    })

    // Get daily error trends for last 7 days
    const errorTrends = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const failed = await ConversionJob.count({
        where: {
          status: 'failed',
          created_at: { [Op.between]: [dayStart, dayEnd] }
        }
      })

      const total = await ConversionJob.count({
        where: {
          created_at: { [Op.between]: [dayStart, dayEnd] }
        }
      })

      errorTrends.push({
        date: dayStart.toISOString().split('T')[0],
        failed,
        total,
        error_rate: total > 0 ? (failed / total).toFixed(3) : '0'
      })
    }

    res.json({
      success: true,
      cloudconvert: {
        recent_errors: recentErrors,
        error_trends: errorTrends
      }
    })
  } catch (error: any) {
    console.error('Get CloudConvert health error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CloudConvert health',
      error: error.message
    })
  }
}

/**
 * Get storage usage details
 * GET /api/admin/system/storage
 */
export const getStorageHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get storage by user
    const userStorage = await sequelize.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        COUNT(cj.id) as job_count,
        SUM(cj.file_size) as total_size
      FROM users u
      INNER JOIN conversion_jobs cj ON u.id = cj.user_id
      GROUP BY u.id, u.email, u.name
      ORDER BY total_size DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT })

    res.json({
      success: true,
      storage: {
        top_users: userStorage
      }
    })
  } catch (error: any) {
    console.error('Get storage health error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch storage health',
      error: error.message
    })
  }
}

/**
 * Get recent error logs
 * GET /api/admin/system/errors
 */
export const getErrorLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '100' } = req.query
    const limitNum = parseInt(limit as string)

    const errors = await ConversionJob.findAll({
      where: {
        status: JobStatus.FAILED,
        error_message: { [Op.not]: null }
      } as any,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name']
      }]
    })

    // Group errors by type
    const errorTypes: { [key: string]: number } = {}
    errors.forEach(job => {
      const errorType = job.error_message?.split(':')[0] || 'Unknown'
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1
    })

    const topErrorTypes = Object.entries(errorTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    res.json({
      success: true,
      errors,
      error_summary: {
        total: errors.length,
        top_types: topErrorTypes
      }
    })
  } catch (error: any) {
    console.error('Get error logs error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error logs',
      error: error.message
    })
  }
}

/**
 * Test conversion operation
 * POST /api/admin/system/test-conversion
 */
export const testConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    // Create a test conversion job
    // Note: This is a placeholder - in production, you'd create an actual test job
    res.json({
      success: true,
      message: 'Test conversion feature not yet implemented. Create a real conversion via the UI to test.',
      note: 'This would create a test PDF→PPTX conversion job using a sample PDF file'
    })
  } catch (error: any) {
    console.error('Test conversion error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to run test conversion',
      error: error.message
    })
  }
}

/**
 * Clear Redis cache
 * POST /api/admin/system/clear-cache
 */
export const clearCache = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Clear all Redis keys (be careful with this in production!)
    await redisClient.flushDb()

    res.json({
      success: true,
      message: 'Redis cache cleared successfully'
    })
  } catch (error: any) {
    console.error('Clear cache error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    })
  }
}

/**
 * Trigger storage cleanup
 * POST /api/admin/system/cleanup-storage
 */
export const cleanupStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    // Delete expired jobs (>7 days old)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const expiredJobs = await ConversionJob.findAll({
      where: {
        status: { [Op.in]: ['completed', 'failed'] },
        created_at: { [Op.lt]: sevenDaysAgo }
      }
    })

    let deletedFiles = 0
    let freedSpace = 0

    for (const job of expiredJobs) {
      // Delete input file
      if (job.input_file) {
        try {
          const stats = await stat(job.input_file)
          await unlink(job.input_file)
          freedSpace += stats.size
          deletedFiles++
        } catch (err) {
          // File already deleted or doesn't exist
        }
      }

      // Delete output file
      if (job.output_file) {
        try {
          const stats = await stat(job.output_file)
          await unlink(job.output_file)
          freedSpace += stats.size
          deletedFiles++
        } catch (err) {
          // File already deleted or doesn't exist
        }
      }

      // Delete job record
      await job.destroy()
    }

    const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2)

    res.json({
      success: true,
      message: 'Storage cleanup completed',
      stats: {
        deleted_jobs: expiredJobs.length,
        deleted_files: deletedFiles,
        freed_space_mb: freedSpaceMB
      }
    })
  } catch (error: any) {
    console.error('Cleanup storage error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup storage',
      error: error.message
    })
  }
}
