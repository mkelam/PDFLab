"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDailyReportCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const daily_report_service_1 = __importDefault(require("../services/daily-report.service"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Daily Report Cron Job
 * Sends comprehensive daily digest email at 9:00 AM
 */
const startDailyReportCron = () => {
    // Run at 9:00 AM every day
    node_cron_1.default.schedule('0 9 * * *', async () => {
        try {
            logger_1.default.info('Starting daily report generation...');
            await daily_report_service_1.default.generateAndSendReport();
        }
        catch (error) {
            logger_1.default.error('Daily report generation failed:', error);
        }
    });
    logger_1.default.info('✅ Daily report cron job started (9:00 AM daily)');
};
exports.startDailyReportCron = startDailyReportCron;
//# sourceMappingURL=daily-report.job.js.map