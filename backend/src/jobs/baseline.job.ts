import cron from 'node-cron';
import { BaselineService } from '../services/baseline.service';
import logger from '../config/logger';

/**
 * Baseline Calculation Cron Job
 * Runs daily at 2:00 AM to update 7-day performance baseline
 */
export const startBaselineCalculation = () => {
  // Update baseline every 24 hours at 2am
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting baseline calculation...');
      const baseline = await BaselineService.calculateBaseline();
      logger.info('Baseline updated successfully', baseline);
    } catch (error) {
      logger.error('Baseline calculation failed:', error);
    }
  });

  logger.info('✅ Baseline calculation cron job started (daily at 2:00 AM)');
};
