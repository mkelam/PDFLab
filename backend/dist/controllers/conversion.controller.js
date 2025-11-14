"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversionHistory = exports.downloadBatchZip = exports.downloadFile = exports.getJobStatus = exports.uploadFile = exports.batchConvert = exports.mergePDFs = exports.compressPDF = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const archiver_1 = __importDefault(require("archiver"));
const models_1 = require("../models");
const redis_1 = require("../config/redis");
/**
 * Compress PDF file to reduce size
 */
const compressPDF = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check if file was uploaded
        if (!req.file) {
            res.status(400).json({
                error: 'No file uploaded',
                message: 'Please provide a PDF file to compress'
            });
            return;
        }
        // Get compression level from request (default to 'recommended')
        const compressionLevel = req.body.compression_level || 'recommended';
        // Validate compression level
        if (!['good', 'recommended', 'extreme'].includes(compressionLevel)) {
            fs_1.default.unlinkSync(req.file.path);
            res.status(400).json({
                error: 'Invalid compression level',
                message: 'Compression level must be one of: good, recommended, extreme'
            });
            return;
        }
        // Validate file size
        const maxFileSize = user.getMaxFileSize();
        if (req.file.size > maxFileSize) {
            // Delete uploaded file
            fs_1.default.unlinkSync(req.file.path);
            res.status(413).json({
                error: 'File too large',
                message: `Your ${user.plan} plan supports files up to ${Math.round(maxFileSize / 1024 / 1024)}MB`,
                file_size: req.file.size,
                max_file_size: maxFileSize,
                upgrade_required: true
            });
            return;
        }
        // Create conversion job
        const jobId = (0, uuid_1.v4)();
        const job = await models_1.ConversionJob.create({
            id: jobId,
            user_id: user.id,
            type: models_1.ConversionType.PDF_COMPRESS,
            status: models_1.JobStatus.PENDING,
            progress: 0,
            input_file: req.file.path,
            file_name: req.file.originalname,
            file_size: req.file.size,
            estimated_time: estimateProcessingTime(models_1.ConversionType.PDF_COMPRESS, req.file.size),
            created_at: new Date(),
            updated_at: new Date(),
            expires_at: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
        });
        // Add job to queue
        await redis_1.conversionQueue.add({
            job_id: jobId,
            user_id: user.id,
            input_file: req.file.path,
            output_format: 'pdf',
            conversion_type: models_1.ConversionType.PDF_COMPRESS,
            options: {
                compression_level: compressionLevel
            }
        });
        // Update job status to queued
        job.status = models_1.JobStatus.QUEUED;
        await job.save();
        res.status(201).json({
            message: 'File uploaded successfully, compression queued',
            job_id: jobId,
            status: job.status,
            progress: job.progress,
            estimated_time: job.estimated_time,
            compression_level: compressionLevel,
            created_at: job.created_at
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Compress PDF error', error, { user_id: req.user?.id });
        sendInternalServerError(res, 'An error occurred during PDF compression. Please try again, or contact support if the issue persists.');
    }
};
exports.compressPDF = compressPDF;
/**
 * Merge multiple PDF files
 */
