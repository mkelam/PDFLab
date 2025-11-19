"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaselineService = void 0;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
class BaselineService {
    /**
     * Calculate 7-day baseline from resource_metrics table
     * Updates every 24 hours
     */
    static async calculateBaseline() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        try {
            // Query resource_metrics for last 7 days
            const [results] = await database_1.sequelize.query(`
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
            const baseline = results[0];
            // Store in monitoring_baseline table
            await database_1.sequelize.query(`
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
            logger_1.default.info('Baseline calculated successfully', {
                cpu: `${baseline.cpu_mean?.toFixed(1)}% ± ${baseline.cpu_stddev?.toFixed(1)}%`,
                memory: `${baseline.memory_mean?.toFixed(1)}% ± ${baseline.memory_stddev?.toFixed(1)}%`,
                disk: `${baseline.disk_mean?.toFixed(1)}% ± ${baseline.disk_stddev?.toFixed(1)}%`
            });
            return baseline;
        }
        catch (error) {
            logger_1.default.error('Baseline calculation failed:', error);
            throw error;
        }
    }
    /**
     * Get current baseline
     */
    static async getBaseline() {
        try {
            const [results] = await database_1.sequelize.query(`
        SELECT * FROM monitoring_baseline ORDER BY last_updated DESC LIMIT 1
      `);
            return results[0] || null;
        }
        catch (error) {
            logger_1.default.error('Get baseline error:', error);
            return null;
        }
    }
    /**
     * Detect if current metric is anomalous (>2 standard deviations)
     */
    static async detectAnomaly(metricName, currentValue) {
        const baseline = await this.getBaseline();
        if (!baseline) {
            return { isAnomaly: false, zScore: 0, severity: 'normal' };
        }
        const mean = baseline[`${metricName}_mean`];
        const stddev = baseline[`${metricName}_stddev`];
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
exports.BaselineService = BaselineService;
//# sourceMappingURL=baseline.service.js.map