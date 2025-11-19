"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = exports.AlertSeverity = void 0;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
const uuid_1 = require("uuid");
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "info";
    AlertSeverity["WARNING"] = "warning";
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["URGENT"] = "urgent"; // Email + SMS + human intervention required
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
/**
 * Alert Service
 * Handles alert creation with severity-based routing
 */
class AlertService {
    /**
     * Create alert with severity-based routing
     */
    static async createAlert(alert) {
        try {
            // Insert into database (generate UUID for id)
            const id = (0, uuid_1.v4)();
            await database_1.sequelize.query(`
        INSERT INTO monitoring_alerts (
          id, severity, title, message, metric_name, metric_value,
          action_taken, requires_human_action,  alert_type, environment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system', 'production')
      `, {
                replacements: [
                    id,
                    alert.severity,
                    alert.title,
                    alert.message,
                    alert.metric_name || null,
                    alert.metric_value || null,
                    alert.action_taken || null,
                    alert.requires_human_action ? 1 : 0
                ]
            });
            // Route based on severity
            switch (alert.severity) {
                case AlertSeverity.INFO:
                    // Just log, no notification
                    logger_1.default.info(`[ALERT-INFO] ${alert.title}: ${alert.message}`);
                    break;
                case AlertSeverity.WARNING:
                    // Email notification (batched - max 1 per 15min)
                    await this.sendEmailAlert(alert, false);
                    break;
                case AlertSeverity.CRITICAL:
                    // Immediate email
                    await this.sendEmailAlert(alert, true);
                    break;
                case AlertSeverity.URGENT:
                    // Email + mark for human review
                    await this.sendEmailAlert(alert, true);
                    await this.notifyUrgent(alert);
                    break;
            }
        }
        catch (error) {
            logger_1.default.error('Failed to create alert:', error);
        }
    }
    /**
     * Send email alert
     * @param alert - The alert to send
     * @param immediate - Send immediately (true) or batch (false)
     */
    static async sendEmailAlert(alert, immediate) {
        try {
            // Check if email service is available
            const emailService = await Promise.resolve().then(() => __importStar(require('./email.service')));
            const subject = `[${alert.severity.toUpperCase()}] PDFLab Alert: ${alert.title}`;
            const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">${alert.title}</h2>
          </div>
          <div style="padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-bottom: 15px;"><strong>Severity:</strong> <span style="color: ${this.getSeverityColor(alert.severity)}; font-weight: bold; text-transform: uppercase;">${alert.severity}</span></p>
            <p style="margin-bottom: 15px;"><strong>Message:</strong> ${alert.message}</p>
            ${alert.metric_name ? `<p style="margin-bottom: 15px;"><strong>Metric:</strong> ${alert.metric_name} = ${alert.metric_value}</p>` : ''}
            ${alert.action_taken ? `<p style="margin-bottom: 15px;"><strong>Action Taken:</strong> ${alert.action_taken}</p>` : ''}
            ${alert.requires_human_action ? '<p style="color: red; font-weight: bold; margin-bottom: 15px;">⚠️ HUMAN ACTION REQUIRED</p>' : ''}
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Timestamp: ${new Date().toISOString()}</p>
          </div>
          <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
            <a href="https://pdflab.pro/admin/monitoring" style="color: #667eea; text-decoration: none;">View Live Dashboard</a>
          </div>
        </div>
      `;
            if (immediate || alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.URGENT) {
                // Send immediately
                await emailService.default.sendEmail({
                    to: process.env.ADMIN_EMAIL || 'mmkela@gmail.com',
                    subject,
                    html: body,
                    text: alert.message
                });
                logger_1.default.info(`Alert email sent (${alert.severity}): ${alert.title}`);
            }
            else {
                // TODO: Queue for batched sending (implement batch queue if needed)
                // For now, send immediately
                await emailService.default.sendEmail({
                    to: process.env.ADMIN_EMAIL || 'mmkela@gmail.com',
                    subject,
                    html: body,
                    text: alert.message
                });
            }
        }
        catch (error) {
            logger_1.default.error('Failed to send alert email:', error);
        }
    }
    /**
     * Notify urgent alert (Slack, SMS, etc.)
     */
    static async notifyUrgent(alert) {
        logger_1.default.error(`[URGENT ALERT] ${alert.title} - Manual intervention required`);
        // Send to Slack if webhook configured
        const slackWebhook = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhook) {
            try {
                await fetch(slackWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `🚨 URGENT: ${alert.title}`,
                        attachments: [{
                                color: 'danger',
                                text: alert.message,
                                fields: [
                                    { title: 'Severity', value: 'URGENT', short: true },
                                    { title: 'Requires Action', value: alert.requires_human_action ? 'YES' : 'NO', short: true },
                                    { title: 'Metric', value: alert.metric_name ? `${alert.metric_name}: ${alert.metric_value}` : 'N/A', short: false }
                                ]
                            }]
                    })
                });
                logger_1.default.info('Urgent alert sent to Slack');
            }
            catch (error) {
                logger_1.default.error('Failed to send Slack notification:', error);
            }
        }
        // TODO: Add SMS notification via Twilio if needed
    }
    /**
     * Get severity color for email styling
     */
    static getSeverityColor(severity) {
        switch (severity) {
            case AlertSeverity.INFO:
                return '#3b82f6'; // Blue
            case AlertSeverity.WARNING:
                return '#f59e0b'; // Orange
            case AlertSeverity.CRITICAL:
                return '#ef4444'; // Red
            case AlertSeverity.URGENT:
                return '#991b1b'; // Dark red
            default:
                return '#6b7280'; // Gray
        }
    }
    /**
     * Get unacknowledged alerts count by severity
     */
    static async getAlertsSummary() {
        try {
            const [results] = await database_1.sequelize.query(`
        SELECT
          SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info,
          SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN severity = 'urgent' THEN 1 ELSE 0 END) as urgent,
          COUNT(*) as total
        FROM monitoring_alerts
        WHERE acknowledged = FALSE
      `, { type: 'SELECT' });
            return results[0] || { info: 0, warning: 0, critical: 0, urgent: 0, total: 0 };
        }
        catch (error) {
            logger_1.default.error('Failed to get alerts summary:', error);
            return { info: 0, warning: 0, critical: 0, urgent: 0, total: 0 };
        }
    }
}
exports.AlertService = AlertService;
exports.default = AlertService;
//# sourceMappingURL=alert.service.js.map