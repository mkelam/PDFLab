import { sequelize } from '../config/database';
import emailService from './email.service';
import logger from '../config/logger';

export class DailyReportService {
  /**
   * Generate and send daily digest report
   * Runs at 9:00 AM daily via cron
   */
  static async generateAndSendReport(): Promise<void> {
    try {
      logger.info('Generating daily digest report...');
      const report = await this.compileReport();
      const html = this.formatReportHTML(report);

      await emailService.sendEmail({
        to: process.env.ADMIN_EMAIL || 'mmkela@gmail.com',
        subject: `PDFLab Daily Report - ${new Date().toLocaleDateString()}`,
        html,
        text: `PDFLab Daily Report for ${new Date().toLocaleDateString()} - View full report in HTML email.`
      });

      logger.info('Daily digest report sent successfully');
    } catch (error) {
      logger.error('Failed to send daily digest:', error);
    }
  }

  /**
   * Compile report data from database
   */
  private static async compileReport() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // 1. System uptime
      const [uptimeResult] = await sequelize.query(`
        SELECT
          COUNT(*) as total_checks,
          SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) as backend_healthy,
          SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) as worker_healthy,
          SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) as mysql_healthy,
          SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) as redis_healthy
        FROM health_checks
        WHERE timestamp >= ?
      `, { replacements: [yesterday], type: 'SELECT' });

      const uptimeData = uptimeResult[0] as any || {};
      const uptime = uptimeData.total_checks > 0
        ? ((uptimeData.backend_healthy + uptimeData.worker_healthy + uptimeData.mysql_healthy + uptimeData.redis_healthy) / (uptimeData.total_checks * 4) * 100)
        : 100;

      // 2. Auto-remediation actions
      const [remediationActions] = await sequelize.query(`
        SELECT action_type, COUNT(*) as count, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
        FROM remediation_log
        WHERE timestamp >= ?
        GROUP BY action_type
      `, { replacements: [yesterday], type: 'SELECT' });

      // 3. Alerts summary
      const [alertsSummary] = await sequelize.query(`
        SELECT severity, COUNT(*) as count
        FROM monitoring_alerts
        WHERE created_at >= ?
        GROUP BY severity
      `, { replacements: [yesterday], type: 'SELECT' });

      // 4. Resource usage averages
      const [resourceAvg] = await sequelize.query(`
        SELECT
          AVG(disk_used_percent) as avg_disk,
          AVG(backend_memory_percent) as avg_backend_mem,
          AVG(worker_memory_percent) as avg_worker_mem,
          AVG(mysql_memory_percent) as avg_mysql_mem,
          AVG(redis_memory_percent) as avg_redis_mem,
          AVG(frontend_memory_percent) as avg_frontend_mem,
          MAX(disk_used_percent) as max_disk,
          MAX(backend_memory_percent) as max_backend_mem
        FROM resource_metrics
        WHERE timestamp >= ?
      `, { replacements: [yesterday], type: 'SELECT' });

      const resources = resourceAvg[0] as any || {};

      // 5. Conversion activity
      const [conversionStats] = await sequelize.query(`
        SELECT
          COUNT(*) as total_conversions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM conversion_jobs
        WHERE created_at >= ?
      `, { replacements: [yesterday], type: 'SELECT' });

