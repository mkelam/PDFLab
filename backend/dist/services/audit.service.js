"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const AdminAuditLog_1 = require("../models/AdminAuditLog");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Service for creating and managing audit logs
 */
class AuditService {
    /**
     * Create an audit log entry
     */
    static async createLog(data) {
        try {
            // Calculate checksum for tamper detection (optional)
            const checksum = this.calculateChecksum(data);
            const log = await AdminAuditLog_1.AdminAuditLog.create({
                ...data,
                severity: data.severity || AdminAuditLog_1.AuditLogSeverity.INFO,
                checksum,
                created_at: new Date()
            });
            return log;
        }
        catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw - we don't want logging failures to break operations
            throw error;
        }
    }
    /**
     * Create audit log asynchronously (non-blocking)
     */
    static async createLogAsync(data) {
        setImmediate(async () => {
            try {
                await this.createLog(data);
            }
            catch (error) {
                console.error('Async audit log creation failed:', error);
            }
        });
    }
    /**
     * Calculate checksum for audit log entry
     * Used for tamper detection
     */
    static calculateChecksum(data) {
        const content = JSON.stringify({
            admin_user_id: data.admin_user_id,
            action: data.action,
            entity_type: data.entity_type,
            entity_id: data.entity_id,
            changes: data.changes,
            timestamp: new Date().toISOString()
        });
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Determine severity based on action type
     */
    static determineSeverity(method, path, entityType) {
        // Critical actions
        if (method === 'DELETE') {
            return AdminAuditLog_1.AuditLogSeverity.CRITICAL;
        }
        if (path.includes('/role') || entityType === 'role_change') {
            return AdminAuditLog_1.AuditLogSeverity.CRITICAL;
        }
        if (path.includes('/delete') || path.includes('/suspend')) {
            return AdminAuditLog_1.AuditLogSeverity.CRITICAL;
        }
        // Warning actions
        if (method === 'PUT' || method === 'PATCH') {
            return AdminAuditLog_1.AuditLogSeverity.WARNING;
        }
        if (path.includes('/plan') || path.includes('/quota')) {
            return AdminAuditLog_1.AuditLogSeverity.WARNING;
        }
        // Info actions (GET, POST for non-critical operations)
        return AdminAuditLog_1.AuditLogSeverity.INFO;
    }
    /**
     * Clean up old audit logs based on retention policy
     * @param retentionDays Number of days to retain logs (default: 90)
     * @param criticalRetentionDays Number of days to retain critical logs (default: 365)
     */
    static async cleanupOldLogs(retentionDays = 90, criticalRetentionDays = 365) {
        try {
            const now = new Date();
            // Delete non-critical logs older than retention period
            const normalRetentionDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
            const normalDeleted = await AdminAuditLog_1.AdminAuditLog.destroy({
                where: {
                    created_at: {
                        [require('sequelize').Op.lt]: normalRetentionDate
                    },
                    severity: {
                        [require('sequelize').Op.in]: [AdminAuditLog_1.AuditLogSeverity.INFO, AdminAuditLog_1.AuditLogSeverity.WARNING]
                    }
                }
            });
            // Delete critical logs older than critical retention period
            const criticalRetentionDate = new Date(now.getTime() - criticalRetentionDays * 24 * 60 * 60 * 1000);
            const criticalDeleted = await AdminAuditLog_1.AdminAuditLog.destroy({
                where: {
                    created_at: {
                        [require('sequelize').Op.lt]: criticalRetentionDate
                    },
                    severity: AdminAuditLog_1.AuditLogSeverity.CRITICAL
                }
            });
            const totalDeleted = normalDeleted + criticalDeleted;
            console.log(`Audit log cleanup: Deleted ${totalDeleted} old logs (${normalDeleted} normal, ${criticalDeleted} critical)`);
            return { deleted: totalDeleted };
        }
        catch (error) {
            console.error('Audit log cleanup failed:', error);
            throw error;
        }
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=audit.service.js.map