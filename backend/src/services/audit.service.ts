import { AdminAuditLog, AuditLogSeverity } from '../models/AdminAuditLog'
import crypto from 'crypto'

export interface AuditLogData {
  admin_user_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: object
  ip_address?: string
  user_agent?: string
  severity?: AuditLogSeverity
}

/**
 * Service for creating and managing audit logs
 */
export class AuditService {
  /**
   * Create an audit log entry
   */
  static async createLog(data: AuditLogData): Promise<AdminAuditLog> {
    try {
      // Calculate checksum for tamper detection (optional)
      const checksum = this.calculateChecksum(data)

      const log = await AdminAuditLog.create({
        ...data,
        severity: data.severity || AuditLogSeverity.INFO,
        checksum,
        created_at: new Date()
      })

      return log
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw - we don't want logging failures to break operations
      throw error
    }
  }

  /**
   * Create audit log asynchronously (non-blocking)
   */
  static async createLogAsync(data: AuditLogData): Promise<void> {
    setImmediate(async () => {
      try {
        await this.createLog(data)
      } catch (error) {
        console.error('Async audit log creation failed:', error)
      }
    })
  }

  /**
   * Calculate checksum for audit log entry
   * Used for tamper detection
   */
  private static calculateChecksum(data: AuditLogData): string {
    const content = JSON.stringify({
      admin_user_id: data.admin_user_id,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      changes: data.changes,
      timestamp: new Date().toISOString()
    })

    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Determine severity based on action type
   */
  static determineSeverity(method: string, path: string, entityType?: string): AuditLogSeverity {
    // Critical actions
    if (method === 'DELETE') {
      return AuditLogSeverity.CRITICAL
    }

    if (path.includes('/role') || entityType === 'role_change') {
      return AuditLogSeverity.CRITICAL
    }

    if (path.includes('/delete') || path.includes('/suspend')) {
      return AuditLogSeverity.CRITICAL
    }

    // Warning actions
    if (method === 'PUT' || method === 'PATCH') {
      return AuditLogSeverity.WARNING
    }

    if (path.includes('/plan') || path.includes('/quota')) {
      return AuditLogSeverity.WARNING
    }

    // Info actions (GET, POST for non-critical operations)
    return AuditLogSeverity.INFO
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param retentionDays Number of days to retain logs (default: 90)
   * @param criticalRetentionDays Number of days to retain critical logs (default: 365)
   */
  static async cleanupOldLogs(
    retentionDays: number = 90,
    criticalRetentionDays: number = 365
  ): Promise<{ deleted: number }> {
    try {
      const now = new Date()

      // Delete non-critical logs older than retention period
      const normalRetentionDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
      const normalDeleted = await AdminAuditLog.destroy({
        where: {
          created_at: {
            [require('sequelize').Op.lt]: normalRetentionDate
          },
          severity: {
            [require('sequelize').Op.in]: [AuditLogSeverity.INFO, AuditLogSeverity.WARNING]
          }
        }
      })

      // Delete critical logs older than critical retention period
      const criticalRetentionDate = new Date(now.getTime() - criticalRetentionDays * 24 * 60 * 60 * 1000)
      const criticalDeleted = await AdminAuditLog.destroy({
        where: {
          created_at: {
            [require('sequelize').Op.lt]: criticalRetentionDate
          },
          severity: AuditLogSeverity.CRITICAL
        }
      })

      const totalDeleted = normalDeleted + criticalDeleted

      console.log(`Audit log cleanup: Deleted ${totalDeleted} old logs (${normalDeleted} normal, ${criticalDeleted} critical)`)

      return { deleted: totalDeleted }
    } catch (error) {
      console.error('Audit log cleanup failed:', error)
      throw error
    }
  }
}
