import { Model, Optional } from 'sequelize';
export declare enum HealthStatus {
    HEALTHY = "healthy",
    WARNING = "warning",
    CRITICAL = "critical"
}
interface SystemHealthLogAttributes {
    id: string;
    metric_name: string;
    metric_value?: number;
    status: HealthStatus;
    details?: object;
    created_at: Date;
}
interface SystemHealthLogCreationAttributes extends Optional<SystemHealthLogAttributes, 'id' | 'created_at'> {
}
export declare class SystemHealthLog extends Model<SystemHealthLogAttributes, SystemHealthLogCreationAttributes> implements SystemHealthLogAttributes {
    id: string;
    metric_name: string;
    metric_value?: number;
    status: HealthStatus;
    details?: object;
    readonly created_at: Date;
}
export {};
//# sourceMappingURL=SystemHealthLog.d.ts.map