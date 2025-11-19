"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBaselineCalculation = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const baseline_service_1 = require("../services/baseline.service");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Baseline Calculation Cron Job
 * Runs daily at 2:00 AM to update 7-day performance baseline
 */
const startBaselineCalculation = () => {
    // Update baseline every 24 hours at 2am
    node_cron_1.default.schedule('0 2 * * *', async () => {
        try {
            logger_1.default.info('Starting baseline calculation...');
            const baseline = await baseline_service_1.BaselineService.calculateBaseline();
            logger_1.default.info('Baseline updated successfully', baseline);
        }
        catch (error) {
            logger_1.default.error('Baseline calculation failed:', error);
        }
    });
    logger_1.default.info('✅ Baseline calculation cron job started (daily at 2:00 AM)');
};
exports.startBaselineCalculation = startBaselineCalculation;
//# sourceMappingURL=baseline.job.js.map