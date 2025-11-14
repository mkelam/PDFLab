"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBatch = exports.getBatchHistory = exports.downloadBatchZip = exports.getBatchStatus = exports.uploadBatchFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const archiver_1 = __importDefault(require("archiver"));
const models_1 = require("../models");
const redis_1 = require("../config/redis");
const quota_utils_1 = require("../utils/quota.utils");
// Helper function to get storage path
const getStoragePath = () => {
    const storagePath = process.env['STORAGE_PATH'] || './storage';
    return path_1.default.resolve(storagePath);
};
// Helper to estimate processing time
const estimateProcessingTime = (type, fileSize) => {
    const baseTime = 5000; // 5 seconds base
    const sizeMultiplier = Math.ceil(fileSize / (1024 * 1024)); // Per MB
    return baseTime + sizeMultiplier * 2000;
};
/**
 * Upload multiple files for batch processing
 * POST /api/batch/upload
 */
const uploadBatchFiles = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check if files were uploaded
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({
                error: 'No files uploaded',
                message: 'Please provide at least one file for batch processing'
            });
            return;
        }
        // Get operation type and options from request
        const operation_type = req.body.operation_type;
        const batch_name = req.body.batch_name || `Batch ${new Date().toLocaleString()}`;
        const output_format = req.body.output_format;
        const compression_level = req.body.compression_level;
        // Validate operation type
        if (!Object.values(models_1.BatchOperationType).includes(operation_type)) {
            // Cleanup uploaded files
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(400).json({
                error: 'Invalid operation type',
                message: 'Operation type must be one of: convert, compress, merge'
            });
            return;
        }
        // Validate file count based on plan
        const maxBatchSize = quota_utils_1.PLAN_QUOTAS[user.plan].batch_size;
        if (files.length > maxBatchSize) {
            // Cleanup uploaded files
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(400).json({
                error: 'Too many files',
                message: `Your ${user.plan} plan supports up to ${maxBatchSize} files per batch`,
                uploaded_files: files.length,
                max_batch_size: maxBatchSize,
                upgrade_required: true
            });
            return;
        }
        // Calculate total size and validate
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const maxFileSize = user.getMaxFileSize();
        // Check if any individual file exceeds limit
        const oversizedFile = files.find(file => file.size > maxFileSize);
        if (oversizedFile) {
            // Cleanup uploaded files
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(413).json({
                error: 'File too large',
                message: `File "${oversizedFile.originalname}" exceeds your ${user.plan} plan limit of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
                file_name: oversizedFile.originalname,
                file_size: oversizedFile.size,
                max_file_size: maxFileSize,
                upgrade_required: true
            });
            return;
        }
        // Create batch job
        const batchId = (0, uuid_1.v4)();
        const batchJob = await models_1.BatchJob.create({
            id: batchId,
            user_id: user.id,
            batch_name,
            operation_type,
            total_files: files.length,
            completed_files: 0,
            failed_files: 0,
            status: models_1.BatchStatus.PENDING,
            progress: 0,
            conversion_job_ids: [],
            total_size: totalSize,
            options: {
                output_format,
                compression_level
            },
            created_at: new Date(),
            updated_at: new Date(),
            expires_at: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
        });
        // Create individual conversion jobs for each file
        const conversionJobIds = [];
        for (const file of files) {
            const jobId = (0, uuid_1.v4)();
            // Determine conversion type based on operation
            let conversionType;
            switch (operation_type) {
                case models_1.BatchOperationType.CONVERT:
                    if (output_format === 'pptx')
                        conversionType = models_1.ConversionType.PDF_TO_PPTX;
                    else if (output_format === 'docx')
                        conversionType = models_1.ConversionType.PDF_TO_DOCX;
                    else if (output_format === 'xlsx')
                        conversionType = models_1.ConversionType.PDF_TO_XLSX;
                    else
                        conversionType = models_1.ConversionType.PDF_TO_IMAGES;
                    break;
                case models_1.BatchOperationType.COMPRESS:
                    conversionType = models_1.ConversionType.PDF_COMPRESS;
                    break;
                case models_1.BatchOperationType.MERGE:
                    conversionType = models_1.ConversionType.PDF_MERGE;
                    break;
                default:
                    conversionType = models_1.ConversionType.PDF_TO_DOCX;
            }
            // Create conversion job
            const conversionJob = await models_1.ConversionJob.create({
                id: jobId,
                user_id: user.id,
                type: conversionType,
                status: models_1.JobStatus.PENDING,
                progress: 0,
                input_file: file.path,
                file_name: file.originalname,
                file_size: file.size,
                estimated_time: estimateProcessingTime(conversionType, file.size),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
            });
            conversionJobIds.push(jobId);
            // Add job to conversion queue
            await redis_1.conversionQueue.add({
                job_id: jobId,
                user_id: user.id,
                input_file: file.path,
                output_format: output_format || 'docx',
                conversion_type: conversionType,
                batch_id: batchId, // Link to batch job
                options: {
                    compression_level
                }
            });
            // Update job status to queued
            conversionJob.status = models_1.JobStatus.QUEUED;
            await conversionJob.save();
        }
        // Update batch job with conversion IDs
        batchJob.conversion_job_ids = conversionJobIds;
        batchJob.status = models_1.BatchStatus.PROCESSING;
        batchJob.processing_started_at = new Date();
        await batchJob.save();
        res.status(201).json({
            message: 'Batch uploaded successfully, processing started',
            batch_id: batchId,
            batch_name,
            operation_type,
            total_files: files.length,
            status: batchJob.status,
            progress: batchJob.progress,
            conversion_job_ids: conversionJobIds,
            created_at: batchJob.created_at
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError(error, 'Batch upload error');
        sendInternalServerError(res, 'Failed to upload batch files', error);
    }
};
exports.uploadBatchFiles = uploadBatchFiles;
/**
 * Get batch job status with individual file progress
 * GET /api/batch/status/:id
 */
const getBatchStatus = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const batchId = req.params.id;
        // Find batch job
        const batchJob = await models_1.BatchJob.findByPk(batchId);
        if (!batchJob) {
            res.status(404).json({
                error: 'Batch not found',
                message: 'The requested batch job does not exist'
            });
            return;
        }
        // Verify ownership
        if (batchJob.user_id !== user.id) {
            res.status(403).json({
                error: 'Access denied',
                message: 'You do not have permission to access this batch'
            });
            return;
        }
        // Get all conversion jobs for this batch
        const conversionJobs = await models_1.ConversionJob.findAll({
            where: {
                id: batchJob.conversion_job_ids
            },
            order: [['created_at', 'ASC']]
        });
        // Update batch progress based on conversion jobs
        const completedCount = conversionJobs.filter(job => job.status === models_1.JobStatus.COMPLETED).length;
        const failedCount = conversionJobs.filter(job => job.status === models_1.JobStatus.FAILED).length;
        batchJob.completed_files = completedCount;
        batchJob.failed_files = failedCount;
        batchJob.updateProgress();
        await batchJob.save();
        res.json({
            batch_id: batchJob.id,
            batch_name: batchJob.batch_name,
            operation_type: batchJob.operation_type,
            status: batchJob.status,
            progress: batchJob.progress,
            total_files: batchJob.total_files,
            completed_files: batchJob.completed_files,
            failed_files: batchJob.failed_files,
            success_rate: batchJob.getSuccessRate(),
            failure_rate: batchJob.getFailureRate(),
            zip_file_path: batchJob.zip_file_path,
            processing_time: batchJob.getProcessingTime(),
            created_at: batchJob.created_at,
            expires_at: batchJob.expires_at,
            files: conversionJobs.map(job => ({
                job_id: job.id,
                file_name: job.file_name,
                file_size: job.file_size,
                status: job.status,
                progress: job.progress,
                error_message: job.error_message,
                output_file: job.output_file
            }))
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError(error, 'Get batch status error');
        sendInternalServerError(res, 'Failed to get batch status', error);
    }
};
exports.getBatchStatus = getBatchStatus;
/**
 * Download ZIP archive of all converted files in batch
 * GET /api/batch/download/:id
 */
const downloadBatchZip = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const batchId = req.params.id;
        // Find batch job
        const batchJob = await models_1.BatchJob.findByPk(batchId);
        if (!batchJob) {
            res.status(404).json({
                error: 'Batch not found',
                message: 'The requested batch job does not exist'
            });
            return;
        }
        // Verify ownership
        if (batchJob.user_id !== user.id) {
            res.status(403).json({
                error: 'Access denied',
                message: 'You do not have permission to access this batch'
            });
            return;
        }
        // Check if batch is complete
        if (!batchJob.isComplete()) {
            res.status(400).json({
                error: 'Batch not ready',
                message: 'Batch processing is not complete yet',
                status: batchJob.status,
                progress: batchJob.progress
            });
            return;
        }
        // Check if batch has expired
        if (batchJob.isExpired()) {
            res.status(410).json({
                error: 'Batch expired',
                message: 'Batch files have been deleted after 7 days',
                expired_at: batchJob.expires_at
            });
            return;
        }
        // Get all completed conversion jobs
        const conversionJobs = await models_1.ConversionJob.findAll({
            where: {
                id: batchJob.conversion_job_ids,
                status: models_1.JobStatus.COMPLETED
            }
        });
        if (conversionJobs.length === 0) {
            res.status(404).json({
                error: 'No files available',
                message: 'No successfully converted files found in this batch'
            });
            return;
        }
        // Create ZIP archive if it doesn't exist
        if (!batchJob.zip_file_path || !fs_1.default.existsSync(batchJob.zip_file_path)) {
            const storagePath = getStoragePath();
            const zipDir = path_1.default.join(storagePath, 'batch_downloads', user.id);
            // Ensure directory exists
            if (!fs_1.default.existsSync(zipDir)) {
                fs_1.default.mkdirSync(zipDir, { recursive: true });
            }
            const zipPath = path_1.default.join(zipDir, `${batchId}.zip`);
            const output = fs_1.default.createWriteStream(zipPath);
            const archive = (0, archiver_1.default)('zip', {
                zlib: { level: 9 } // Maximum compression
            });
            // Handle archive errors
            archive.on('error', (err) => {
                throw err;
            });
            // Pipe archive to file
            archive.pipe(output);
            // Add all converted files to archive
            for (const job of conversionJobs) {
                if (job.output_file && fs_1.default.existsSync(job.output_file)) {
                    const fileName = path_1.default.basename(job.output_file);
                    archive.file(job.output_file, { name: fileName });
                }
            }
            // Finalize archive
            await archive.finalize();
            // Wait for stream to finish
            await new Promise((resolve, reject) => {
                output.on('close', () => resolve());
                output.on('error', reject);
            });
            // Update batch job with ZIP path
            batchJob.zip_file_path = zipPath;
            await batchJob.save();
        }
        // Download ZIP file
        const zipPath = batchJob.zip_file_path;
        const fileName = `${batchJob.batch_name.replace(/[^a-z0-9]/gi, '_')}.zip`;
        res.download(zipPath, fileName, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Download failed',
                        message: 'Failed to download ZIP file'
                    });
                }
            }
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError(error, 'Download batch ZIP error');
        sendInternalServerError(res, 'Failed to download batch files', error);
    }
};
exports.downloadBatchZip = downloadBatchZip;
/**
 * Get user's batch history
 * GET /api/batch/history
 */
const getBatchHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { count, rows: batchJobs } = await models_1.BatchJob.findAndCountAll({
            where: {
                user_id: user.id
            },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });
        res.json({
            batches: batchJobs.map(batch => ({
                batch_id: batch.id,
                batch_name: batch.batch_name,
                operation_type: batch.operation_type,
                status: batch.status,
                progress: batch.progress,
                total_files: batch.total_files,
                completed_files: batch.completed_files,
                failed_files: batch.failed_files,
                success_rate: batch.getSuccessRate(),
                created_at: batch.created_at,
                expires_at: batch.expires_at
            })),
            pagination: {
                page,
                limit,
                total: count,
                total_pages: Math.ceil(count / limit)
            }
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError(error, 'Get batch history error');
        sendInternalServerError(res, 'Failed to get batch history', error);
    }
};
exports.getBatchHistory = getBatchHistory;
/**
 * Cancel batch job (if not started or in progress)
 * DELETE /api/batch/:id
 */
const cancelBatch = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const batchId = req.params.id;
        // Find batch job
        const batchJob = await models_1.BatchJob.findByPk(batchId);
        if (!batchJob) {
            res.status(404).json({
                error: 'Batch not found',
                message: 'The requested batch job does not exist'
            });
            return;
        }
        // Verify ownership
        if (batchJob.user_id !== user.id) {
            res.status(403).json({
                error: 'Access denied',
                message: 'You do not have permission to cancel this batch'
            });
            return;
        }
        // Check if batch can be cancelled
        if (!batchJob.canCancel()) {
            res.status(400).json({
                error: 'Cannot cancel',
                message: `Batch cannot be cancelled in ${batchJob.status} status`,
                status: batchJob.status
            });
            return;
        }
        // Update batch status
        batchJob.status = models_1.BatchStatus.CANCELLED;
        await batchJob.save();
        res.json({
            message: 'Batch cancelled successfully',
            batch_id: batchJob.id,
            status: batchJob.status
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError(error, 'Cancel batch error');
        sendInternalServerError(res, 'Failed to cancel batch', error);
    }
};
exports.cancelBatch = cancelBatch;
//# sourceMappingURL=batch.controller.js.map