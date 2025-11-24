"use strict";
/**
 * Metrics Module Index
 *
 * Central export point for all metrics modules
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMetrics = initializeMetrics;
// Export conversion funnel metrics
__exportStar(require("./conversion-funnel.metrics"), exports);
// Export error rate metrics
__exportStar(require("./error-rate.metrics"), exports);
// Export queue metrics
__exportStar(require("./queue.metrics"), exports);
// Export SLO metrics
__exportStar(require("./slo.metrics"), exports);
const logger_1 = __importDefault(require("../config/logger"));
const queue_metrics_1 = require("./queue.metrics");
/**
 * Initialize all metrics modules
 */
function initializeMetrics() {
    logger_1.default.info('[Metrics] Initializing advanced monitoring');
    // Start queue monitoring (every 10 seconds)
    const queueMonitoringInterval = (0, queue_metrics_1.startQueueMonitoring)(10000);
    logger_1.default.info('[Metrics] Advanced monitoring initialized', {
        queueMonitoring: 'enabled',
        interval: '10s'
    });
    // Return cleanup function
    return () => {
        clearInterval(queueMonitoringInterval);
        logger_1.default.info('[Metrics] Advanced monitoring stopped');
    };
}
logger_1.default.info('[Metrics] Metrics module loaded');
//# sourceMappingURL=index.js.map