const mergePDFs = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check if files were uploaded
        if (!req.files || !Array.isArray(req.files) || req.files.length < 2) {
            res.status(400).json({
                error: 'Insufficient files',
                message: 'Please provide at least 2 PDF files to merge'
            });
            return;
        }
        const files = req.files;
        // Validate total file size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const maxFileSize = user.getMaxFileSize();
        if (totalSize > maxFileSize) {
            // Delete uploaded files
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(413).json({
                error: 'Total file size too large',
                message: `Combined file size exceeds your plan limit (${Math.round(maxFileSize / 1024 / 1024)}MB)`,
                total_size: totalSize,
                max_file_size: maxFileSize,
                upgrade_required: true
            });
            return;
        }
        // Create conversion job
        const jobId = (0, uuid_1.v4)();
        const filePaths = files.map(f => f.path);
        const fileNames = files.map(f => f.originalname).join(', ');
        const job = await models_1.ConversionJob.create({
            id: jobId,
            user_id: user.id,
            type: models_1.ConversionType.PDF_MERGE,
            status: models_1.JobStatus.PENDING,
            progress: 0,
            input_file: filePaths[0], // Store first file path as primary
            file_name: `Merge: ${fileNames}`,
            file_size: totalSize,
            estimated_time: estimateProcessingTime(models_1.ConversionType.PDF_MERGE, totalSize),
            created_at: new Date(),
            updated_at: new Date(),
            expires_at: new Date(Date.now() + 3600000) // 1 hour
        });
        // Add job to queue with all file paths
        await redis_1.conversionQueue.add({
            job_id: jobId,
            user_id: user.id,
            input_files: filePaths, // Multiple input files for merging
            output_format: 'pdf',
            conversion_type: models_1.ConversionType.PDF_MERGE,
            options: {}
        });
        // Update job status to queued
        job.status = models_1.JobStatus.QUEUED;
        await job.save();
        res.status(201).json({
            message: 'Files uploaded successfully, merge queued',
            job_id: jobId,
            status: job.status,
            progress: job.progress,
            estimated_time: job.estimated_time,
            file_count: files.length,
            total_size: totalSize,
            created_at: job.created_at
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Merge PDFs error', error, { user_id: req.user?.id, file_count: req.files?.length });
        sendInternalServerError(res, 'An error occurred during PDF merge. Please try again, or contact support if the issue persists.');
    }
};
exports.mergePDFs = mergePDFs;
/**
 * Batch convert multiple PDF files to the same format
 * Requires authentication (Pro/Enterprise plans)
 */
