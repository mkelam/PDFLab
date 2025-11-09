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
    /**
     * Convert PDF to specified format using CloudConvert API
     */
    convertFile(options: ConversionOptions): Promise<{
        success: boolean;
        outputPath?: string;
        jobId?: string;
        error?: string;
    }>;
    /**
     * Merge multiple PDFs into one
     */
    mergePDFs(inputFiles: string[], outputPath: string): Promise<{
        success: boolean;
        outputPath?: string;
        jobId?: string;
        error?: string;
    }>;
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
}
export declare const cloudConvertService: CloudConvertService;
//# sourceMappingURL=cloudconvert.service.d.ts.map