import { Job } from 'bull'
import path from 'path'
import fs from 'fs/promises'
import { getCleanupQueue } from '../config/redis'
import { ConversionJob } from '../models'
import logger from '../config/logger'

// Helper function to get absolute storage path
const getStoragePath = (): string => {
  const storagePath = process.env['STORAGE_PATH'] || './storage'
  return path.resolve(storagePath)
}

interface CleanupJobData {
  job_id: string
  user_id: string | null // Null for guest conversions
}

/**
 * Initialize cleanup job worker
 */
export const initializeCleanupWorker = () => {
  const cleanupQueue = getCleanupQueue()

  if (!cleanupQueue) {
    logger.warn('⚠ Cannot initialize cleanup worker - Redis not available')
    return
  }

  logger.info('✓ Initializing cleanup worker...')

  /**
   * Process file cleanup jobs
   * Deletes uploaded and converted files after expiration (1 hour)
   */
  cleanupQueue.process(async (job: Job<CleanupJobData>) => {
  const { job_id, user_id } = job.data

  logger.info(`[Cleanup Worker] Processing cleanup for job ${job_id}`)

  try {
    // 1. Get conversion job details
    const conversionJob = await ConversionJob.findByPk(job_id)

    if (!conversionJob) {
      logger.info(`[Cleanup Worker] Job ${job_id} not found in database, skipping`)
      return { deleted: false, reason: 'Job not found' }
    }

    // 2. Define paths to delete
    // For guest conversions (user_id is null), use 'guest' as directory name
    const userFolder = user_id || 'guest'

    const userUploadDir = path.join(
      getStoragePath(),
      'uploads',
      userFolder,
      job_id
    )

    const userOutputDir = path.join(
      getStoragePath(),
      'outputs',
      userFolder,
      job_id
    )

    let deletedFiles = 0

    // 3. Delete upload directory
    try {
      await fs.rm(userUploadDir, { recursive: true, force: true })
      deletedFiles++
      logger.info(`[Cleanup Worker] Deleted upload directory: ${userUploadDir}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error(`[Cleanup Worker] Error deleting upload directory:`, { error: error instanceof Error ? error.message : String(error) })
      }
    }

    // 4. Delete output directory
    try {
      await fs.rm(userOutputDir, { recursive: true, force: true })
      deletedFiles++
      logger.info(`[Cleanup Worker] Deleted output directory: ${userOutputDir}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error(`[Cleanup Worker] Error deleting output directory:`, { error: error instanceof Error ? error.message : String(error) })
      }
    }

    // 5. Update database - clear file paths
    await ConversionJob.update(
      {
        input_file: undefined,
        output_file: undefined
      },
      { where: { id: job_id } }
    )

    logger.info(`[Cleanup Worker] Cleanup completed for job ${job_id}, deleted ${deletedFiles} directories`)

    return {
      deleted: true,
      files_deleted: deletedFiles,
      job_id
    }
  } catch (error) {
    logger.error(`[Cleanup Worker] Cleanup failed for job ${job_id}:`, { error: error instanceof Error ? error.message : String(error) })
    throw error // Will trigger Bull retry
  }
})

  // Event listeners
  cleanupQueue.on('completed', (job, result) => {
    logger.info(`✓ Cleanup job ${job.id} completed:`, { result })
  })

  cleanupQueue.on('failed', (job, error) => {
    logger.error(`✗ Cleanup job ${job?.id} failed:`, { error: error.message instanceof Error ? error.message.message : String(error.message) })
  })
}

// DO NOT initialize on module load - let server.ts call this after Redis connects
// initializeCleanupWorker()
