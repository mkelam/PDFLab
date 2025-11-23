import { createClient } from 'redis'
import Bull from 'bull'
import dotenv from 'dotenv'
import logger from './logger'

dotenv.config()

// Redis client for caching and pub/sub
export const redisClient = createClient({
  socket: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    connectTimeout: 15000, // Increased from 5000ms to 15000ms
    reconnectStrategy: (retries: number) => {
      // Max 10 retries
      if (retries > 10) {
        logger.error('Redis reconnection failed after maximum attempts', { retries })
        return new Error('Max Redis reconnection retries reached')
      }

      // Exponential backoff: 100ms, 200ms, 400ms... up to 3000ms
      const delay = Math.min(retries * 100, 3000)
      logger.warn('Redis reconnecting', { delay, retries, maxRetries: 10 })
      return delay
    }
  },
  password: process.env['REDIS_PASSWORD'] || undefined
})

// Connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected', {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: process.env['REDIS_PORT'] || '6379'
  })
})

redisClient.on('ready', () => {
  logger.info('Redis client ready')
})

redisClient.on('error', (err) => {
  logger.error('Redis client error', { error: err.message })
})

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting')
})

redisClient.on('end', () => {
  logger.warn('Redis client connection closed')
})

// Initialize Redis connection with timeout
export const connectRedis = async (): Promise<boolean> => {
  try {
    // Race between connection and timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ])
    return true
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error instanceof Error ? error.message : String(error),
      host: process.env['REDIS_HOST'],
      port: process.env['REDIS_PORT']
    })
    // Ensure client is fully disconnected to prevent background retries
    try {
      await redisClient.disconnect()
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    return false
  }
}

// Bull Queue Configuration
const redisConfig = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'] || undefined
}

// Lazy-loaded queues (only create when Redis is available)
let _conversionQueue: Bull.Queue | null = null
let _cleanupQueue: Bull.Queue | null = null
let _emailQueue: Bull.Queue | null = null

// Getters for queues (create on first access if Redis is connected)
export const getConversionQueue = (): Bull.Queue | null => {
  if (!_conversionQueue && redisClient.isOpen) {
    _conversionQueue = new Bull('pdf-conversion', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 500,
        timeout: 300000
      }
    })

    // Setup event listeners
    _conversionQueue.on('error', (error) => {
      logger.error('Conversion Queue Error', { error: error.message })
    })

    _conversionQueue.on('waiting', (jobId) => {
      logger.debug('Job waiting in queue', { jobId })
    })

    _conversionQueue.on('active', (job) => {
      logger.info('Job started processing', { jobId: job.id })
    })

    _conversionQueue.on('completed', (job, result) => {
      logger.info('Job completed successfully', { jobId: job.id, result })
    })

    _conversionQueue.on('failed', (job, error) => {
      logger.error('Job failed', { jobId: job?.id, error: error.message })
    })

    _conversionQueue.on('stalled', (job) => {
      logger.warn('Job stalled', { jobId: job.id })
    })
  }
  return _conversionQueue
}

export const getCleanupQueue = (): Bull.Queue | null => {
  if (!_cleanupQueue && redisClient.isOpen) {
    _cleanupQueue = new Bull('file-cleanup', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: 100
      }
    })

    _cleanupQueue.on('error', (error) => {
      logger.error('Cleanup Queue Error', { error: error.message })
    })

    _cleanupQueue.on('completed', (job) => {
      logger.info('Cleanup job completed', { jobId: job.id })
    })
  }
  return _cleanupQueue
}

export const getEmailQueue = (): Bull.Queue | null => {
  if (!_emailQueue && redisClient.isOpen) {
    _emailQueue = new Bull('email-notifications', {
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
  }
  return _emailQueue
}

// Legacy exports for backwards compatibility
export const conversionQueue = new Proxy({} as Bull.Queue, {
  get(_target, prop) {
    const queue = getConversionQueue()
    if (!queue) {
      throw new Error('Redis not connected - conversion queue unavailable')
    }
    return (queue as any)[prop]
  }
})

export const cleanupQueue = new Proxy({} as Bull.Queue, {
  get(_target, prop) {
    const queue = getCleanupQueue()
    if (!queue) {
      throw new Error('Redis not connected - cleanup queue unavailable')
    }
    return (queue as any)[prop]
  }
})

export const emailQueue = new Proxy({} as Bull.Queue, {
  get(_target, prop) {
    const queue = getEmailQueue()
    if (!queue) {
      throw new Error('Redis not connected - email queue unavailable')
    }
    return (queue as any)[prop]
  }
})

// Force initialize all queues (call after Redis connects)
export const initializeQueues = (): void => {
  logger.info('Initializing Bull queues')

  if (!_conversionQueue) {
    logger.debug('Creating conversion queue')
    _conversionQueue = new Bull('pdf-conversion', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 500,
        timeout: 300000
      }
    })

    _conversionQueue.on('error', (error) => {
      logger.error('Conversion Queue Error', { error: error.message })
    })
    logger.info('Conversion queue created')
  } else {
    logger.debug('Conversion queue already exists')
  }

  if (!_cleanupQueue) {
    logger.debug('Creating cleanup queue')
    _cleanupQueue = new Bull('file-cleanup', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: 100
      }
    })

    _cleanupQueue.on('error', (error) => {
      logger.error('Cleanup Queue Error', { error: error.message })
    })
    logger.info('Cleanup queue created')
  } else {
    logger.debug('Cleanup queue already exists')
  }

  logger.info('Bull queues initialized')
}

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  if (_conversionQueue) await _conversionQueue.close()
  if (_cleanupQueue) await _cleanupQueue.close()
  if (_emailQueue) await _emailQueue.close()

  if (redisClient.isOpen) {
    await redisClient.quit()
  }
  logger.info('All queues and Redis connection closed')
}
