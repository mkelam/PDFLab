import { createClient } from 'redis'
import Bull from 'bull'
import dotenv from 'dotenv'

dotenv.config()

// Redis client for caching and pub/sub
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  password: process.env.REDIS_PASSWORD || undefined
})

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  console.log('✓ Redis client connected')
})

// Initialize Redis connection
export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.connect()
    return true
  } catch (error) {
    console.error('✗ Failed to connect to Redis:', error)
    return false
  }
}

// Bull Queue Configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
}

// Conversion Queue - Main job processing
export const conversionQueue = new Bull('pdf-conversion', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000 // Start with 2 seconds, then 4s, then 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
    timeout: 300000 // 5 minutes max per job
  }
})

// Cleanup Queue - Scheduled file deletion
export const cleanupQueue = new Bull('file-cleanup', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: 100
  }
})

// Email Queue - Notifications (future)
export const emailQueue = new Bull('email-notifications', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 50,
    removeOnFail: 200
  }
})

// Queue event listeners
conversionQueue.on('error', (error) => {
  console.error('Conversion Queue Error:', error)
})

conversionQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`)
})

conversionQueue.on('active', (job) => {
  console.log(`Job ${job.id} started processing`)
})

conversionQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully:`, result)
})

conversionQueue.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message)
})

conversionQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`)
})

cleanupQueue.on('error', (error) => {
  console.error('Cleanup Queue Error:', error)
})

cleanupQueue.on('completed', (job) => {
  console.log(`Cleanup job ${job.id} completed`)
})

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  await conversionQueue.close()
  await cleanupQueue.close()
  await emailQueue.close()
  await redisClient.quit()
  console.log('✓ All queues and Redis connection closed')
}
