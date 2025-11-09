import { Model, Optional } from 'sequelize';
export declare enum ConversionType {
    PDF_TO_PPTX = "pdf_to_pptx",
    PDF_TO_DOCX = "pdf_to_docx",
    PDF_TO_XLSX = "pdf_to_xlsx",
    PDF_TO_IMAGES = "pdf_to_images",
    PDF_MERGE = "pdf_merge"
}
export declare enum JobStatus {
    PENDING = "pending",
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
interface ConversionJobAttributes {
    id: string;
    user_id: string | null;
    type: ConversionType;
    status: JobStatus;
    progress: number;
    input_file?: string;
    output_file?: string;
    file_name: string;
    file_size: number;
    cloudconvert_job_id?: string;
    error_message?: string;
    estimated_time?: number;
    processing_started_at?: Date;
    processing_completed_at?: Date;
    created_at: Date;
    updated_at: Date;
    expires_at: Date;
}
interface ConversionJobCreationAttributes extends Optional<ConversionJobAttributes, 'id' | 'created_at' | 'updated_at' | 'progress' | 'status'> {
}
export declare class ConversionJob extends Model<ConversionJobAttributes, ConversionJobCreationAttributes> implements ConversionJobAttributes {
    id: string;
    user_id: string | null;
    type: ConversionType;
    status: JobStatus;
    progress: number;
    input_file?: string;
    output_file?: string;
    file_name: string;
    file_size: number;
    cloudconvert_job_id?: string;
    error_message?: string;
    estimated_time?: number;
    processing_started_at?: Date;
    processing_completed_at?: Date;
    readonly created_at: Date;
    readonly updated_at: Date;
    expires_at: Date;
    getProcessingTime(): number | null;
    isExpired(): boolean;
    getOutputFormat(): string;
}
export {};
//# sourceMappingURL=ConversionJob.d.ts.map