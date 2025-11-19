import cron from 'node-cron';
import SecurityBlockerService from '../services/security-blocker.service';
import logger from '../config/logger';

/**
 * Security Blocker Cron Job
 * Runs every 5 minutes to check for abusive IPs and cleanup expired blocks
 */
export const startSecurityBlockerCron = () => {
  // Check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.debug('Starting security blocker check...');

      await SecurityBlockerService.checkAndBlockFailedLogins();
      await SecurityBlockerService.checkAndBlockRateLimitAbuse();
      await SecurityBlockerService.cleanupExpiredBlocks();

      logger.debug('Security blocker check completed');
    } catch (error) {
      logger.error('Security blocker cron error:', error);
    }
  });

  logger.info('✅ Security blocker cron job started (every 5 minutes)');
};
