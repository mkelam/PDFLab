"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cloudconvert_service_1 = require("../services/cloudconvert.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
/**
 * GET /api/admin/circuit-breakers
 * Get circuit breaker statistics for all CloudConvert operations
 * Requires authentication
 */
router.get('/circuit-breakers', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const stats = cloudconvert_service_1.cloudConvertService.getCircuitBreakerStats();
        logger_1.default.info('Circuit breaker stats requested', {
            userId: req.user?.id,
            requestId: req.id
        });
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            circuitBreakers: {
                cloudconvert: stats
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to fetch circuit breaker stats', {
            error: error.message,
            requestId: req.id
        });
        res.status(500).json({
            error: 'Failed to fetch circuit breaker stats',
            message: error.message
        });
    }
});
/**
 * GET /api/admin/circuit-breakers/health
 * Get simple health status based on circuit breaker states
 * Requires authentication
 */
router.get('/circuit-breakers/health', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const stats = cloudconvert_service_1.cloudConvertService.getCircuitBreakerStats();
        // Check if any circuit breaker is open
        const openCircuits = [];
        if (stats.convert.isOpen)
            openCircuits.push('convert');
        if (stats.merge.isOpen)
            openCircuits.push('merge');
        if (stats.compress.isOpen)
            openCircuits.push('compress');
        if (stats.download.isOpen)
            openCircuits.push('download');
        const healthy = openCircuits.length === 0;
        res.json({
            healthy,
            status: healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            openCircuits: openCircuits.length > 0 ? openCircuits : undefined,
            details: {
                convert: stats.convert.state,
                merge: stats.merge.state,
                compress: stats.compress.state,
                download: stats.download.state
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to fetch circuit breaker health', {
            error: error.message,
            requestId: req.id
        });
        res.status(500).json({
            healthy: false,
            status: 'error',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=system.circuit-breaker.routes.js.map