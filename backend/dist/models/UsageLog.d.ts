import { Model, Optional } from 'sequelize';
interface UsageLogAttributes {
    id: number;
    user_id: string;
    job_id?: string;
    operation_type: string;
    success: boolean;
    processing_time?: number;
    file_size: number;
    error_code?: string;
    timestamp: Date;
}
interface UsageLogCreationAttributes extends Optional<UsageLogAttributes, 'id' | 'timestamp'> {
}
export declare class UsageLog extends Model<UsageLogAttributes, UsageLogCreationAttributes> implements UsageLogAttributes {
    id: number;
    user_id: string;
    job_id?: string;
    operation_type: string;
    success: boolean;
    processing_time?: number;
    file_size: number;
    error_code?: string;
    readonly timestamp: Date;
}
export {};
//# sourceMappingURL=UsageLog.d.ts.map