const batchConvert = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check plan - batch conversion is Pro/Enterprise only
        if (user.plan === 'free') {
            res.status(403).json({
                error: 'Premium feature',
                message: 'Batch processing is available on Pro and Enterprise plans',
                current_plan: user.plan,
                required_plans: ['pro', 'enterprise'],
                upgrade_options: [
                    {
                        plan: 'pro',
                        price: '$29.99/month',
                        features: ['Unlimited conversions', 'Batch processing (up to 10 files)', '100MB file size'],
                        cta: 'Upgrade to Pro',
                        url: '/pricing'
                    }
                ]
            });
            return;
        }
        // Check if files were uploaded
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).json({
                error: 'No files uploaded',
                message: 'Please provide at least 1 PDF file for batch conversion'
            });
            return;
        }
        const files = req.files;
        // Limit to 10 files
        if (files.length > 10) {
            // Delete excess files
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(400).json({
                error: 'Too many files',
                message: 'Batch conversion supports up to 10 files at once',
                uploaded_count: files.length,
                max_files: 10
            });
            return;
        }
        const { conversion_type, dpi, pages } = req.body;
        // Validate conversion type
        if (!conversion_type || !Object.values(models_1.ConversionType).includes(conversion_type)) {
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(400).json({
                error: 'Invalid conversion type',
                message: `Conversion type must be one of: ${Object.values(models_1.ConversionType).join(', ')}`
            });
            return;
        }
        // Batch conversion only supports specific types
        const allowedBatchTypes = [
            models_1.ConversionType.PDF_TO_PPTX,
            models_1.ConversionType.PDF_TO_DOCX,
            models_1.ConversionType.PDF_TO_XLSX,
            models_1.ConversionType.PDF_TO_IMAGES
        ];
        if (!allowedBatchTypes.includes(conversion_type)) {
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(400).json({
                error: 'Invalid batch conversion type',
                message: 'Batch conversion supports: PPTX, DOCX, XLSX, Images',
                requested_type: conversion_type,
                allowed_types: allowedBatchTypes
            });
            return;
        }
        // Validate total file size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const maxFileSize = user.getMaxFileSize();
        if (totalSize > maxFileSize) {
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(413).json({
                error: 'Total file size too large',
                message: `Combined file size exceeds your plan limit (${Math.round(maxFileSize / 1024 / 1024)}MB)`,
                total_size: totalSize,
                max_file_size: maxFileSize,
                upgrade_required: true
            });
            return;
        }
        // Check quota (each file counts as 1 conversion)
        if (user.conversions_limit !== -1 && user.conversions_used + files.length > user.conversions_limit) {
            files.forEach(file => fs_1.default.unlinkSync(file.path));
            res.status(429).json({
                error: 'Quota exceeded',
                message: `You need ${files.length} conversions, but only have ${user.conversions_limit - user.conversions_used} remaining`,
                conversions_used: user.conversions_used,
                conversions_limit: user.conversions_limit,
                files_count: files.length,
                upgrade_required: true
            });
            return;
        }
        // Create individual jobs for each file
        const jobIds = [];
        const jobPromises = files.map(async (file) => {
            const jobId = (0, uuid_1.v4)();
            jobIds.push(jobId);
            const job = await models_1.ConversionJob.create({
                id: jobId,
                user_id: user.id,
                type: conversion_type,
                status: models_1.JobStatus.PENDING,
                progress: 0,
                input_file: file.path,
                file_name: file.originalname,
                file_size: file.size,
                estimated_time: estimateProcessingTime(conversion_type, file.size),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
            });
            // Add job to queue
            await redis_1.conversionQueue.add({
                job_id: jobId,
                user_id: user.id,
                input_file: file.path,
                output_format: getOutputFormat(conversion_type),
                conversion_type: conversion_type,
                options: {
                    dpi: dpi ? parseInt(dpi) : 300,
                    pages: pages || 'all'
                }
            });
            // Update job status to queued
            job.status = models_1.JobStatus.QUEUED;
            await job.save();
            return jobId;
        });
        await Promise.all(jobPromises);
        // Increment user's conversion count by number of files
        user.conversions_used += files.length;
        await user.save();
        res.status(201).json({
            message: `${files.length} files uploaded successfully, batch conversion queued`,
            job_ids: jobIds,
            file_count: files.length,
            total_size: totalSize,
            conversion_type: conversion_type,
            estimated_time: estimateProcessingTime(conversion_type, totalSize),
            conversions_used: user.conversions_used,
            conversions_remaining: user.conversions_limit === -1 ? 'unlimited' : user.conversions_limit - user.conversions_used,
            created_at: new Date()
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Batch convert error', error, { user_id: req.user?.id, file_count: req.files?.length });
        sendInternalServerError(res, 'An error occurred during batch conversion. Please try again, or contact support if the issue persists.');
    }
};
exports.batchConvert = batchConvert;
/**
 * Upload file and create conversion job
 * Supports both authenticated users and guest users
 */
