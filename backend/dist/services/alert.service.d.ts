export declare enum AlertSeverity {
    INFO = "info",// Auto-handled, logged only
    WARNING = "warning",// Email within 15min (batched)
    CRITICAL = "critical",// Immediate email
    URGENT = "urgent"
}
export interface Alert {
    id?: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    metric_name?: string;
    metric_value?: number;
    action_taken?: string;
    requires_human_action: boolean;
    created_at?: Date;
}
/**
 * Alert Service
 * Handles alert creation with severity-based routing
 */
export declare class AlertService {
    /**
     * Create alert with severity-based routing
     */
    static createAlert(alert: Alert): Promise<void>;
    /**
     * Send email alert
     * @param alert - The alert to send
     * @param immediate - Send immediately (true) or batch (false)
     */
    private static sendEmailAlert;
    /**
     * Notify urgent alert (Slack, SMS, etc.)
     */
    private static notifyUrgent;
    /**
     * Get severity color for email styling
     */
    private static getSeverityColor;
    /**
     * Get unacknowledged alerts count by severity
     */
    static getAlertsSummary(): Promise<{
        info: number;
        warning: number;
        critical: number;
        urgent: number;
        total: number;
    }>;
}
export default AlertService;
//# sourceMappingURL=alert.service.d.ts.map