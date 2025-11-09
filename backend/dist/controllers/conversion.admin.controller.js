"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueStatus = exports.bulkRetryJobs = exports.deleteConversionJob = exports.cancelConversionJob = exports.retryConversionJob = exports.getConversionJobById = exports.getAllConversionJobs = void 0;
const ConversionJob_1 = require("../models/ConversionJob");
const User_1 = require("../models/User");
const sequelize_1 = require("sequelize");
const conversion_job_1 = require("../jobs/conversion.job");
/**
 * GET /api/admin/conversions
 * List all conversion jobs with filtering and pagination
 */
const getAllConversionJobs = async (req, res) => {
    try {
        const { search = '', status, type, userId, page = '1', limit = '25', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const where = {};
        if (search) {
            where[sequelize_1.Op.or] = [
                { id: { [sequelize_1.Op.like]: `%${search}%` } },
                { file_name: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (type && type !== 'all') {
            where.type = type;
        }
        if (userId) {
            where.user_id = userId;
        }
        // Get jobs with user info
        const { count, rows: jobs } = await ConversionJob_1.ConversionJob.findAndCountAll({
            where,
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name']
                }],
            order: [[sortBy, sortOrder]],
            limit: limitNum,
            offset
        });
        const totalPages = Math.ceil(count / limitNum);
        // Calculate today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'completed',
                created_at: { [sequelize_1.Op.gte]: today }
            }
        });
        const failedToday = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'failed',
                created_at: { [sequelize_1.Op.gte]: today }
            }
        });
        const pending = await ConversionJob_1.ConversionJob.count({ where: { status: 'pending' } });
        const processing = await ConversionJob_1.ConversionJob.count({ where: { status: 'processing' } });
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
        });
    }
    catch (error) {
        console.error('Get all conversion jobs error:', error);
        res.status(500).json({
            error: 'Failed to fetch conversion jobs',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllConversionJobs = getAllConversionJobs;
/**
 * GET /api/admin/conversions/:id
 * Get detailed job information
 */
const getConversionJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await ConversionJob_1.ConversionJob.findByPk(id, {
            include: [{
                    model: User_1.User,
                    as: 'user',
                    attributes: ['id', 'email', 'name', 'plan']
                }]
        });
        if (!job) {
            res.status(404).json({
                error: 'Job not found'
            });
            return;
        }
        res.json({
            success: true,
            job
        });
    }
    catch (error) {
        console.error('Get conversion job error:', error);
        res.status(500).json({
            error: 'Failed to fetch job',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getConversionJobById = getConversionJobById;
/**
 * POST /api/admin/conversions/:id/retry
 * Retry a failed conversion job
 */
const retryConversionJob = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await ConversionJob_1.ConversionJob.findByPk(id);
        if (!job) {
            res.status(404).json({
                error: 'Job not found'
            });
            return;
        }
        if (job.status !== 'failed') {
            res.status(400).json({
                error: 'Can only retry failed jobs',
                message: `Job status is currently: ${job.status}`
            });
            return;
        }
        // Reset job status and re-queue
        await job.update({
            status: ConversionJob_1.JobStatus.PENDING,
            progress: 0,
            error_message: undefined,
            cloudconvert_job_id: undefined
        });
        // Re-add to Bull queue
        if (!conversion_job_1.conversionQueue) {
            throw new Error('Conversion queue not available');
        }
        await conversion_job_1.conversionQueue.add('convert', { jobId: job.id }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        });
        res.json({
            success: true,
            message: 'Job queued for retry',
            job
        });
    }
    catch (error) {
        console.error('Retry job error:', error);
        res.status(500).json({
            error: 'Failed to retry job',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.retryConversionJob = retryConversionJob;
/**
 * POST /api/admin/conversions/:id/cancel
 * Cancel a pending/processing job
 */
const cancelConversionJob = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await ConversionJob_1.ConversionJob.findByPk(id);
        if (!job) {
            res.status(404).json({
                error: 'Job not found'
            });
            return;
        }
        if (job.status !== 'pending' && job.status !== 'processing') {
            res.status(400).json({
                error: 'Can only cancel pending or processing jobs',
                message: `Job status is currently: ${job.status}`
            });
            return;
        }
        // TODO: Cancel CloudConvert job if it exists
        // This requires CloudConvert SDK implementation
        await job.update({
            status: ConversionJob_1.JobStatus.FAILED,
            error_message: 'Cancelled by administrator'
        });
        res.json({
            success: true,
            message: 'Job cancelled successfully',
            job
        });
    }
    catch (error) {
        console.error('Cancel job error:', error);
        res.status(500).json({
            error: 'Failed to cancel job',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.cancelConversionJob = cancelConversionJob;
/**
 * DELETE /api/admin/conversions/:id
 * Delete a conversion job
 */
const deleteConversionJob = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await ConversionJob_1.ConversionJob.findByPk(id);
        if (!job) {
            res.status(404).json({
                error: 'Job not found'
            });
            return;
        }
        // Delete files from storage
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        if (job.input_file) {
            try {
                const inputPath = path.join(process.cwd(), job.input_file);
                await fs.unlink(inputPath);
            }
            catch (err) {
                console.log('Input file already deleted or not found');
            }
        }
        if (job.output_file) {
            try {
                const outputPath = path.join(process.cwd(), job.output_file);
                await fs.unlink(outputPath);
            }
            catch (err) {
                console.log('Output file already deleted or not found');
            }
        }
        await job.destroy();
        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({
            error: 'Failed to delete job',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteConversionJob = deleteConversionJob;
/**
 * POST /api/admin/conversions/bulk-retry
 * Retry multiple failed jobs
 */
const bulkRetryJobs = async (req, res) => {
    try {
        const { jobIds } = req.body;
        if (!Array.isArray(jobIds) || jobIds.length === 0) {
            res.status(400).json({
                error: 'Invalid request',
                message: 'jobIds must be a non-empty array'
            });
            return;
        }
        const jobs = await ConversionJob_1.ConversionJob.findAll({
            where: {
                id: jobIds,
                status: 'failed'
            }
        });
        if (jobs.length === 0) {
            res.status(400).json({
                error: 'No failed jobs found with provided IDs'
            });
            return;
        }
        // Reset jobs and re-queue
        if (!conversion_job_1.conversionQueue) {
            throw new Error('Conversion queue not available');
        }
        for (const job of jobs) {
            await job.update({
                status: ConversionJob_1.JobStatus.PENDING,
                progress: 0,
                error_message: undefined,
                cloudconvert_job_id: undefined
            });
            await conversion_job_1.conversionQueue.add('convert', { jobId: job.id }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });
        }
        res.json({
            success: true,
            message: `${jobs.length} jobs queued for retry`,
            count: jobs.length
        });
    }
    catch (error) {
        console.error('Bulk retry error:', error);
        res.status(500).json({
            error: 'Failed to retry jobs',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.bulkRetryJobs = bulkRetryJobs;
/**
 * GET /api/admin/queue/status
 * Get Bull queue health metrics
 */
const getQueueStatus = async (_req, res) => {
    try {
        if (!conversion_job_1.conversionQueue) {
            throw new Error('Conversion queue not available');
        }
        const waiting = await conversion_job_1.conversionQueue.getWaitingCount();
        const active = await conversion_job_1.conversionQueue.getActiveCount();
        const completed = await conversion_job_1.conversionQueue.getCompletedCount();
        const failed = await conversion_job_1.conversionQueue.getFailedCount();
        const delayed = await conversion_job_1.conversionQueue.getDelayedCount();
        // Get jobs processed in last hour for rate calculation
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentCompleted = await ConversionJob_1.ConversionJob.count({
            where: {
                status: 'completed',
                updated_at: { [sequelize_1.Op.gte]: new Date(oneHourAgo) }
            }
        });
        const processingRate = recentCompleted / 60; // per minute
        res.json({
            success: true,
            queue: {
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused: await conversion_job_1.conversionQueue.isPaused(),
                processing_rate: processingRate,
                health_status: active > 0 ? 'healthy' : waiting > 100 ? 'warning' : 'healthy'
            }
        });
    }
    catch (error) {
        console.error('Get queue status error:', error);
        res.status(500).json({
            error: 'Failed to fetch queue status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getQueueStatus = getQueueStatus;
//# sourceMappingURL=conversion.admin.controller.js.map