"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSecurityBlockerCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const security_blocker_service_1 = __importDefault(require("../services/security-blocker.service"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Security Blocker Cron Job
 * Runs every 5 minutes to check for abusive IPs and cleanup expired blocks
 */
const startSecurityBlockerCron = () => {
    // Check every 5 minutes
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        try {
            logger_1.default.debug('Starting security blocker check...');
            await security_blocker_service_1.default.checkAndBlockFailedLogins();
            await security_blocker_service_1.default.checkAndBlockRateLimitAbuse();
            await security_blocker_service_1.default.cleanupExpiredBlocks();
            logger_1.default.debug('Security blocker check completed');
        }
        catch (error) {
            logger_1.default.error('Security blocker cron error:', error);
        }
    });
    logger_1.default.info('✅ Security blocker cron job started (every 5 minutes)');
};
exports.startSecurityBlockerCron = startSecurityBlockerCron;
//# sourceMappingURL=security-blocker.job.js.map