      return {
        uptime,
        remediation: remediationActions as any[],
        alerts: alertsSummary as any[],
        resources: {
          avg_disk: parseFloat(resources.avg_disk) || 0,
          avg_backend_mem: parseFloat(resources.avg_backend_mem) || 0,
          avg_worker_mem: parseFloat(resources.avg_worker_mem) || 0,
          avg_mysql_mem: parseFloat(resources.avg_mysql_mem) || 0,
          avg_redis_mem: parseFloat(resources.avg_redis_mem) || 0,
          avg_frontend_mem: parseFloat(resources.avg_frontend_mem) || 0,
          max_disk: parseFloat(resources.max_disk) || 0,
          max_backend_mem: parseFloat(resources.max_backend_mem) || 0
        },
        conversions: (conversionStats[0] as any) || { total_conversions: 0, successful: 0, failed: 0 },
        date: new Date().toLocaleDateString()
      };
    } catch (error) {
      logger.error('Error compiling report data:', error);
      throw error;
    }
  }

  /**
   * Format report as HTML email
   */
  private static formatReportHTML(report: any): string {
    const avgCpu = (report.resources.avg_backend_mem + report.resources.avg_worker_mem) / 2;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; }
    .section { padding: 25px; border-bottom: 1px solid #eee; }
    .section h2 { margin-top: 0; color: #667eea; font-size: 20px; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; display: block; margin-bottom: 5px; }
    .metric-value { font-size: 28px; font-weight: bold; color: #333; }
    .good { color: #10b981; }
    .warning { color: #f59e0b; }
    .bad { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #667eea; color: white; font-weight: 600; }
    .recommendations { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
    .recommendations ul { margin: 10px 0; padding-left: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f9f9f9; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 PDFLab Daily Operations Report</h1>
      <p>${report.date}</p>
    </div>

    <!-- System Health -->
    <div class="section">
      <h2>🔧 System Health (24h)</h2>
      <div class="metric">
        <span class="metric-label">Uptime</span>
        <span class="metric-value ${report.uptime >= 99 ? 'good' : report.uptime >= 95 ? 'warning' : 'bad'}">
          ${report.uptime.toFixed(2)}%
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Avg Disk</span>
        <span class="metric-value ${report.resources.avg_disk < 80 ? 'good' : 'warning'}">
          ${report.resources.avg_disk.toFixed(1)}%
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Avg Memory</span>
        <span class="metric-value ${avgCpu < 70 ? 'good' : 'warning'}">
          ${avgCpu.toFixed(1)}%
        </span>
      </div>
    </div>

    <!-- Auto-Remediation -->
    <div class="section">
      <h2>🤖 Auto-Remediation Actions (24h)</h2>
      ${report.remediation.length > 0 ? `
        <table>
          <tr><th>Action Type</th><th>Total</th><th>Successful</th><th>Success Rate</th></tr>
          ${report.remediation.map((r: any) => `
            <tr>
              <td>${r.action_type.replace(/_/g, ' ')}</td>
              <td>${r.count}</td>
              <td>${r.successful}</td>
              <td class="${(r.successful / r.count * 100) >= 90 ? 'good' : 'warning'}">
                ${(r.successful / r.count * 100).toFixed(1)}%
              </td>
            </tr>
          `).join('')}
        </table>
      ` : '<p>No auto-remediation actions taken (system stable ✅)</p>'}
    </div>

    <!-- Alerts Summary -->
    <div class="section">
      <h2>🚨 Alerts Summary (24h)</h2>
      ${report.alerts.length > 0 ? `
        <table>
          <tr><th>Severity</th><th>Count</th></tr>
          ${report.alerts.map((a: any) => `
            <tr>
              <td style="text-transform: uppercase; font-weight: bold; color: ${
                a.severity === 'urgent' ? '#ef4444' :
                a.severity === 'critical' ? '#f59e0b' :
                a.severity === 'warning' ? '#3b82f6' : '#666'
              }">${a.severity}</td>
              <td>${a.count}</td>
            </tr>
          `).join('')}
        </table>
      ` : '<p>No alerts generated (system healthy ✅)</p>'}
    </div>

    <!-- Conversion Activity -->
    <div class="section">
      <h2>📄 Conversion Activity (24h)</h2>
      <div class="metric">
        <span class="metric-label">Total</span>
        <span class="metric-value">${report.conversions.total_conversions}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Successful</span>
        <span class="metric-value good">${report.conversions.successful}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Failed</span>
        <span class="metric-value ${report.conversions.failed > 0 ? 'bad' : 'good'}">${report.conversions.failed}</span>
      </div>
      ${report.conversions.total_conversions > 0 ? `
        <div class="metric">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value ${(report.conversions.successful / report.conversions.total_conversions * 100) >= 95 ? 'good' : 'warning'}">
            ${(report.conversions.successful / report.conversions.total_conversions * 100).toFixed(1)}%
          </span>
        </div>
      ` : ''}
    </div>

    <!-- Recommendations -->
    <div class="section">
      <h2>✅ Recommendations</h2>
      <div class="recommendations">
        <ul>
          ${report.uptime < 99 ? '<li>⚠️ Uptime below 99% - investigate recent incidents in <a href="https://pdflab.pro/admin/monitoring">monitoring dashboard</a></li>' : ''}
          ${report.resources.max_backend_mem > 90 ? '<li>⚠️ Backend memory spiked above 90% - consider scaling or investigating memory leaks</li>' : ''}
          ${report.resources.avg_disk > 80 ? '<li>⚠️ Disk usage averaging above 80% - review cleanup policies and storage growth</li>' : ''}
          ${report.conversions.failed > 10 ? '<li>⚠️ High conversion failure rate - check CloudConvert integration and error logs</li>' : ''}
          ${report.uptime >= 99 && report.resources.max_backend_mem < 80 && report.conversions.failed < 5
            ? '<li>✅ All systems operating normally - no action required</li>'
            : ''
          }
          ${report.remediation.length > 10 ? '<li>⚠️ High auto-remediation activity - system may be unstable, investigate root cause</li>' : ''}
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated by PDFLab Autonomous Guardian</p>
      <p><a href="https://pdflab.pro/admin/monitoring">View Live Dashboard</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

export default DailyReportService;
