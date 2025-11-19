import cron from 'node-cron';
import DailyReportService from '../services/daily-report.service';
import logger from '../config/logger';

/**
 * Daily Report Cron Job
 * Sends comprehensive daily digest email at 9:00 AM
 */
export const startDailyReportCron = () => {
  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Starting daily report generation...');
      await DailyReportService.generateAndSendReport();
    } catch (error) {
      logger.error('Daily report generation failed:', error);
    }
  });

  logger.info('✅ Daily report cron job started (9:00 AM daily)');
};
