"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeCleanupWorker = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const redis_1 = require("../config/redis");
const models_1 = require("../models");
const logger_1 = __importDefault(require("../config/logger"));
// Helper function to get absolute storage path
const getStoragePath = () => {
    const storagePath = process.env['STORAGE_PATH'] || './storage';
    return path_1.default.resolve(storagePath);
};
/**
 * Initialize cleanup job worker
 */
const initializeCleanupWorker = () => {
    const cleanupQueue = (0, redis_1.getCleanupQueue)();
    if (!cleanupQueue) {
        logger_1.default.warn('⚠ Cannot initialize cleanup worker - Redis not available');
        return;
    }
    logger_1.default.info('✓ Initializing cleanup worker...');
    /**
     * Process file cleanup jobs
     * Deletes uploaded and converted files after expiration (1 hour)
     */
    cleanupQueue.process(async (job) => {
        const { job_id, user_id } = job.data;
        logger_1.default.info(`[Cleanup Worker] Processing cleanup for job ${job_id}`);
        try {
            // 1. Get conversion job details
            const conversionJob = await models_1.ConversionJob.findByPk(job_id);
            if (!conversionJob) {
                logger_1.default.info(`[Cleanup Worker] Job ${job_id} not found in database, { skipping`);
            }
        }
        finally { }
    });
    return { deleted: false, reason: 'Job not found' };
};
exports.initializeCleanupWorker = initializeCleanupWorker;
// 2. Define paths to delete
// For guest conversions (user_id is null), use 'guest' as directory name
const userFolder = user_id || 'guest';
const userUploadDir = path_1.default.join(getStoragePath(), 'uploads', userFolder, job_id);
const userOutputDir = path_1.default.join(getStoragePath(), 'outputs', userFolder, job_id);
let deletedFiles = 0;
// 3. Delete upload directory
try {
    await promises_1.default.rm(userUploadDir, { recursive: true, force: true });
    deletedFiles++;
    logger_1.default.info(`[Cleanup Worker] Deleted upload directory: ${userUploadDir}`);
}
catch (error) {
    if (error.code !== 'ENOENT') {
        logger_1.default.error(`[Cleanup Worker] Error deleting upload directory:`, { error: error instanceof Error ? error.message : String(error) });
    }
}
// 4. Delete output directory
try {
    await promises_1.default.rm(userOutputDir, { recursive: true, force: true });
    deletedFiles++;
    logger_1.default.info(`[Cleanup Worker] Deleted output directory: ${userOutputDir}`);
}
catch (error) {
    if (error.code !== 'ENOENT') {
        logger_1.default.error(`[Cleanup Worker] Error deleting output directory:`, { error: error instanceof Error ? error.message : String(error) });
    }
}
// 5. Update database - clear file paths
await models_1.ConversionJob.update({
    input_file: undefined,
    output_file: undefined
}, { where: { id: job_id } });
logger_1.default.info(`[Cleanup Worker] Cleanup completed for job ${job_id}, { deleted ${deletedFiles} directories`);
return {
    deleted: true,
    files_deleted: deletedFiles,
    job_id
};
try { }
catch (error) {
    logger_1.default.error(`[Cleanup Worker] Cleanup failed for job ${job_id}:`, { error: error instanceof Error ? error.message : String(error) });
    throw error; // Will trigger Bull retry
}
// Event listeners
cleanupQueue.on('completed', (job, result) => {
    logger_1.default.info(`✓ Cleanup job ${job.id} completed:`, { result });
});
cleanupQueue.on('failed', (job, error) => {
    logger_1.default.error(`✗ Cleanup job ${job?.id} failed:`, { error: error.message instanceof Error ? error.message.message : String(error.message) });
});
// DO NOT initialize on module load - let server.ts call this after Redis connects
// initializeCleanupWorker()
//# sourceMappingURL=cleanup.job.js.map