export declare class DailyReportService {
    /**
     * Generate and send daily digest report
     * Runs at 9:00 AM daily via cron
     */
    static generateAndSendReport(): Promise<void>;
    /**
     * Compile report data from database
     */
    private static compileReport;
    /**
     * Format report as HTML email
     */
    private static formatReportHTML;
}
export default DailyReportService;
//# sourceMappingURL=daily-report.service.d.ts.map