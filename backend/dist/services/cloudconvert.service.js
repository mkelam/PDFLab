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
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const adm_zip_1 = __importDefault(require("adm-zip"));
dotenv_1.default.config();
const cloudConvertClient = new cloudconvert_1.default(process.env.CLOUDCONVERT_API_KEY || '', process.env.CLOUDCONVERT_SANDBOX === 'true');
class CloudConvertService {
    /**
     * Convert PDF to specified format using CloudConvert API
     */
    async convertFile(options) {
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
            // Format-specific options with enhanced OCR
            if (outputFormat === 'pptx') {
                taskConfig.pages = conversionOptions.pages || 'all';
                taskConfig.layout_preserving = true;
                // Enhanced OCR configuration
                taskConfig.ocr = true; // Always enable OCR
                taskConfig.ocr_lang = 'eng'; // English language (can be made configurable)
                taskConfig.ocr_mode = 'auto'; // Auto-detect if OCR is needed
                // Disable watermark/footer additions
                taskConfig.watermark = false;
                taskConfig.no_watermark = true;
            }
            else if (outputFormat === 'docx') {
                // Enhanced OCR configuration for DOCX
                taskConfig.ocr = true;
                taskConfig.ocr_lang = 'eng';
                taskConfig.ocr_mode = 'auto';
                taskConfig.pages = conversionOptions.pages || 'all';
            }
            else if (outputFormat === 'xlsx') {
                // Enhanced OCR configuration for XLSX
                taskConfig.ocr = true;
                taskConfig.ocr_lang = 'eng';
                taskConfig.auto_detect_tables = true;
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
            console.log(`CloudConvert job created: ${job.id}`);
            // Upload the input file
            const uploadTask = job.tasks.find(task => task.name === 'upload-file');
            if (!uploadTask) {
                throw new Error('Upload task not found in job');
            }
            const inputStream = fs_1.default.createReadStream(inputFilePath);
            await cloudConvertClient.tasks.upload(uploadTask, inputStream);
            console.log(`File uploaded to CloudConvert: ${inputFilePath}`);
            // Wait for job completion (or rely on webhook)
            job = await cloudConvertClient.jobs.wait(job.id);
            console.log(`CloudConvert job completed: ${job.id}`);
            // Download the converted file(s)
            const exportTask = job.tasks.find(task => task.name === 'export-file');
            if (!exportTask || !exportTask.result?.files || exportTask.result.files.length === 0) {
                throw new Error('Export task or result not found');
            }
            const files = exportTask.result.files;
            // For image conversions with multiple pages, CloudConvert returns multiple files
            // We need to download all of them and create a ZIP
            if ((outputFormat === 'png' || outputFormat === 'jpg') && files.length > 1) {
                console.log(`Converting multi-page PDF to images: ${files.length} files`);
                // Create temporary directory for individual images
                const tempDir = path_1.default.join(path_1.default.dirname(outputFilePath), 'temp');
                if (!fs_1.default.existsSync(tempDir)) {
                    fs_1.default.mkdirSync(tempDir, { recursive: true });
                }
                // Download all image files
                const downloadedFiles = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileUrl = file.url;
                    if (!fileUrl) {
                        throw new Error(`File URL not found for image ${i + 1}`);
                    }
                    // Use original filename in temp files: presentation-page-1.jpg
                    const tempFilePath = path_1.default.join(tempDir, `${fileBaseName}-page-${i + 1}.${outputFormat}`);
                    await new Promise((resolve, reject) => {
                        const protocol = fileUrl.startsWith('https:') ? https_1.default : http_1.default;
                        const writeStream = fs_1.default.createWriteStream(tempFilePath);
                        protocol.get(fileUrl, (response) => {
                            if (response.statusCode !== 200) {
                                reject(new Error(`Download failed with status ${response.statusCode}`));
                                return;
                            }
                            response.pipe(writeStream);
                            writeStream.on('finish', () => {
                                writeStream.close();
                                resolve();
                            });
                            writeStream.on('error', (err) => {
                                fs_1.default.unlink(tempFilePath, () => { });
                                reject(err);
                            });
                        }).on('error', reject);
                    });
                    downloadedFiles.push(tempFilePath);
                    console.log(`Downloaded image ${i + 1}/${files.length}: ${tempFilePath}`);
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
                console.log(`Created ZIP archive: ${zipPath}`);
                // Clean up temporary files
                for (const filePath of downloadedFiles) {
                    fs_1.default.unlinkSync(filePath);
                }
                fs_1.default.rmdirSync(tempDir);
                console.log(`Converted files archived: ${zipPath}`);
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
                // Download file from URL
                await new Promise((resolve, reject) => {
                    const protocol = fileUrl.startsWith('https:') ? https_1.default : http_1.default;
                    const writeStream = fs_1.default.createWriteStream(outputFilePath);
                    protocol.get(fileUrl, (response) => {
                        if (response.statusCode !== 200) {
                            reject(new Error(`Download failed with status ${response.statusCode}`));
                            return;
                        }
                        response.pipe(writeStream);
                        writeStream.on('finish', () => {
                            writeStream.close();
                            resolve();
                        });
                        writeStream.on('error', (err) => {
                            fs_1.default.unlink(outputFilePath, () => { }); // Delete incomplete file
                            reject(err);
                        });
                    }).on('error', reject);
                });
                console.log(`Converted file downloaded: ${outputFilePath}`);
            }
            return {
                success: true,
                outputPath: outputFilePath,
                jobId: job.id
            };
        }
        catch (error) {
            console.error('CloudConvert conversion error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error during conversion'
            };
        }
    }
    /**
     * Merge multiple PDFs into one
     */
    async mergePDFs(inputFiles, outputPath) {
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
            console.log(`CloudConvert merge job created: ${job.id}`);
            // Upload all files
            for (let i = 0; i < inputFiles.length; i++) {
                const uploadTask = job.tasks.find(task => task.name === `upload-${i}`);
                if (!uploadTask) {
                    throw new Error(`Upload task ${i} not found`);
                }
                const inputStream = fs_1.default.createReadStream(inputFiles[i]);
                await cloudConvertClient.tasks.upload(uploadTask, inputStream);
                console.log(`File ${i + 1}/${inputFiles.length} uploaded`);
            }
            // Wait for job completion
            job = await cloudConvertClient.jobs.wait(job.id);
            console.log(`CloudConvert merge job completed: ${job.id}`);
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
            // Download file from URL
            await new Promise((resolve, reject) => {
                const protocol = fileUrl.startsWith('https:') ? https_1.default : http_1.default;
                const writeStream = fs_1.default.createWriteStream(outputPath);
                protocol.get(fileUrl, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Download failed with status ${response.statusCode}`));
                        return;
                    }
                    response.pipe(writeStream);
                    writeStream.on('finish', () => {
                        writeStream.close();
                        resolve();
                    });
                    writeStream.on('error', (err) => {
                        fs_1.default.unlink(outputPath, () => { }); // Delete incomplete file
                        reject(err);
                    });
                }).on('error', reject);
            });
            console.log(`Merged PDF downloaded: ${outputPath}`);
            return {
                success: true,
                outputPath,
                jobId: job.id
            };
        }
        catch (error) {
            console.error('CloudConvert merge error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error during PDF merge'
            };
        }
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
}
exports.CloudConvertService = CloudConvertService;
exports.cloudConvertService = new CloudConvertService();
//# sourceMappingURL=cloudconvert.service.js.map