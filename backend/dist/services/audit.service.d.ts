import { AdminAuditLog, AuditLogSeverity } from '../models/AdminAuditLog';
export interface AuditLogData {
    admin_user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    changes?: object;
    ip_address?: string;
    user_agent?: string;
    severity?: AuditLogSeverity;
}
/**
 * Service for creating and managing audit logs
 */
export declare class AuditService {
    /**
     * Create an audit log entry
     */
    static createLog(data: AuditLogData): Promise<AdminAuditLog>;
    /**
     * Create audit log asynchronously (non-blocking)
     */
    static createLogAsync(data: AuditLogData): Promise<void>;
    /**
     * Calculate checksum for audit log entry
     * Used for tamper detection
     */
    private static calculateChecksum;
    /**
     * Determine severity based on action type
     */
    static determineSeverity(method: string, path: string, entityType?: string): AuditLogSeverity;
    /**
     * Clean up old audit logs based on retention policy
     * @param retentionDays Number of days to retain logs (default: 90)
     * @param criticalRetentionDays Number of days to retain critical logs (default: 365)
     */
    static cleanupOldLogs(retentionDays?: number, criticalRetentionDays?: number): Promise<{
        deleted: number;
    }>;
}
//# sourceMappingURL=audit.service.d.ts.map