"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudConvertService = exports.CloudConvertService = void 0;
const cloudconvert_1 = __importDefault(require("cloudconvert"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const logger_1 = __importDefault(require("../config/logger"));
const circuit_breaker_factory_1 = require("../utils/circuit-breaker.factory");
const circuit_breaker_1 = require("../config/circuit-breaker");
dotenv_1.default.config();
const cloudConvertClient = new cloudconvert_1.default(process.env.CLOUDCONVERT_API_KEY || '', process.env.CLOUDCONVERT_SANDBOX === 'true');
class CloudConvertService {
    constructor() {
        // Wrap convertFile in circuit breaker
        this.convertBreaker = (0, circuit_breaker_factory_1.createCircuitBreaker)(this._convertFileInternal.bind(this), 'cloudconvert-convert', circuit_breaker_1.cloudConvertConfig);
        // Wrap mergePDFs in circuit breaker
        this.mergePDFsBreaker = (0, circuit_breaker_factory_1.createCircuitBreaker)(this._mergePDFsInternal.bind(this), 'cloudconvert-merge', circuit_breaker_1.cloudConvertConfig);
        // Wrap compressPDF in circuit breaker
        this.compressPDFBreaker = (0, circuit_breaker_factory_1.createCircuitBreaker)(this._compressPDFInternal.bind(this), 'cloudconvert-compress', circuit_breaker_1.cloudConvertConfig);
        // Wrap downloadConvertedFile in circuit breaker
        this.downloadBreaker = (0, circuit_breaker_factory_1.createCircuitBreaker)(this._downloadFileInternal.bind(this), 'cloudconvert-download', circuit_breaker_1.cloudConvertConfig);
        // Set up fallback for convert failures
        this.convertBreaker.fallback((params) => {
            logger_1.default.error('CloudConvert convert circuit breaker triggered fallback', {
                operation: 'convert',
                sourceFormat: params.inputFormat,
                targetFormat: params.outputFormat
            });
            return {
                success: false,
                error: 'CloudConvert service unavailable. Please try again later.'
            };
        });
        // Set up fallback for merge failures
        this.mergePDFsBreaker.fallback((inputFiles, outputPath) => {
            logger_1.default.error('CloudConvert merge circuit breaker triggered fallback', {
                operation: 'merge',
                fileCount: inputFiles.length
            });
            return {
                success: false,
                error: 'CloudConvert merge service unavailable. Please try again later.'
            };
        });
        // Set up fallback for compress failures
        this.compressPDFBreaker.fallback((inputFile, outputFile, level) => {
            logger_1.default.error('CloudConvert compress circuit breaker triggered fallback', {
                operation: 'compress',
                compressionLevel: level
            });
            return {
                success: false,
                error: 'CloudConvert compression service unavailable. Please try again later.'
            };
        });
        // Set up fallback for download failures
        this.downloadBreaker.fallback((url) => {
            logger_1.default.error('CloudConvert download circuit breaker triggered fallback', {
                operation: 'download',
                url
            });
            throw new Error('CloudConvert download service unavailable. Please try again later.');
        });
    }
    // PUBLIC METHODS (call circuit breaker)
    /**
     * Convert PDF to specified format using CloudConvert API (with circuit breaker)
     */
    async convertFile(options) {
        return this.convertBreaker.fire(options);
    }
    /**
     * Merge multiple PDFs into one (with circuit breaker)
     */
    async mergePDFs(inputFiles, outputPath) {
        return this.mergePDFsBreaker.fire(inputFiles, outputPath);
    }
    /**
     * Compress PDF file to reduce file size (with circuit breaker)
     */
    async compressPDF(inputFilePath, outputFilePath, compressionLevel = 'recommended') {
        return this.compressPDFBreaker.fire(inputFilePath, outputFilePath, compressionLevel);
    }
    /**
     * Download converted file with timeout and retry logic (with circuit breaker)
     */
    async downloadConvertedFile(outputUrl) {
        return this.downloadBreaker.fire(outputUrl);
    }
    // PRIVATE METHODS (wrapped by circuit breaker)
    /**
     * Internal convert method (wrapped by circuit breaker)
     */
    async _convertFileInternal(options) {
        const { inputFormat, outputFormat, inputFilePath, outputFilePath, originalFileName, webhookUrl, options: conversionOptions = {} } = options;
        // Extract base filename from originalFileName or outputFilePath
        const fileBaseName = originalFileName || path_1.default.basename(outputFilePath, path_1.default.extname(outputFilePath));
        try {
            // Ensure input file exists
            if (!fs_1.default.existsSync(inputFilePath)) {
                throw new Error(`Input file not found: ${inputFilePath}`);
            }
            // Ensure output directory exists
            const outputDir = path_1.default.dirname(outputFilePath);
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            // Build task configuration based on output format
            const taskConfig = {
                operation: 'convert',
                input: 'upload-file',
                input_format: inputFormat,
                output_format: outputFormat
            };
            // Format-specific options with enhanced OCR for maximum text editability
            if (outputFormat === 'pptx') {
                taskConfig.pages = conversionOptions.pages || 'all';
                // CRITICAL: Enable OCR to extract text from PDFs (makes text editable)
                taskConfig.ocr = true; // Extract text from images/scanned PDFs
                taskConfig.ocr_lang = 'eng'; // English language detection
                taskConfig.ocr_mode = 'force'; // Force OCR even if PDF has embedded text (ensures editability)
                // Layout and formatting preservation
                taskConfig.layout_preserving = true; // Maintain original layout
                taskConfig.extract_text = true; // Extract embedded text from PDF
                taskConfig.image_quality = 'high'; // High quality for better text recognition
                // Disable watermarks
                taskConfig.watermark = false;
                taskConfig.no_watermark = true;
            }
            else if (outputFormat === 'docx') {
                // Enhanced OCR configuration for DOCX - Focus on editable text
                taskConfig.pages = conversionOptions.pages || 'all';
                taskConfig.ocr = true; // Extract text from images/scanned PDFs
                taskConfig.ocr_lang = 'eng'; // English language detection
                taskConfig.ocr_mode = 'force'; // Force OCR for maximum text extraction
                taskConfig.extract_text = true; // Extract embedded text from PDF
                taskConfig.image_quality = 'high'; // High quality for better text recognition
                taskConfig.layout_preserving = true; // Maintain formatting where possible
            }
            else if (outputFormat === 'xlsx') {
                // Enhanced OCR configuration for XLSX - Focus on tables
                taskConfig.ocr = true; // Extract text from images/scanned PDFs
                taskConfig.ocr_lang = 'eng'; // English language detection
                taskConfig.ocr_mode = 'force'; // Force OCR for maximum text extraction
                taskConfig.auto_detect_tables = true; // Automatically detect table structures
                taskConfig.extract_text = true; // Extract embedded text
            }
            else if (outputFormat === 'png' || outputFormat === 'jpg') {
                taskConfig.pages = conversionOptions.pages || 'all';
                taskConfig.density = conversionOptions.dpi || 300;
            }
            // Create CloudConvert job
            let job = await cloudConvertClient.jobs.create({
                tasks: {
                    'upload-file': {
                        operation: 'import/upload'
                    },
                    'convert-file': taskConfig,
                    'export-file': {
                        operation: 'export/url',
                        input: 'convert-file'
                    }
                },
                ...(webhookUrl && {
                    webhook_url: webhookUrl
                })
            });
            logger_1.default.info(`CloudConvert job created: ${job.id}`);
            // Upload the input file
            const uploadTask = job.tasks.find(task => task.name === 'upload-file');
            if (!uploadTask) {
                throw new Error('Upload task not found in job');
            }
            const inputStream = fs_1.default.createReadStream(inputFilePath);
            await cloudConvertClient.tasks.upload(uploadTask, inputStream);
            logger_1.default.info(`File uploaded to CloudConvert: ${inputFilePath}`);
            // Wait for job completion (or rely on webhook)
            job = await cloudConvertClient.jobs.wait(job.id);
            logger_1.default.info(`CloudConvert job completed: ${job.id}`);
            // Download the converted file(s)
            const exportTask = job.tasks.find(task => task.name === 'export-file');
            if (!exportTask || !exportTask.result?.files || exportTask.result.files.length === 0) {
                throw new Error('Export task or result not found');
            }
            const files = exportTask.result.files;
            // For image conversions with multiple pages, CloudConvert returns multiple files
            // We need to download all of them and create a ZIP
            if ((outputFormat === 'png' || outputFormat === 'jpg') && files.length > 1) {
                logger_1.default.info(`Converting multi-page PDF to images: ${files.length} files`);
                // Create temporary directory for individual images
                const tempDir = path_1.default.join(path_1.default.dirname(outputFilePath), 'temp');
                if (!fs_1.default.existsSync(tempDir)) {
                    fs_1.default.mkdirSync(tempDir, { recursive: true });
                }
                // Download all image files using new method with timeout and retry
                const downloadedFiles = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileUrl = file.url;
                    if (!fileUrl) {
                        throw new Error(`File URL not found for image ${i + 1}`);
                    }
                    // Use original filename in temp files: presentation-page-1.jpg
                    const tempFilePath = path_1.default.join(tempDir, `${fileBaseName}-page-${i + 1}.${outputFormat}`);
                    // Download using new method with timeout and retry logic
                    const buffer = await this.downloadConvertedFile(fileUrl);
                    fs_1.default.writeFileSync(tempFilePath, buffer);
                    downloadedFiles.push(tempFilePath);
                    logger_1.default.info(`Downloaded image ${i + 1}/${files.length}: ${tempFilePath}`);
                }
                // Create ZIP archive with all images
                const zip = new adm_zip_1.default();
                for (const filePath of downloadedFiles) {
                    const fileName = path_1.default.basename(filePath);
                    const fileContent = fs_1.default.readFileSync(filePath);
                    zip.addFile(fileName, fileContent);
                }
                // Write ZIP file with naming pattern: presentation-images.zip
                const outputDir = path_1.default.dirname(outputFilePath);
                const zipPath = path_1.default.join(outputDir, `${fileBaseName}-images.zip`);
                zip.writeZip(zipPath);
                logger_1.default.info(`Created ZIP archive: ${zipPath}`);
                // Clean up temporary files
                for (const filePath of downloadedFiles) {
                    fs_1.default.unlinkSync(filePath);
                }
                fs_1.default.rmdirSync(tempDir);
                logger_1.default.info(`Converted files archived: ${zipPath}`);
                return {
                    success: true,
                    outputPath: zipPath,
                    jobId: job.id
                };
            }
            else {
                // Single file download (PPTX, DOCX, XLSX, or single-page image)
                const file = files[0];
                const fileUrl = file.url;
                if (!fileUrl) {
                    throw new Error('File URL not found in export result');
                }
                // Download file using new method with timeout and retry logic
                const buffer = await this.downloadConvertedFile(fileUrl);
                fs_1.default.writeFileSync(outputFilePath, buffer);
                logger_1.default.info(`Converted file downloaded: ${outputFilePath}`);
            }
            return {
                success: true,
                outputPath: outputFilePath,
                jobId: job.id
            };
        }
        catch (error) {
            logger_1.default.error('CloudConvert conversion error:', { error: error instanceof Error ? error.message : String(error) });
            return {
                success: false,
                error: error.message || 'Unknown error during conversion'
            };
        }
    }
    /**
     * Internal merge method (wrapped by circuit breaker)
     */
    async _mergePDFsInternal(inputFiles, outputPath) {
        try {
            // Validate input files
            for (const file of inputFiles) {
                if (!fs_1.default.existsSync(file)) {
                    throw new Error(`Input file not found: ${file}`);
                }
            }
            // Ensure output directory exists
            const outputDir = path_1.default.dirname(outputPath);
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            // Create upload tasks for each file
            const uploadTasks = {};
            const mergeInputs = [];
            inputFiles.forEach((file, index) => {
                const taskName = `upload-${index}`;
                uploadTasks[taskName] = {
                    operation: 'import/upload'
                };
                mergeInputs.push(taskName);
            });
            // Create CloudConvert job
            let job = await cloudConvertClient.jobs.create({
                tasks: {
                    ...uploadTasks,
                    'merge-pdfs': {
                        operation: 'merge',
                        input: mergeInputs,
                        output_format: 'pdf'
                    },
                    'export-file': {
                        operation: 'export/url',
                        input: 'merge-pdfs'
                    }
                }
            });
            logger_1.default.info(`CloudConvert merge job created: ${job.id}`);
            // Upload all files
            for (let i = 0; i < inputFiles.length; i++) {
                const uploadTask = job.tasks.find(task => task.name === `upload-${i}`);
                if (!uploadTask) {
                    throw new Error(`Upload task ${i} not found`);
                }
                const inputStream = fs_1.default.createReadStream(inputFiles[i]);
                await cloudConvertClient.tasks.upload(uploadTask, inputStream);
                logger_1.default.info(`File ${i + 1}/${inputFiles.length} uploaded`);
            }
            // Wait for job completion
            job = await cloudConvertClient.jobs.wait(job.id);
            logger_1.default.info(`CloudConvert merge job completed: ${job.id}`);
            // Download merged file
            const exportTask = job.tasks.find(task => task.name === 'export-file');
            if (!exportTask || !exportTask.result?.files?.[0]) {
                throw new Error('Export task or result not found');
            }
            const file = exportTask.result.files[0];
            const fileUrl = file.url;
            if (!fileUrl) {
                throw new Error('File URL not found in export result');
            }
            // Download file using new method with timeout and retry logic
            const buffer = await this.downloadConvertedFile(fileUrl);
            fs_1.default.writeFileSync(outputPath, buffer);
            logger_1.default.info(`Merged PDF downloaded: ${outputPath}`);
            return {
                success: true,
                outputPath,
                jobId: job.id
            };
        }
        catch (error) {
            logger_1.default.error('CloudConvert merge error:', { error: error instanceof Error ? error.message : String(error) });
            return {
                success: false,
                error: error.message || 'Unknown error during PDF merge'
            };
        }
    }
    /**
     * Map user-friendly compression levels to CloudConvert API profiles
     * @param level User-friendly compression level
     * @returns CloudConvert API profile value
     */
    mapCompressionLevel(level) {
        const mapping = {
            'good': 'print', // Best quality, moderate compression (~20-30% reduction)
            'recommended': 'web', // Balanced quality & file size (~40-60% reduction)
            'extreme': 'max' // Maximum compression, lower quality (~60-80% reduction)
        };
        return mapping[level];
    }
    /**
     * Internal compress method (wrapped by circuit breaker)
     *
     * Compression Levels:
     * - 'good': Best quality, moderate compression (~20-30% reduction) - Uses CloudConvert 'print' profile
     * - 'recommended': Balanced quality & file size (~40-60% reduction) - Uses CloudConvert 'web' profile
     * - 'extreme': Maximum compression, lower quality (~60-80% reduction) - Uses CloudConvert 'max' profile
     */
    async _compressPDFInternal(inputFilePath, outputFilePath, compressionLevel = 'recommended') {
        try {
            // Validate input file
            if (!fs_1.default.existsSync(inputFilePath)) {
                throw new Error(`Input file not found: ${inputFilePath}`);
            }
            // Get original file size
            const originalSize = fs_1.default.statSync(inputFilePath).size;
            // Ensure output directory exists
            const outputDir = path_1.default.dirname(outputFilePath);
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            // Map user-friendly compression level to CloudConvert profile
            const cloudConvertProfile = this.mapCompressionLevel(compressionLevel);
            // Create CloudConvert job with optimize task
            let job = await cloudConvertClient.jobs.create({
                tasks: {
                    'upload-file': {
                        operation: 'import/upload'
                    },
                    'optimize-pdf': {
                        operation: 'optimize',
                        input: 'upload-file',
                        input_format: 'pdf',
                        output_format: 'pdf',
                        profile: cloudConvertProfile // CloudConvert API profile: 'print', 'web', or 'max'
                    },
                    'export-file': {
                        operation: 'export/url',
                        input: 'optimize-pdf'
                    }
                }
            });
            logger_1.default.info(`CloudConvert compression job created: ${job.id}`);
            // Upload the input file
            const uploadTask = job.tasks.find(task => task.name === 'upload-file');
            if (!uploadTask) {
                throw new Error('Upload task not found in job');
            }
            const inputStream = fs_1.default.createReadStream(inputFilePath);
            await cloudConvertClient.tasks.upload(uploadTask, inputStream);
            logger_1.default.info(`File uploaded to CloudConvert for compression: ${inputFilePath}`);
            // Wait for job completion
            job = await cloudConvertClient.jobs.wait(job.id);
            logger_1.default.info(`CloudConvert compression job completed: ${job.id}`);
            // Download the compressed file
            const exportTask = job.tasks.find(task => task.name === 'export-file');
            if (!exportTask || !exportTask.result?.files?.[0]) {
                throw new Error('Export task or result not found');
            }
            const file = exportTask.result.files[0];
            const fileUrl = file.url;
            if (!fileUrl) {
                throw new Error('File URL not found in export result');
            }
            // Download compressed file using new method with timeout and retry logic
            const buffer = await this.downloadConvertedFile(fileUrl);
            fs_1.default.writeFileSync(outputFilePath, buffer);
            logger_1.default.info(`Compressed PDF downloaded: ${outputFilePath}`);
            // Calculate compression stats
            const compressedSize = fs_1.default.statSync(outputFilePath).size;
            const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
            return {
                success: true,
                outputPath: outputFilePath,
                jobId: job.id,
                originalSize,
                compressedSize,
                compressionRatio
            };
        }
        catch (error) {
            logger_1.default.error('CloudConvert compression error:', { error: error instanceof Error ? error.message : String(error) });
            return {
                success: false,
                error: error.message || 'Unknown error during PDF compression'
            };
        }
    }
    /**
     * Internal download method (wrapped by circuit breaker)
     *
     * @param outputUrl - URL of the file to download
     * @returns Buffer containing the downloaded file
     */
    async _downloadFileInternal(outputUrl) {
        const maxRetries = 3;
        const timeout = 300000; // 5 minutes (increased from 30s)
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger_1.default.info(`Downloading converted file (attempt ${attempt}/${maxRetries})`, {
                    url: outputUrl,
                    timeout: timeout
                });
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(outputUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'PDFLab/1.3.0'
                    }
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                }
                const buffer = await response.arrayBuffer();
                console.log('File downloaded successfully', {
                    size: buffer.byteLength,
                    sizeMB: (buffer.byteLength / 1024 / 1024).toFixed(2),
                    attempt,
                    url: outputUrl
                });
                return Buffer.from(buffer);
            }
            catch (error) {
                console.warn(`Download attempt ${attempt} failed`, {
                    error: error.message,
                    attempt,
                    maxRetries,
                    url: outputUrl
                });
                // If this was the last attempt, throw
                if (attempt === maxRetries) {
                    console.error(`Download failed after ${maxRetries} attempts`, {
                        error: error.message,
                        url: outputUrl
                    });
                    throw new Error(`Download failed after ${maxRetries} attempts: ${error.message}`);
                }
                // Exponential backoff: 2s, 4s, 6s
                const delay = attempt * 2000;
                logger_1.default.info(`Retrying download in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Download failed: reached end of retry loop');
    }
    /**
     * Get CloudConvert account information
     */
    async getAccountInfo() {
        try {
            const user = await cloudConvertClient.users.me();
            return {
                success: true,
                credits: user.credits,
                email: user.email
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to fetch account info'
            };
        }
    }
    /**
     * Cancel a CloudConvert job
     * Note: CloudConvert SDK may not support job cancellation directly
     */
    async cancelJob(jobId) {
        try {
            // CloudConvert SDK doesn't have a direct cancel method
            // You would need to use the REST API directly or delete the job
            return {
                success: false,
                error: 'Job cancellation not implemented - CloudConvert SDK limitation'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to cancel job'
            };
        }
    }
    /**
     * Get circuit breaker statistics for monitoring
     */
    getCircuitBreakerStats() {
        return {
            convert: (0, circuit_breaker_factory_1.getCircuitBreakerStats)(this.convertBreaker),
            merge: (0, circuit_breaker_factory_1.getCircuitBreakerStats)(this.mergePDFsBreaker),
            compress: (0, circuit_breaker_factory_1.getCircuitBreakerStats)(this.compressPDFBreaker),
            download: (0, circuit_breaker_factory_1.getCircuitBreakerStats)(this.downloadBreaker)
        };
    }
}
exports.CloudConvertService = CloudConvertService;
exports.cloudConvertService = new CloudConvertService();
//# sourceMappingURL=cloudconvert.service.js.map