import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../config/logger';
import { sequelize } from '../config/database';

const execAsync = promisify(exec);

export class ServiceManagementController {
  /**
   * Get status of all Docker services
   */
  async getServicesStatus(req: Request, res: Response): Promise<void> {
    try {
      const { stdout } = await execAsync('docker ps --format "{{.Names}}|{{.Status}}|{{.State}}" --filter "name=pdflab"');

      const services = stdout.trim().split('\n').filter(line => line).map(line => {
        const [name, status, state] = line.split('|');
        return {
          name,
          status,
          state,
          healthy: status.includes('healthy') || state === 'running'
        };
      });

      res.json({ services });
    } catch (error: any) {
      logger.error('Get services status error:', error);
      res.status(500).json({ error: 'Failed to fetch service status' });
    }
  }

  /**
   * Restart a specific service
   */
  async restartService(req: Request, res: Response): Promise<void> {
    const { serviceName } = req.body;

    // Whitelist allowed services
    const allowedServices = [
      'pdflab-backend-prod',
      'pdflab-frontend-prod',
      'pdflab-mysql-prod',
      'pdflab-redis-prod',
      'pdflab-nginx-prod',
      'pdflab-partners-prod'
    ];

    if (!allowedServices.includes(serviceName)) {
      res.status(400).json({ error: 'Invalid service name' });
      return;
    }

    try {
      logger.info(`Manual restart requested for ${serviceName} by admin`);

      // Log action to database
      await sequelize.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('restart', ?, 'Manual admin restart', 'in_progress', NOW())
      `, { replacements: [serviceName] });

      // Execute restart
      await execAsync(`docker restart ${serviceName}`);

      // Wait 5 seconds for restart
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify restart
      const { stdout } = await execAsync(`docker ps --filter "name=${serviceName}" --format "{{.Status}}"`);
      const isHealthy = stdout.includes('healthy') || stdout.includes('Up');

      // Update log
      await sequelize.query(`
        UPDATE remediation_log
        SET status = ?
        WHERE action_type = 'restart' AND target = ?
        ORDER BY timestamp DESC LIMIT 1
      `, { replacements: [isHealthy ? 'success' : 'failed', serviceName] });

      res.json({
        success: isHealthy,
        message: isHealthy
          ? `${serviceName} restarted successfully`
          : `${serviceName} restart attempted but may not be healthy`,
        status: stdout.trim()
      });

      logger.info(`${serviceName} restart completed - ${isHealthy ? 'success' : 'failed'}`);
    } catch (error: any) {
      logger.error(`Restart ${serviceName} failed:`, error);
      res.status(500).json({ error: 'Restart failed', details: error.message });
    }
  }

  /**
   * Clear Redis cache
   */
  async clearRedisCache(req: Request, res: Response): Promise<void> {
    const { pattern = '*' } = req.body;

    try {
      logger.info(`Manual Redis cache clear requested (pattern: ${pattern})`);

      await sequelize.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('cache_clear', 'redis', 'Manual admin cache clear', 'in_progress', NOW())
      `);

      if (pattern === '*') {
        // Clear all cache
        await execAsync('docker exec pdflab-redis-prod redis-cli FLUSHALL');
      } else {
        // Clear specific pattern
        await execAsync(`docker exec pdflab-redis-prod redis-cli --scan --pattern "${pattern}" | xargs -r docker exec -i pdflab-redis-prod redis-cli DEL`);
      }

      await sequelize.query(`
        UPDATE remediation_log
        SET status = 'success'
        WHERE action_type = 'cache_clear' AND target = 'redis'
        ORDER BY timestamp DESC LIMIT 1
      `);

      res.json({
        success: true,
        message: `Redis cache cleared (pattern: ${pattern})`
      });

      logger.info(`Redis cache cleared successfully`);
    } catch (error: any) {
      logger.error('Clear Redis cache failed:', error);
      res.status(500).json({ error: 'Cache clear failed', details: error.message });
    }
  }

  /**
   * Run disk cleanup manually
   */
  async runDiskCleanup(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual disk cleanup requested by admin');

      await sequelize.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('disk_cleanup', 'root_volume', 'Manual admin cleanup', 'in_progress', NOW())
      `);

      // Get disk usage before
      const { stdout: beforeUsage } = await execAsync('df / | awk \'NR==2 {print $5}\' | sed \'s/%//\'');
      const before = parseInt(beforeUsage.trim());

      // Execute cleanup
      await execAsync('docker system prune -af --volumes --filter "until=72h"');
      await execAsync('find /var/log -name "*.log" -mtime +7 -exec gzip {} \\;');
      await execAsync('find /var/pdflab/app/backend/storage/uploads -type f -mtime +1 -delete');

      // Get disk usage after
      const { stdout: afterUsage } = await execAsync('df / | awk \'NR==2 {print $5}\' | sed \'s/%//\'');
      const after = parseInt(afterUsage.trim());

      await sequelize.query(`
        UPDATE remediation_log
        SET status = 'success', metrics_before = ?, metrics_after = ?
        WHERE action_type = 'disk_cleanup' AND target = 'root_volume'
        ORDER BY timestamp DESC LIMIT 1
      `, { replacements: [JSON.stringify({ disk_percent: before }), JSON.stringify({ disk_percent: after })] });

      res.json({
        success: true,
        message: `Disk cleanup completed`,
        before: `${before}%`,
        after: `${after}%`,
        freed: `${before - after}%`
      });

      logger.info(`Disk cleanup completed: ${before}% → ${after}%`);
    } catch (error: any) {
      logger.error('Disk cleanup failed:', error);
      res.status(500).json({ error: 'Disk cleanup failed', details: error.message });
    }
  }

  /**
   * Optimize database tables
   */
  async optimizeDatabase(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual database optimization requested by admin');

      await sequelize.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('db_optimize', 'mysql', 'Manual admin optimization', 'in_progress', NOW())
      `);

      // Get list of tables
      const [tables] = await sequelize.query('SHOW TABLES', { type: 'SELECT' });
      const tableNames = tables.map((t: any) => Object.values(t)[0]);

      // Optimize each table
      for (const table of tableNames) {
        await sequelize.query(`OPTIMIZE TABLE ${table}`);
      }

      await sequelize.query(`
        UPDATE remediation_log
        SET status = 'success'
        WHERE action_type = 'db_optimize' AND target = 'mysql'
        ORDER BY timestamp DESC LIMIT 1
      `);

      res.json({
        success: true,
        message: `Database optimized (${tableNames.length} tables)`,
        tables: tableNames
      });

      logger.info(`Database optimization completed - ${tableNames.length} tables`);
    } catch (error: any) {
      logger.error('Database optimization failed:', error);
      res.status(500).json({ error: 'Database optimization failed', details: error.message });
    }
  }

  /**
   * View active connections (diagnostic)
   */
  async getDatabaseConnections(req: Request, res: Response): Promise<void> {
    try {
      const [connections] = await sequelize.query('SHOW PROCESSLIST', { type: 'SELECT' });
      const [variables] = await sequelize.query("SHOW VARIABLES LIKE 'max_connections'", { type: 'SELECT' });

      res.json({
        active_connections: connections.length,
        max_connections: (variables[0] as any)?.Value || 'unknown',
        connections: connections.slice(0, 20) // Top 20
      });
    } catch (error: any) {
      logger.error('Get DB connections failed:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  }
}

export default new ServiceManagementController();
