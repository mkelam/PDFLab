import { Model, Optional } from 'sequelize';
export declare enum BatchOperationType {
    CONVERT = "convert",
    COMPRESS = "compress",
    MERGE = "merge"
}
export declare enum BatchStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    PARTIAL = "partial",// Some files succeeded, some failed
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface BatchOptions {
    output_format?: 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg';
    compression_level?: 'good' | 'recommended' | 'extreme';
}
interface BatchJobAttributes {
    id: string;
    user_id: string;
    batch_name: string;
    operation_type: BatchOperationType;
    total_files: number;
    completed_files: number;
    failed_files: number;
    status: BatchStatus;
    progress: number;
    conversion_job_ids: string[];
    zip_file_path?: string;
    total_size: number;
    options: BatchOptions;
    error_message?: string;
    processing_started_at?: Date;
    processing_completed_at?: Date;
    created_at: Date;
    updated_at: Date;
    expires_at: Date;
}
interface BatchJobCreationAttributes extends Optional<BatchJobAttributes, 'id' | 'created_at' | 'updated_at' | 'progress' | 'status' | 'completed_files' | 'failed_files'> {
}
export declare class BatchJob extends Model<BatchJobAttributes, BatchJobCreationAttributes> implements BatchJobAttributes {
    id: string;
    user_id: string;
    batch_name: string;
    operation_type: BatchOperationType;
    total_files: number;
    completed_files: number;
    failed_files: number;
    status: BatchStatus;
    progress: number;
    conversion_job_ids: string[];
    zip_file_path?: string;
    total_size: number;
    options: BatchOptions;
    error_message?: string;
    processing_started_at?: Date;
    processing_completed_at?: Date;
    readonly created_at: Date;
    readonly updated_at: Date;
    expires_at: Date;
    getProcessingTime(): number | null;
    isExpired(): boolean;
    isComplete(): boolean;
    canCancel(): boolean;
    updateProgress(): void;
    getSuccessRate(): number;
    getFailureRate(): number;
}
export {};
//# sourceMappingURL=BatchJob.d.ts.map