const uploadFile = async (req, res) => {
    try {
        const user = req.user;
        const guestSession = req.guestSession;
        const isGuest = !user && !!guestSession;
        console.log('[Upload] user:', user ? 'authenticated' : 'none');
        console.log('[Upload] guestSession:', guestSession ? 'exists' : 'none');
        console.log('[Upload] isGuest:', isGuest);
        // Check if file was uploaded
        if (!req.file) {
            res.status(400).json({
                error: 'No file uploaded',
                message: 'Please provide a PDF file'
            });
            return;
        }
        const { conversion_type, dpi, pages } = req.body;
        // Validate conversion type
        if (!conversion_type || !Object.values(models_1.ConversionType).includes(conversion_type)) {
            res.status(400).json({
                error: 'Invalid conversion type',
                message: `Conversion type must be one of: ${Object.values(models_1.ConversionType).join(', ')}`
            });
            return;
        }
        // Guest restrictions: Only allow PDF to PPTX and DOCX
        if (isGuest) {
            const allowedGuestFormats = [models_1.ConversionType.PDF_TO_PPTX, models_1.ConversionType.PDF_TO_DOCX];
            if (!allowedGuestFormats.includes(conversion_type)) {
                fs_1.default.unlinkSync(req.file.path);
                // Get human-readable format name
                const formatName = conversion_type
                    .replace('pdf_to_', '')
                    .toUpperCase()
                    .replace('IMAGES', 'PNG');
                res.status(403).json({
                    error: 'Premium format',
                    message: `${formatName} conversions require a free account. Sign up in seconds - no credit card needed!`,
                    requested_format: conversion_type,
                    available_guest_formats: ['pptx', 'docx'],
                    unlock_benefits: [
                        'All formats (PPTX, DOCX, XLSX, PNG)',
                        '3 conversions per month',
                        'Larger file sizes (10MB)'
                    ],
                    cta: {
                        text: 'Sign Up Free - Unlock All Formats',
                        url: '/signup'
                    },
                    alternative: 'Or convert to PPTX or DOCX (no signup required)'
                });
                return;
            }
        }
        // Validate file size
        const maxFileSize = user ? user.getMaxFileSize() : 5 * 1024 * 1024; // 5MB for guests
        if (req.file.size > maxFileSize) {
            // Delete uploaded file
            fs_1.default.unlinkSync(req.file.path);
            const fileSizeMB = Math.round((req.file.size / 1024 / 1024) * 10) / 10;
            const maxSizeMB = Math.round(maxFileSize / 1024 / 1024);
            if (isGuest) {
                // Guest user - offer upgrade options
                res.status(413).json({
                    error: 'File too large',
                    message: `This file is ${fileSizeMB}MB, but guests can upload up to 5MB`,
                    file_size: req.file.size,
                    file_size_mb: fileSizeMB,
                    max_file_size: maxFileSize,
                    max_file_size_mb: 5,
                    upgrade_options: [
                        {
                            plan: 'free',
                            limit: '10MB',
                            cta: 'Sign up free for 10MB uploads',
                            url: '/signup',
                            highlight: true
                        },
                        {
                            plan: 'starter',
                            limit: '25MB',
                            price: '$9.99/month',
                            cta: 'View Plans',
                            url: '/pricing',
                            highlight: false
                        }
                    ],
                    tip: '💡 Try compressing your PDF or converting just a few pages'
                });
            }
            else if (user) {
                // Authenticated user - show current plan and upgrade path
                res.status(413).json({
                    error: 'File too large',
                    message: `Your ${user.plan} plan supports files up to ${maxSizeMB}MB`,
                    file_size: req.file.size,
                    file_size_mb: fileSizeMB,
                    max_file_size: maxFileSize,
                    max_file_size_mb: maxSizeMB,
                    current_plan: user.plan,
                    upgrade_required: true,
                    upgrade_options: [
                        {
                            plan: 'starter',
                            limit: '25MB',
                            price: '$9.99/month',
                            url: '/pricing'
                        },
                        {
                            plan: 'pro',
                            limit: '100MB',
                            price: '$29.99/month',
                            url: '/pricing'
                        },
                        {
                            plan: 'enterprise',
                            limit: '500MB',
                            price: '$99.99/month',
                            url: '/pricing'
                        }
                    ].filter(option => {
                        const limits = { starter: 25, pro: 100, enterprise: 500 };
                        return limits[option.plan] > maxSizeMB;
                    }),
                    cta: {
                        text: 'Upgrade Plan',
                        url: '/pricing'
                    }
                });
            }
            return;
        }
        // Create conversion job
        const jobId = (0, uuid_1.v4)();
        const job = await models_1.ConversionJob.create({
            id: jobId,
            user_id: user ? user.id : null, // Null for guest users
            type: conversion_type,
            status: models_1.JobStatus.PENDING,
            progress: 0,
            input_file: req.file.path,
            file_name: req.file.originalname,
            file_size: req.file.size,
            estimated_time: estimateProcessingTime(conversion_type, req.file.size),
            created_at: new Date(),
            updated_at: new Date(),
            expires_at: isGuest
                ? new Date(Date.now() + 3600000) // 1 hour for guests
                : new Date(Date.now() + 7 * 24 * 3600000) // 7 days for registered users
        });
        // Add job to queue
        await redis_1.conversionQueue.add({
            job_id: jobId,
            user_id: user ? user.id : null,
            guest_session_id: isGuest ? guestSession?.sessionId : null,
            input_file: req.file.path,
            output_format: getOutputFormat(conversion_type),
            conversion_type: conversion_type,
            options: {
                dpi: dpi ? parseInt(dpi) : 300,
                pages: pages || 'all'
            }
        });
        // Update job status to queued
        job.status = models_1.JobStatus.QUEUED;
        await job.save();
        // Record guest conversion (increments quota)
        if (isGuest && guestSession) {
            const GuestSessionService = require('../services/guest-session.service').default;
            const { getClientIp } = require('../middleware/guest.middleware');
            await GuestSessionService.recordConversion(guestSession.sessionId, getClientIp(req));
        }
        res.status(201).json({
            message: 'File uploaded successfully, conversion queued',
            job_id: jobId,
            status: job.status,
            progress: job.progress,
            estimated_time: job.estimated_time,
            created_at: job.created_at,
            is_guest: isGuest,
            ...(isGuest && {
                guest_message: '⚠️ Download link expires in 1 hour. Sign up free for 3 conversions/month + more features!',
                expires_in_hours: 1,
                signup_cta: 'Create Free Account',
                signup_url: '/signup'
            })
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Upload file error', error, { body: req.body });
        sendInternalServerError(res, 'An error occurred during file upload. Please try again, or contact support if the issue persists.');
    }
};
exports.uploadFile = uploadFile;
/**
 * Get conversion job status
 * Public endpoint - accessible by both authenticated and guest users
 */
const getJobStatus = async (req, res) => {
    try {
        const { job_id } = req.params;
        const job = await models_1.ConversionJob.findByPk(job_id);
        if (!job) {
            res.status(404).json({
                error: 'Job not found',
                message: 'Conversion job does not exist'
            });
            return;
        }
        // Calculate remaining time
        let estimated_time_remaining;
        if (job.status === models_1.JobStatus.PROCESSING && job.estimated_time) {
            const elapsedTime = job.processing_started_at
                ? Math.floor((Date.now() - job.processing_started_at.getTime()) / 1000)
                : 0;
            estimated_time_remaining = Math.max(0, job.estimated_time - elapsedTime);
        }
        res.status(200).json({
            job_id: job.id,
            status: job.status,
            progress: job.progress,
            estimated_time_remaining,
            output_file: job.output_file ? `/download/${job.id}` : undefined,
            error: job.error_message,
            created_at: job.created_at,
            updated_at: job.updated_at,
            processing_time: job.getProcessingTime()
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Get job status error', error, { job_id: req.params.job_id });
        sendInternalServerError(res, 'Unable to check conversion status. Please refresh the page or try again in a moment.');
    }
};
exports.getJobStatus = getJobStatus;
/**
 * Download converted file
 * Supports both authenticated and guest users
 */
const downloadFile = async (req, res) => {
    try {
        const user = req.user;
        const { job_id } = req.params;
        const job = await models_1.ConversionJob.findByPk(job_id);
        if (!job) {
            res.status(404).json({
                error: 'Job not found',
                message: 'Conversion job does not exist'
            });
            return;
        }
        // Check ownership for authenticated users
        if (user && job.user_id && job.user_id !== user.id) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have access to this file'
            });
            return;
        }
        // Check if job is completed
        if (job.status !== models_1.JobStatus.COMPLETED) {
            res.status(400).json({
                error: 'Job not completed',
                message: `Job is currently ${job.status}. Please wait for completion.`,
                status: job.status
            });
            return;
        }
        // Check if file exists
        if (!job.output_file || !fs_1.default.existsSync(job.output_file)) {
            const isGuest = !job.user_id;
            res.status(410).json({
                error: 'File expired',
                message: isGuest
                    ? 'Guest files are automatically deleted after 1 hour to protect your privacy'
                    : 'Files are automatically deleted after 7 days',
                expired_at: job.expires_at,
                retention_period: isGuest ? '1 hour' : '7 days',
                file_type: job.type,
                file_name: job.file_name,
                options: [
                    {
                        id: 'convert_again',
                        title: 'Convert again',
                        description: 'Upload your PDF and convert it again',
                        cta: 'Convert Now',
                        url: '/',
                        primary: !isGuest
                    },
                    ...(isGuest
                        ? [
                            {
                                id: 'signup',
                                title: 'Sign up for longer storage',
                                description: 'Keep files for 7 days with a free account',
                                cta: 'Create Free Account',
                                url: '/signup',
                                primary: true
                            }
                        ]
                        : [])
                ]
            });
            return;
        }
        // Set headers for download
        // Use the actual filename from output_file path (e.g., presentation.pptx, presentation-images.zip)
        const fileName = path_1.default.basename(job.output_file);
        const fileExtension = path_1.default.extname(fileName).substring(1) || job.getOutputFormat();
        res.setHeader('Content-Type', getContentType(fileExtension));
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        // Stream file to response
        const fileStream = fs_1.default.createReadStream(job.output_file);
        fileStream.pipe(res);
        fileStream.on('error', (error) => {
            const { sendInternalServerError, logError } = require('../utils/error.utils');
            logError('File stream error', error, { job_id: req.params.job_id, file: job.output_file });
            if (!res.headersSent) {
                sendInternalServerError(res, 'An error occurred while downloading the file. Please try again, or contact support if the issue persists.');
            }
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Download file error', error, { job_id: req.params.job_id });
        if (!res.headersSent) {
            sendInternalServerError(res, 'An error occurred while downloading the file. Please try again, or contact support if the issue persists.');
        }
    }
};
exports.downloadFile = downloadFile;
/**
 * Download multiple batch conversion results as a ZIP file
 * Supports batch conversions where multiple files were converted
 */
const downloadBatchZip = async (req, res) => {
    try {
        const user = req.user;
        const { job_ids } = req.query;
        // Validate job_ids parameter
        if (!job_ids || typeof job_ids !== 'string') {
            res.status(400).json({
                error: 'Missing job IDs',
                message: 'Please provide job_ids as comma-separated values'
            });
            return;
        }
        const jobIdArray = job_ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
        if (jobIdArray.length === 0) {
            res.status(400).json({
                error: 'No job IDs provided',
                message: 'At least one job ID is required'
            });
            return;
        }
        if (jobIdArray.length > 50) {
            res.status(400).json({
                error: 'Too many job IDs',
                message: 'Maximum 50 job IDs can be downloaded at once'
            });
            return;
        }
        // Fetch all jobs
        const jobs = await models_1.ConversionJob.findAll({
            where: { id: jobIdArray }
        });
        if (jobs.length === 0) {
            res.status(404).json({
                error: 'No jobs found',
                message: 'None of the provided job IDs exist'
            });
            return;
        }
        // Check ownership for authenticated users
        if (user) {
            const unauthorizedJobs = jobs.filter(job => job.user_id && job.user_id !== user.id);
            if (unauthorizedJobs.length > 0) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'You do not have access to some of these files'
                });
                return;
            }
        }
        // Check if all jobs are completed
        const incompleteJobs = jobs.filter(job => job.status !== models_1.JobStatus.COMPLETED);
        if (incompleteJobs.length > 0) {
            res.status(400).json({
                error: 'Jobs not completed',
                message: `${incompleteJobs.length} job(s) are not yet completed`,
                incomplete_job_ids: incompleteJobs.map(job => job.id)
            });
            return;
        }
        // Check if output files exist
        const missingFiles = [];
        const validJobs = jobs.filter(job => {
            if (!job.output_file || !fs_1.default.existsSync(job.output_file)) {
                missingFiles.push(job.id);
                return false;
            }
            return true;
        });
        if (validJobs.length === 0) {
            res.status(410).json({
                error: 'Files expired',
                message: 'All files have expired or been deleted',
                expired_job_ids: missingFiles
            });
            return;
        }
        // Create ZIP archive
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        // Set response headers
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const zipFileName = `pdflab-batch-${timestamp}-${validJobs.length}files.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        // Pipe archive to response
        archive.pipe(res);
        // Add each file to the archive
        validJobs.forEach((job, index) => {
            if (job.output_file && fs_1.default.existsSync(job.output_file)) {
                // Extract original filename without extension
                const originalName = path_1.default.parse(job.file_name).name;
                const outputExt = path_1.default.extname(job.output_file);
                // Create unique filename: originalname-converted.ext
                const archivedFileName = `${originalName}-converted${outputExt}`;
                archive.file(job.output_file, { name: archivedFileName });
            }
        });
        // Handle archive errors
        archive.on('error', (error) => {
            const { logError } = require('../utils/error.utils');
            logError('Archive creation error', error, { job_ids: jobIdArray });
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Archive creation failed',
                    message: 'An error occurred while creating the ZIP file'
                });
            }
        });
        // Finalize the archive
        await archive.finalize();
        console.log(`[Batch Download] Created ZIP with ${validJobs.length} files for user ${user?.id || 'guest'}`);
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Download batch ZIP error', error, { query: req.query });
        if (!res.headersSent) {
            sendInternalServerError(res, 'An error occurred while creating the batch download. Please try again.');
        }
    }
};
exports.downloadBatchZip = downloadBatchZip;
/**
 * Get user's conversion history
 */
const getConversionHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const { count, rows: jobs } = await models_1.ConversionJob.findAndCountAll({
            where: { user_id: user.id },
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: [
                'id',
                'type',
                'status',
                'file_name',
                'file_size',
                'created_at',
                'processing_completed_at',
                'error_message'
            ]
        });
        res.status(200).json({
            jobs: jobs.map(job => ({
                job_id: job.id,
                type: job.type,
                status: job.status,
                file_name: job.file_name,
                file_size: job.file_size,
                created_at: job.created_at,
                completed_at: job.processing_completed_at,
                processing_time: job.getProcessingTime(),
                error: job.error_message
            })),
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            }
        });
    }
    catch (error) {
        const { sendInternalServerError, logError } = require('../utils/error.utils');
        logError('Get conversion history error', error, { user_id: req.user?.id });
        sendInternalServerError(res, 'An error occurred while fetching conversion history. Please refresh the page or try again later.');
    }
};
exports.getConversionHistory = getConversionHistory;
// Helper functions
function estimateProcessingTime(conversionType, fileSize) {
    // Rough estimates based on PRD (<5s for 20 pages)
    const baseTimes = {
        [models_1.ConversionType.PDF_TO_PPTX]: 4,
        [models_1.ConversionType.PDF_TO_DOCX]: 4,
        [models_1.ConversionType.PDF_TO_XLSX]: 4,
        [models_1.ConversionType.PDF_TO_IMAGES]: 8,
        [models_1.ConversionType.PDF_MERGE]: 2,
        [models_1.ConversionType.PDF_COMPRESS]: 3
    };
    // Scale based on file size (assume 1MB = 10 pages)
    const sizeFactor = Math.ceil(fileSize / (1024 * 1024 * 2)); // Every 2MB
    return (baseTimes[conversionType] || 5) * sizeFactor;
}
function getOutputFormat(conversionType) {
    switch (conversionType) {
        case models_1.ConversionType.PDF_TO_PPTX:
            return 'pptx';
        case models_1.ConversionType.PDF_TO_DOCX:
            return 'docx';
        case models_1.ConversionType.PDF_TO_XLSX:
            return 'xlsx';
        case models_1.ConversionType.PDF_TO_IMAGES:
            return 'jpg';
        case models_1.ConversionType.PDF_MERGE:
            return 'pdf';
        case models_1.ConversionType.PDF_COMPRESS:
            return 'pdf';
        default:
            return 'bin';
    }
}
function getContentType(format) {
    const contentTypes = {
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        zip: 'application/zip'
    };
    return contentTypes[format] || 'application/octet-stream';
}
//# sourceMappingURL=conversion.controller.js.map