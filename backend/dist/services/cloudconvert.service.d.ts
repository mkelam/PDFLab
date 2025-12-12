export interface ConversionOptions {
    inputFormat: 'pdf';
    outputFormat: 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg';
    inputFilePath: string;
    outputFilePath: string;
    originalFileName?: string;
    webhookUrl?: string;
    options?: {
        dpi?: number;
        pages?: string;
        ocr?: boolean;
    };
}
export declare class CloudConvertService {
    private convertBreaker;
    private mergePDFsBreaker;
    private compressPDFBreaker;
    private downloadBreaker;
    constructor();
    /**
     * Convert PDF to specified format using CloudConvert API (with circuit breaker)
     */
    convertFile(options: ConversionOptions): Promise<{
        success: boolean;
        outputPath?: string;
        jobId?: string;
        error?: string;
    }>;
    /**
     * Merge multiple PDFs into one (with circuit breaker)
     */
    mergePDFs(inputFiles: string[], outputPath: string): Promise<{
        success: boolean;
        outputPath?: string;
        jobId?: string;
        error?: string;
    }>;
    /**
     * Compress PDF file to reduce file size (with circuit breaker)
     */
    compressPDF(inputFilePath: string, outputFilePath: string, compressionLevel?: 'good' | 'recommended' | 'extreme'): Promise<{
        success: boolean;
        outputPath?: string;
        jobId?: string;
        originalSize?: number;
        compressedSize?: number;
        compressionRatio?: number;
        error?: string;
    }>;
    /**
     * Download converted file with timeout and retry logic (with circuit breaker)
     */
    downloadConvertedFile(outputUrl: string): Promise<Buffer>;
    /**
     * Internal convert method (wrapped by circuit breaker)
     */
    private _convertFileInternal;
    /**
     * Internal merge method (wrapped by circuit breaker)
     */
    private _mergePDFsInternal;
    /**
     * Map user-friendly compression levels to CloudConvert API profiles
     * @param level User-friendly compression level
     * @returns CloudConvert API profile value
     */
    private mapCompressionLevel;
    /**
     * Internal compress method (wrapped by circuit breaker)
     *
     * Compression Levels:
     * - 'good': Best quality, moderate compression (~20-30% reduction) - Uses CloudConvert 'print' profile
     * - 'recommended': Balanced quality & file size (~40-60% reduction) - Uses CloudConvert 'web' profile
     * - 'extreme': Maximum compression, lower quality (~60-80% reduction) - Uses CloudConvert 'max' profile
     */
    private _compressPDFInternal;
    /**
     * Internal download method (wrapped by circuit breaker)
     *
     * @param outputUrl - URL of the file to download
     * @returns Buffer containing the downloaded file
     */
    private _downloadFileInternal;
    /**
     * Get CloudConvert account information
     */
    getAccountInfo(): Promise<{
        success: boolean;
        credits?: number;
        email?: string;
        error?: string;
    }>;
    /**
     * Cancel a CloudConvert job
     * Note: CloudConvert SDK may not support job cancellation directly
     */
    cancelJob(jobId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get circuit breaker statistics for monitoring
     */
    getCircuitBreakerStats(): {
        convert: {
            fires: number;
            successes: number;
            failures: number;
            rejects: number;
            timeouts: number;
            fallbacks: number;
            state: "open" | "half-open" | "closed";
            isOpen: boolean;
            percentiles: {
                p50: number;
                p95: number;
                p99: number;
            };
        };
        merge: {
            fires: number;
            successes: number;
            failures: number;
            rejects: number;
            timeouts: number;
            fallbacks: number;
            state: "open" | "half-open" | "closed";
            isOpen: boolean;
            percentiles: {
                p50: number;
                p95: number;
                p99: number;
            };
        };
        compress: {
            fires: number;
            successes: number;
            failures: number;
            rejects: number;
            timeouts: number;
            fallbacks: number;
            state: "open" | "half-open" | "closed";
            isOpen: boolean;
            percentiles: {
                p50: number;
                p95: number;
                p99: number;
            };
        };
        download: {
            fires: number;
            successes: number;
            failures: number;
            rejects: number;
            timeouts: number;
            fallbacks: number;
            state: "open" | "half-open" | "closed";
            isOpen: boolean;
            percentiles: {
                p50: number;
                p95: number;
                p99: number;
            };
        };
    };
}
export declare const cloudConvertService: CloudConvertService;
//# sourceMappingURL=cloudconvert.service.d.ts.map