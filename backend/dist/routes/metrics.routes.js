"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const metrics_1 = require("../config/metrics");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Metrics Routes
 *
 * Exposes Prometheus metrics endpoint for scraping.
 * This endpoint should be accessible only from the Docker network
 * or protected by authentication in production.
 */
const router = (0, express_1.Router)();
/**
 * GET /metrics
 *
 * Returns all collected metrics in Prometheus format.
 * This endpoint is scraped by Prometheus at regular intervals.
 */
router.get('/metrics', async (req, res) => {
    try {
        // Set proper content type for Prometheus
        res.set('Content-Type', metrics_1.register.contentType);
        // Return metrics
        const metrics = await metrics_1.register.metrics();
        res.end(metrics);
        logger_1.default.debug('Metrics scraped successfully', {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    }
    catch (error) {
        logger_1.default.error('Failed to generate metrics', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            error: 'Failed to generate metrics',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /metrics/health
 *
 * Simple health check for the metrics endpoint.
 * Returns basic information about available metrics.
 */
router.get('/metrics/health', async (req, res) => {
    try {
        const metrics = await metrics_1.register.getMetricsAsJSON();
        res.json({
            status: 'OK',
            metricsCount: metrics.length,
            timestamp: Date.now(),
            metrics: metrics.map((m) => ({
                name: m.name,
                type: m.type,
                help: m.help
            }))
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get metrics info', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            error: 'Failed to get metrics info',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.routes.js.map