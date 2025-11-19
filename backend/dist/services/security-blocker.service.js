"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityBlockerService = void 0;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SecurityBlockerService {
    /**
     * Check failed login attempts and auto-block abusive IPs
     */
    static async checkAndBlockFailedLogins() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        try {
            // Query failed login attempts from last hour
            const results = await database_1.sequelize.query(`
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
                for (const record of rows) {
                    await this.blockIP(record.ip_address, 'excessive_failed_logins', record.failed_attempts);
                }
            }
            else {
                logger_1.default.debug('No failed login attempts above threshold');
            }
        }
        catch (error) {
            logger_1.default.error('Error checking failed logins:', error);
        }
    }
    /**
     * Check rate limit violations and block (if using Redis rate limiting)
     */
    static async checkAndBlockRateLimitAbuse() {
        try {
            // This would integrate with your existing rate limiting system
            // For now, it's a placeholder for future implementation
            logger_1.default.debug('Rate limit abuse check skipped (not yet implemented)');
        }
        catch (error) {
            logger_1.default.error('Error checking rate limit abuse:', error);
        }
    }
    /**
     * Block IP address using iptables (on Linux) or database tracking
     */
    static async blockIP(ipAddress, reason, violation_count) {
        try {
            // Check if already blocked
            const [existing] = await database_1.sequelize.query(`
        SELECT * FROM blocked_ips WHERE ip_address = ? AND expires_at > NOW()
      `, {
                replacements: [ipAddress],
                type: 'SELECT'
            });
            if (existing.length > 0) {
                logger_1.default.info(`IP ${ipAddress} already blocked`);
                return;
            }
            // Insert into blocked IPs table
            const expiresAt = new Date(Date.now() + this.BLOCK_DURATION_HOURS * 60 * 60 * 1000);
            await database_1.sequelize.query(`
        INSERT INTO blocked_ips (ip_address, reason, violation_count, blocked_at, expires_at)
        VALUES (?, ?, ?, NOW(), ?)
      `, {
                replacements: [ipAddress, reason, violation_count, expiresAt]
            });
            // Apply iptables rule (only on Linux)
            if (process.platform === 'linux') {
                try {
                    await execAsync(`sudo iptables -A INPUT -s ${ipAddress} -j DROP`);
                    logger_1.default.info(`IP ${ipAddress} blocked via iptables (reason: ${reason}, violations: ${violation_count})`);
                }
                catch (error) {
                    logger_1.default.error(`Failed to apply iptables rule for ${ipAddress}:`, error);
                }
            }
            else {
                logger_1.default.info(`IP ${ipAddress} blocked in database (iptables not available on ${process.platform})`);
            }
            // Log remediation action
            await database_1.sequelize.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('ip_block', ?, ?, 'success', NOW())
      `, {
                replacements: [ipAddress, `${reason} - ${violation_count} violations`]
            });
            logger_1.default.warn(`🚫 IP BLOCKED: ${ipAddress} (${reason}, ${violation_count} violations)`);
        }
        catch (error) {
            logger_1.default.error(`Failed to block IP ${ipAddress}:`, error);
        }
    }
    /**
     * Cleanup expired blocks
     */
    static async cleanupExpiredBlocks() {
        try {
            const [expiredBlocks] = await database_1.sequelize.query(`
        SELECT ip_address FROM blocked_ips WHERE expires_at < NOW()
      `);
            for (const block of expiredBlocks) {
                // Remove iptables rule (only on Linux)
                if (process.platform === 'linux') {
                    try {
                        await execAsync(`sudo iptables -D INPUT -s ${block.ip_address} -j DROP`);
                    }
                    catch (error) {
                        // Rule might not exist, ignore
                    }
                }
            }
            // Delete expired records
            const [result] = await database_1.sequelize.query(`DELETE FROM blocked_ips WHERE expires_at < NOW()`);
            if (expiredBlocks.length > 0) {
                logger_1.default.info(`Cleaned up ${expiredBlocks.length} expired IP blocks`);
            }
        }
        catch (error) {
            logger_1.default.error('Error cleaning up expired blocks:', error);
        }
    }
    /**
     * Check if IP is currently blocked
     */
    static async isIPBlocked(ipAddress) {
        try {
            const [results] = await database_1.sequelize.query(`
        SELECT * FROM blocked_ips WHERE ip_address = ? AND expires_at > NOW()
      `, {
                replacements: [ipAddress],
                type: 'SELECT'
            });
            return results.length > 0;
        }
        catch (error) {
            logger_1.default.error('Error checking if IP is blocked:', error);
            return false;
        }
    }
    /**
     * Log authentication attempt
     */
    static async logAuthAttempt(ipAddress, email, success, userAgent) {
        try {
            await database_1.sequelize.query(`
        INSERT INTO authentication_logs (ip_address, email, success, user_agent, timestamp)
        VALUES (?, ?, ?, ?, NOW())
      `, {
                replacements: [ipAddress, email, success, userAgent || null]
            });
        }
        catch (error) {
            logger_1.default.error('Error logging auth attempt:', error);
        }
    }
}
exports.SecurityBlockerService = SecurityBlockerService;
SecurityBlockerService.FAILED_LOGIN_THRESHOLD = 10; // 10 failed attempts
SecurityBlockerService.RATE_LIMIT_THRESHOLD = 100; // 100 requests per minute
SecurityBlockerService.BLOCK_DURATION_HOURS = 24;
exports.default = SecurityBlockerService;
//# sourceMappingURL=security-blocker.service.js.map