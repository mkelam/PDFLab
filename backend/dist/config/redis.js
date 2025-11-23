"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueues = exports.initializeQueues = exports.emailQueue = exports.cleanupQueue = exports.conversionQueue = exports.getEmailQueue = exports.getCleanupQueue = exports.getConversionQueue = exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const bull_1 = __importDefault(require("bull"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
dotenv_1.default.config();
// Redis client for caching and pub/sub
exports.redisClient = (0, redis_1.createClient)({
    socket: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
        connectTimeout: 15000, // Increased from 5000ms to 15000ms
        reconnectStrategy: (retries) => {
            // Max 10 retries
            if (retries > 10) {
                logger_1.default.error('Redis reconnection failed after maximum attempts', { retries });
                return new Error('Max Redis reconnection retries reached');
            }
            // Exponential backoff: 100ms, 200ms, 400ms... up to 3000ms
            const delay = Math.min(retries * 100, 3000);
            logger_1.default.warn('Redis reconnecting', { delay, retries, maxRetries: 10 });
            return delay;
        }
    },
    password: process.env['REDIS_PASSWORD'] || undefined
});
// Connection event handlers
exports.redisClient.on('connect', () => {
    logger_1.default.info('Redis client connected', {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: process.env['REDIS_PORT'] || '6379'
    });
});
exports.redisClient.on('ready', () => {
    logger_1.default.info('Redis client ready');
});
exports.redisClient.on('error', (err) => {
    logger_1.default.error('Redis client error', { error: err.message });
});
exports.redisClient.on('reconnecting', () => {
    logger_1.default.warn('Redis client reconnecting');
});
exports.redisClient.on('end', () => {
    logger_1.default.warn('Redis client connection closed');
});
// Initialize Redis connection with timeout
const connectRedis = async () => {
    try {
        // Race between connection and timeout
        await Promise.race([
            exports.redisClient.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000))
        ]);
        return true;
    }
    catch (error) {
        logger_1.default.error('Failed to connect to Redis', {
            error: error instanceof Error ? error.message : String(error),
            host: process.env['REDIS_HOST'],
            port: process.env['REDIS_PORT']
        });
        // Ensure client is fully disconnected to prevent background retries
        try {
            await exports.redisClient.disconnect();
        }
        catch (disconnectError) {
            // Ignore disconnect errors
        }
        return false;
    }
};
exports.connectRedis = connectRedis;
// Bull Queue Configuration
const redisConfig = {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'] || undefined
};
// Lazy-loaded queues (only create when Redis is available)
let _conversionQueue = null;
let _cleanupQueue = null;
let _emailQueue = null;
// Getters for queues (create on first access if Redis is connected)
const getConversionQueue = () => {
    if (!_conversionQueue && exports.redisClient.isOpen) {
        _conversionQueue = new bull_1.default('pdf-conversion', {
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
        });
        // Setup event listeners
        _conversionQueue.on('error', (error) => {
            logger_1.default.error('Conversion Queue Error', { error: error.message });
        });
        _conversionQueue.on('waiting', (jobId) => {
            logger_1.default.debug('Job waiting in queue', { jobId });
        });
        _conversionQueue.on('active', (job) => {
            logger_1.default.info('Job started processing', { jobId: job.id });
        });
        _conversionQueue.on('completed', (job, result) => {
            logger_1.default.info('Job completed successfully', { jobId: job.id, result });
        });
        _conversionQueue.on('failed', (job, error) => {
            logger_1.default.error('Job failed', { jobId: job?.id, error: error.message });
        });
        _conversionQueue.on('stalled', (job) => {
            logger_1.default.warn('Job stalled', { jobId: job.id });
        });
    }
    return _conversionQueue;
};
exports.getConversionQueue = getConversionQueue;
const getCleanupQueue = () => {
    if (!_cleanupQueue && exports.redisClient.isOpen) {
        _cleanupQueue = new bull_1.default('file-cleanup', {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: 100
            }
        });
        _cleanupQueue.on('error', (error) => {
            logger_1.default.error('Cleanup Queue Error', { error: error.message });
        });
        _cleanupQueue.on('completed', (job) => {
            logger_1.default.info('Cleanup job completed', { jobId: job.id });
        });
    }
    return _cleanupQueue;
};
exports.getCleanupQueue = getCleanupQueue;
const getEmailQueue = () => {
    if (!_emailQueue && exports.redisClient.isOpen) {
        _emailQueue = new bull_1.default('email-notifications', {
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
        });
    }
    return _emailQueue;
};
exports.getEmailQueue = getEmailQueue;
// Legacy exports for backwards compatibility
exports.conversionQueue = new Proxy({}, {
    get(_target, prop) {
        const queue = (0, exports.getConversionQueue)();
        if (!queue) {
            throw new Error('Redis not connected - conversion queue unavailable');
        }
        return queue[prop];
    }
});
exports.cleanupQueue = new Proxy({}, {
    get(_target, prop) {
        const queue = (0, exports.getCleanupQueue)();
        if (!queue) {
            throw new Error('Redis not connected - cleanup queue unavailable');
        }
        return queue[prop];
    }
});
exports.emailQueue = new Proxy({}, {
    get(_target, prop) {
        const queue = (0, exports.getEmailQueue)();
        if (!queue) {
            throw new Error('Redis not connected - email queue unavailable');
        }
        return queue[prop];
    }
});
// Force initialize all queues (call after Redis connects)
const initializeQueues = () => {
    logger_1.default.info('Initializing Bull queues');
    if (!_conversionQueue) {
        logger_1.default.debug('Creating conversion queue');
        _conversionQueue = new bull_1.default('pdf-conversion', {
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
        });
        _conversionQueue.on('error', (error) => {
            logger_1.default.error('Conversion Queue Error', { error: error.message });
        });
        logger_1.default.info('Conversion queue created');
    }
    else {
        logger_1.default.debug('Conversion queue already exists');
    }
    if (!_cleanupQueue) {
        logger_1.default.debug('Creating cleanup queue');
        _cleanupQueue = new bull_1.default('file-cleanup', {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: 100
            }
        });
        _cleanupQueue.on('error', (error) => {
            logger_1.default.error('Cleanup Queue Error', { error: error.message });
        });
        logger_1.default.info('Cleanup queue created');
    }
    else {
        logger_1.default.debug('Cleanup queue already exists');
    }
    logger_1.default.info('Bull queues initialized');
};
exports.initializeQueues = initializeQueues;
// Graceful shutdown
const closeQueues = async () => {
    if (_conversionQueue)
        await _conversionQueue.close();
    if (_cleanupQueue)
        await _cleanupQueue.close();
    if (_emailQueue)
        await _emailQueue.close();
    if (exports.redisClient.isOpen) {
        await exports.redisClient.quit();
    }
    logger_1.default.info('All queues and Redis connection closed');
};
exports.closeQueues = closeQueues;
//# sourceMappingURL=redis.js.map