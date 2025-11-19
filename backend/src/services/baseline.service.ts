import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import logger from '../config/logger';

interface BaselineMetrics {
  cpu_mean: number;
  cpu_stddev: number;
  memory_mean: number;
  memory_stddev: number;
  disk_mean: number;
  disk_stddev: number;
  response_time_mean: number;
  response_time_stddev: number;
  last_updated: Date;
}

export class BaselineService {
  /**
   * Calculate 7-day baseline from resource_metrics table
   * Updates every 24 hours
   */
  static async calculateBaseline(): Promise<BaselineMetrics> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Query resource_metrics for last 7 days
      const [results] = await sequelize.query(`
        SELECT
          AVG(cpu_percent) as cpu_mean,
          STDDEV(cpu_percent) as cpu_stddev,
          AVG(memory_percent) as memory_mean,
          STDDEV(memory_percent) as memory_stddev,
          AVG(disk_percent) as disk_mean,
          STDDEV(disk_percent) as disk_stddev
        FROM resource_metrics
        WHERE timestamp >= :sevenDaysAgo
      `, {
        replacements: { sevenDaysAgo },
        type: 'SELECT'
      });

      const baseline = results[0] as any;

      // Store in monitoring_baseline table
      await sequelize.query(`
        INSERT INTO monitoring_baseline (
          id,
          cpu_mean, cpu_stddev,
          memory_mean, memory_stddev,
          disk_mean, disk_stddev,
          response_time_mean, response_time_stddev,
          last_updated
        ) VALUES (1, ?, ?, ?, ?, ?, ?, 0, 0, NOW())
        ON DUPLICATE KEY UPDATE
          cpu_mean = VALUES(cpu_mean),
          cpu_stddev = VALUES(cpu_stddev),
          memory_mean = VALUES(memory_mean),
          memory_stddev = VALUES(memory_stddev),
          disk_mean = VALUES(disk_mean),
          disk_stddev = VALUES(disk_stddev),
          last_updated = NOW()
      `, {
        replacements: [
          baseline.cpu_mean || 0,
          baseline.cpu_stddev || 1,
          baseline.memory_mean || 0,
          baseline.memory_stddev || 1,
          baseline.disk_mean || 0,
          baseline.disk_stddev || 1
        ]
      });

      logger.info('Baseline calculated successfully', {
        cpu: `${baseline.cpu_mean?.toFixed(1)}% ± ${baseline.cpu_stddev?.toFixed(1)}%`,
        memory: `${baseline.memory_mean?.toFixed(1)}% ± ${baseline.memory_stddev?.toFixed(1)}%`,
        disk: `${baseline.disk_mean?.toFixed(1)}% ± ${baseline.disk_stddev?.toFixed(1)}%`
      });

      return baseline;
    } catch (error) {
      logger.error('Baseline calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get current baseline
   */
  static async getBaseline(): Promise<BaselineMetrics | null> {
    try {
      const [results] = await sequelize.query(`
        SELECT * FROM monitoring_baseline ORDER BY last_updated DESC LIMIT 1
      `);

      return results[0] as BaselineMetrics || null;
    } catch (error) {
      logger.error('Get baseline error:', error);
      return null;
    }
  }

  /**
   * Detect if current metric is anomalous (>2 standard deviations)
   */
  static async detectAnomaly(metricName: string, currentValue: number): Promise<{
    isAnomaly: boolean;
    zScore: number;
    severity: 'normal' | 'warning' | 'critical';
  }> {
    const baseline = await this.getBaseline();
    if (!baseline) {
      return { isAnomaly: false, zScore: 0, severity: 'normal' };
    }

    const mean = (baseline as any)[`${metricName}_mean`];
    const stddev = (baseline as any)[`${metricName}_stddev`];

    if (!stddev || stddev === 0) {
      return { isAnomaly: false, zScore: 0, severity: 'normal' };
    }

    const zScore = (currentValue - mean) / stddev;

    return {
      isAnomaly: Math.abs(zScore) > 2,
      zScore,
      severity: Math.abs(zScore) > 3 ? 'critical' : Math.abs(zScore) > 2 ? 'warning' : 'normal'
    };
  }
}
