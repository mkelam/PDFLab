"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueues = exports.initializeQueues = exports.emailQueue = exports.cleanupQueue = exports.conversionQueue = exports.getEmailQueue = exports.getCleanupQueue = exports.getConversionQueue = exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const bull_1 = __importDefault(require("bull"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Redis client for caching and pub/sub
exports.redisClient = (0, redis_1.createClient)({
    socket: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: false // Disable automatic reconnection
    },
    password: process.env['REDIS_PASSWORD'] || undefined
});
exports.redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});
exports.redisClient.on('connect', () => {
    console.log('✓ Redis client connected');
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
        console.error('✗ Failed to connect to Redis:', error instanceof Error ? error.message : error);
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
            console.error('Conversion Queue Error:', error);
        });
        _conversionQueue.on('waiting', (jobId) => {
            console.log(`Job ${jobId} is waiting`);
        });
        _conversionQueue.on('active', (job) => {
            console.log(`Job ${job.id} started processing`);
        });
        _conversionQueue.on('completed', (job, result) => {
            console.log(`Job ${job.id} completed successfully:`, result);
        });
        _conversionQueue.on('failed', (job, error) => {
            console.error(`Job ${job?.id} failed:`, error.message);
        });
        _conversionQueue.on('stalled', (job) => {
            console.warn(`Job ${job.id} stalled`);
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
            console.error('Cleanup Queue Error:', error);
        });
        _cleanupQueue.on('completed', (job) => {
            console.log(`Cleanup job ${job.id} completed`);
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
    console.log('🔧 Initializing Bull queues...');
    if (!_conversionQueue) {
        console.log('  Creating conversion queue...');
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
            console.error('Conversion Queue Error:', error);
        });
        console.log('  ✓ Conversion queue created');
    }
    else {
        console.log('  ℹ Conversion queue already exists');
    }
    if (!_cleanupQueue) {
        console.log('  Creating cleanup queue...');
        _cleanupQueue = new bull_1.default('file-cleanup', {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: 100
            }
        });
        _cleanupQueue.on('error', (error) => {
            console.error('Cleanup Queue Error:', error);
        });
        console.log('  ✓ Cleanup queue created');
    }
    else {
        console.log('  ℹ Cleanup queue already exists');
    }
    console.log('✓ Bull queues initialized');
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
    console.log('✓ All queues and Redis connection closed');
};
exports.closeQueues = closeQueues;
//# sourceMappingURL=redis.js.map