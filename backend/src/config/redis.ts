import { createClient } from 'redis'
import Bull from 'bull'
import dotenv from 'dotenv'

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
        console.error('Redis reconnection failed after 10 attempts')
        return new Error('Max Redis reconnection retries reached')
      }

      // Exponential backoff: 100ms, 200ms, 400ms... up to 3000ms
      const delay = Math.min(retries * 100, 3000)
      console.warn(`Redis reconnecting in ${delay}ms (attempt ${retries}/10)`)
      return delay
    }
  },
  password: process.env['REDIS_PASSWORD'] || undefined
})

// Connection event handlers
redisClient.on('connect', () => {
  console.log('✓ Redis client connected')
})

redisClient.on('ready', () => {
  console.log('✓ Redis client ready')
})

redisClient.on('error', (err) => {
  console.error('Redis client error:', err.message)
})

redisClient.on('reconnecting', () => {
  console.warn('Redis client reconnecting...')
})

redisClient.on('end', () => {
  console.warn('Redis client connection closed')
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
    console.error('✗ Failed to connect to Redis:', error instanceof Error ? error.message : error)
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
      console.error('Conversion Queue Error:', error)
    })

    _conversionQueue.on('waiting', (jobId) => {
      console.log(`Job ${jobId} is waiting`)
    })

    _conversionQueue.on('active', (job) => {
      console.log(`Job ${job.id} started processing`)
    })

    _conversionQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed successfully:`, result)
    })

    _conversionQueue.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error.message)
    })

    _conversionQueue.on('stalled', (job) => {
      console.warn(`Job ${job.id} stalled`)
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
      console.error('Cleanup Queue Error:', error)
    })

    _cleanupQueue.on('completed', (job) => {
      console.log(`Cleanup job ${job.id} completed`)
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
  console.log('🔧 Initializing Bull queues...')

  if (!_conversionQueue) {
    console.log('  Creating conversion queue...')
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
      console.error('Conversion Queue Error:', error)
    })
    console.log('  ✓ Conversion queue created')
  } else {
    console.log('  ℹ Conversion queue already exists')
  }

  if (!_cleanupQueue) {
    console.log('  Creating cleanup queue...')
    _cleanupQueue = new Bull('file-cleanup', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: 100
      }
    })

    _cleanupQueue.on('error', (error) => {
      console.error('Cleanup Queue Error:', error)
    })
    console.log('  ✓ Cleanup queue created')
  } else {
    console.log('  ℹ Cleanup queue already exists')
  }

  console.log('✓ Bull queues initialized')
}

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  if (_conversionQueue) await _conversionQueue.close()
  if (_cleanupQueue) await _cleanupQueue.close()
  if (_emailQueue) await _emailQueue.close()

  if (redisClient.isOpen) {
    await redisClient.quit()
  }
  console.log('✓ All queues and Redis connection closed')
}
