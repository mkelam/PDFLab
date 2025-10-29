import { Job } from 'bull'
import path from 'path'
import fs from 'fs/promises'
import { cleanupQueue } from '../config/redis'
import { ConversionJob } from '../models'

interface CleanupJobData {
  job_id: string
  user_id: string
}

/**
 * Process file cleanup jobs
 * Deletes uploaded and converted files after expiration (1 hour)
 */
cleanupQueue.process(async (job: Job<CleanupJobData>) => {
  const { job_id, user_id } = job.data

  console.log(`[Cleanup Worker] Processing cleanup for job ${job_id}`)

  try {
    // 1. Get conversion job details
    const conversionJob = await ConversionJob.findByPk(job_id)

    if (!conversionJob) {
      console.log(`[Cleanup Worker] Job ${job_id} not found in database, skipping`)
      return { deleted: false, reason: 'Job not found' }
    }

    // 2. Define paths to delete
    const userUploadDir = path.join(
      process.env.STORAGE_PATH || './storage',
      'uploads',
      user_id,
      job_id
    )

    const userOutputDir = path.join(
      process.env.STORAGE_PATH || './storage',
      'outputs',
      user_id,
      job_id
    )

    let deletedFiles = 0

    // 3. Delete upload directory
    try {
      await fs.rm(userUploadDir, { recursive: true, force: true })
      deletedFiles++
      console.log(`[Cleanup Worker] Deleted upload directory: ${userUploadDir}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[Cleanup Worker] Error deleting upload directory:`, error)
      }
    }

    // 4. Delete output directory
    try {
      await fs.rm(userOutputDir, { recursive: true, force: true })
      deletedFiles++
      console.log(`[Cleanup Worker] Deleted output directory: ${userOutputDir}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[Cleanup Worker] Error deleting output directory:`, error)
      }
    }

    // 5. Update database - clear file paths
    await ConversionJob.update(
      {
        input_file: null,
        output_file: null
      },
      { where: { id: job_id } }
    )

    console.log(`[Cleanup Worker] Cleanup completed for job ${job_id}, deleted ${deletedFiles} directories`)

    return {
      deleted: true,
      files_deleted: deletedFiles,
      job_id
    }
  } catch (error) {
    console.error(`[Cleanup Worker] Cleanup failed for job ${job_id}:`, error)
    throw error // Will trigger Bull retry
  }
})

// Event listeners
cleanupQueue.on('completed', (job, result) => {
  console.log(`✓ Cleanup job ${job.id} completed:`, result)
})

cleanupQueue.on('failed', (job, error) => {
  console.error(`✗ Cleanup job ${job?.id} failed:`, error.message)
})

export default cleanupQueue
