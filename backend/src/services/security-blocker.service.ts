import { sequelize } from '../config/database';
import logger from '../config/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SecurityBlockerService {
  private static FAILED_LOGIN_THRESHOLD = 10; // 10 failed attempts
  private static RATE_LIMIT_THRESHOLD = 100; // 100 requests per minute
  private static BLOCK_DURATION_HOURS = 24;

  /**
   * Check failed login attempts and auto-block abusive IPs
   */
  static async checkAndBlockFailedLogins(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      // Query failed login attempts from last hour
      const results = await sequelize.query(`
        SELECT
          ip_address,
          COUNT(*) as failed_attempts,
          MAX(email) as last_email
        FROM authentication_logs
        WHERE
          success = FALSE
          AND timestamp >= ?
        GROUP BY ip_address
        HAVING failed_attempts >= ?
      `, {
        replacements: [oneHourAgo, this.FAILED_LOGIN_THRESHOLD],
        type: 'SELECT'
      });

      // When type: 'SELECT', Sequelize returns [rows, metadata]
      // Access the first element which is the rows array
      const rows = Array.isArray(results) && results.length > 0 ? results[0] : results;

      if (Array.isArray(rows) && rows.length > 0) {
        for (const record of rows as any[]) {
          await this.blockIP(record.ip_address, 'excessive_failed_logins', record.failed_attempts);
        }
      } else {
        logger.debug('No failed login attempts above threshold');
      }
    } catch (error) {
      logger.error('Error checking failed logins:', error);
    }
  }

  /**
   * Check rate limit violations and block (if using Redis rate limiting)
   */
  static async checkAndBlockRateLimitAbuse(): Promise<void> {
    try {
      // This would integrate with your existing rate limiting system
      // For now, it's a placeholder for future implementation
      logger.debug('Rate limit abuse check skipped (not yet implemented)');
    } catch (error) {
      logger.error('Error checking rate limit abuse:', error);
    }
  }

  /**
   * Block IP address using iptables (on Linux) or database tracking
   */
  private static async blockIP(ipAddress: string, reason: string, violation_count: number): Promise<void> {
    try {
      // Check if already blocked
      const [existing] = await sequelize.query(`
        SELECT * FROM blocked_ips WHERE ip_address = ? AND expires_at > NOW()
      `, {
        replacements: [ipAddress],
        type: 'SELECT'
      });

      if (existing.length > 0) {
        logger.info(`IP ${ipAddress} already blocked`);
        return;
      }

      // Insert into blocked IPs table
      const expiresAt = new Date(Date.now() + this.BLOCK_DURATION_HOURS * 60 * 60 * 1000);

      await sequelize.query(`
        INSERT INTO blocked_ips (ip_address, reason, violation_count, blocked_at, expires_at)
        VALUES (?, ?, ?, NOW(), ?)
      `, {
        replacements: [ipAddress, reason, violation_count, expiresAt]
      });

      // Apply iptables rule (only on Linux)
      if (process.platform === 'linux') {
        try {
          await execAsync(`sudo iptables -A INPUT -s ${ipAddress} -j DROP`);
          logger.info(`IP ${ipAddress} blocked via iptables (reason: ${reason}, violations: ${violation_count})`);
        } catch (error) {
          logger.error(`Failed to apply iptables rule for ${ipAddress}:`, error);
        }
      } else {
        logger.info(`IP ${ipAddress} blocked in database (iptables not available on ${process.platform})`);
      }

      // Log remediation action
      await sequelize.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('ip_block', ?, ?, 'success', NOW())
      `, {
        replacements: [ipAddress, `${reason} - ${violation_count} violations`]
      });

      logger.warn(`🚫 IP BLOCKED: ${ipAddress} (${reason}, ${violation_count} violations)`);
    } catch (error) {
      logger.error(`Failed to block IP ${ipAddress}:`, error);
    }
  }

  /**
   * Cleanup expired blocks
   */
  static async cleanupExpiredBlocks(): Promise<void> {
    try {
      const [expiredBlocks] = await sequelize.query(`
        SELECT ip_address FROM blocked_ips WHERE expires_at < NOW()
      `);

      for (const block of expiredBlocks as any[]) {
        // Remove iptables rule (only on Linux)
        if (process.platform === 'linux') {
          try {
            await execAsync(`sudo iptables -D INPUT -s ${block.ip_address} -j DROP`);
          } catch (error) {
            // Rule might not exist, ignore
          }
        }
      }

      // Delete expired records
      const [result] = await sequelize.query(`DELETE FROM blocked_ips WHERE expires_at < NOW()`);

      if ((expiredBlocks as any[]).length > 0) {
        logger.info(`Cleaned up ${(expiredBlocks as any[]).length} expired IP blocks`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired blocks:', error);
    }
  }

  /**
   * Check if IP is currently blocked
   */
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const [results] = await sequelize.query(`
        SELECT * FROM blocked_ips WHERE ip_address = ? AND expires_at > NOW()
      `, {
        replacements: [ipAddress],
        type: 'SELECT'
      });

      return results.length > 0;
    } catch (error) {
      logger.error('Error checking if IP is blocked:', error);
      return false;
    }
  }

  /**
   * Log authentication attempt
   */
  static async logAuthAttempt(ipAddress: string, email: string, success: boolean, userAgent?: string): Promise<void> {
    try {
      await sequelize.query(`
        INSERT INTO authentication_logs (ip_address, email, success, user_agent, timestamp)
        VALUES (?, ?, ?, ?, NOW())
      `, {
        replacements: [ipAddress, email, success, userAgent || null]
      });
    } catch (error) {
      logger.error('Error logging auth attempt:', error);
    }
  }
}

export default SecurityBlockerService;
