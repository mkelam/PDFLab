/**
 * Conversion Funnel Metrics
 *
 * Tracks user journey through the conversion flow:
 * 1. Upload initiated
 * 2. File validated
 * 3. Job queued
 * 4. Processing started
 * 5. Processing completed
 * 6. Download initiated
 * 7. Download completed
 *
 * Measures drop-off rates at each stage to identify bottlenecks
 */
import { Counter, Histogram, Gauge } from 'prom-client';
/**
 * Track each stage of the conversion funnel
 */
export declare const conversionFunnelStage: Counter<"plan" | "conversion_type" | "stage" | "user_type">;
/**
 * Track funnel drop-offs (failures at each stage)
 */
export declare const conversionFunnelDropoff: Counter<"plan" | "reason" | "conversion_type" | "stage" | "user_type">;
/**
 * Time spent in each funnel stage
 */
export declare const conversionFunnelDuration: Histogram<"conversion_type" | "stage" | "user_type">;
/**
 * Current active conversions in each stage
 */
export declare const conversionFunnelActive: Gauge<"conversion_type" | "stage" | "user_type">;
/**
 * Overall conversion success rate
 */
export declare const conversionSuccess: Counter<"plan" | "output_format" | "conversion_type" | "user_type">;
/**
 * Overall conversion failure rate
 */
export declare const conversionFailure: Counter<"plan" | "error_code" | "conversion_type" | "user_type" | "failure_reason">;
/**
 * End-to-end conversion duration (upload to download)
 */
export declare const conversionE2EDuration: Histogram<"conversion_type" | "user_type" | "file_size_bucket">;
/**
 * Distribution of uploaded file sizes
 */
export declare const uploadedFileSizes: Histogram<"plan" | "conversion_type" | "user_type">;
/**
 * Track which conversion formats are most popular
 */
export declare const conversionFormatPopularity: Counter<"plan" | "user_type" | "source_format" | "target_format">;
export declare enum FunnelStage {
    UPLOAD_INITIATED = "upload_initiated",
    FILE_VALIDATED = "file_validated",
    JOB_QUEUED = "job_queued",
    PROCESSING_STARTED = "processing_started",
    PROCESSING_COMPLETED = "processing_completed",
    DOWNLOAD_INITIATED = "download_initiated",
    DOWNLOAD_COMPLETED = "download_completed"
}
/**
 * Track funnel stage progression
 */
export declare function trackFunnelStage(stage: FunnelStage, conversionType: string, user?: any, guestSession?: any): void;
/**
 * Track funnel drop-off (failure)
 */
export declare function trackFunnelDropoff(stage: FunnelStage, reason: string, conversionType: string, user?: any, guestSession?: any): void;
/**
 * Track funnel stage duration
 */
export declare function trackFunnelDuration(stage: FunnelStage, durationSeconds: number, conversionType: string, user?: any, guestSession?: any): void;
/**
 * Update active conversions gauge
 */
export declare function updateActiveFunnelStage(stage: FunnelStage, delta: number, conversionType: string, user?: any, guestSession?: any): void;
/**
 * Track successful conversion
 */
export declare function trackConversionSuccess(conversionType: string, outputFormat: string, user?: any, guestSession?: any): void;
/**
 * Track failed conversion
 */
export declare function trackConversionFailure(conversionType: string, failureReason: string, errorCode: string, user?: any, guestSession?: any): void;
/**
 * Track end-to-end conversion duration
 */
export declare function trackE2EDuration(conversionType: string, durationSeconds: number, fileSizeBytes: number, user?: any, guestSession?: any): void;
/**
 * Track uploaded file size
 */
export declare function trackUploadedFileSize(conversionType: string, fileSizeBytes: number, user?: any, guestSession?: any): void;
/**
 * Track conversion format popularity
 */
export declare function trackFormatPopularity(sourceFormat: string, targetFormat: string, user?: any, guestSession?: any): void;
/**
 * Calculate funnel drop-off rate between two stages
 * This is typically done in Grafana queries, but provided here for reference
 */
export declare function calculateDropoffRate(stage1Count: number, stage2Count: number): number;
/**
 * Get funnel completion rate
 */
export declare function calculateCompletionRate(initiatedCount: number, completedCount: number): number;
//# sourceMappingURL=conversion-funnel.metrics.d.ts.map