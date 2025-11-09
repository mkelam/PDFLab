import { Model, Optional } from 'sequelize';
export declare enum AuditLogSeverity {
    INFO = "info",
    WARNING = "warning",
    CRITICAL = "critical"
}
interface AdminAuditLogAttributes {
    id: string;
    admin_user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    changes?: object;
    ip_address?: string;
    user_agent?: string;
    severity: AuditLogSeverity;
    checksum?: string;
    created_at: Date;
}
interface AdminAuditLogCreationAttributes extends Optional<AdminAuditLogAttributes, 'id' | 'created_at'> {
}
export declare class AdminAuditLog extends Model<AdminAuditLogAttributes, AdminAuditLogCreationAttributes> implements AdminAuditLogAttributes {
    id: string;
    admin_user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    changes?: object;
    ip_address?: string;
    user_agent?: string;
    severity: AuditLogSeverity;
    checksum?: string;
    readonly created_at: Date;
}
export {};
//# sourceMappingURL=AdminAuditLog.d.ts.map