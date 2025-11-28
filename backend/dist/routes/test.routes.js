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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Sentry = __importStar(require("@sentry/node"));
const router = (0, express_1.Router)();
/**
 * Test Routes for Sentry Alert Verification
 *
 * IMPORTANT: These routes should only be available in development/staging
 * Never expose in production!
 */
/**
 * Test basic error capture
 * POST /api/test/sentry-error
 */
router.post('/test/sentry-error', (req, res) => {
    try {
        throw new Error('Test error from Sentry alert setup - This is a test!');
    }
    catch (error) {
        Sentry.captureException(error, {
            tags: {
                test: true,
                alert_test: 'error_rate_spike',
                triggered_by: 'manual_test',
            },
            level: 'error',
        });
        res.status(500).json({
            success: false,
            error: 'Test error triggered successfully',
            message: 'Check Sentry dashboard at https://pdf-lab-pro.sentry.io/issues/',
            expected: 'Error should appear in Sentry within 30 seconds'
        });
    }
});
/**
 * Test database connection error alert
 * POST /api/test/sentry-db-error
 */
router.post('/test/sentry-db-error', (req, res) => {
    const error = new Error('Connection lost to MySQL server during operation');
    error.name = 'SequelizeConnectionError';
    Sentry.captureException(error, {
        tags: {
            test: true,
            alert_test: 'database_connection',
            critical: true,
        },
        contexts: {
            database: {
                host: 'localhost',
                port: 3306,
                database: 'pdflab',
                error_code: 'ECONNREFUSED',
            },
        },
        level: 'fatal',
    });
    res.status(500).json({
        success: false,
        error: 'Test database error triggered',
        message: 'Critical alert should fire in Slack #alerts-critical',
        expected: 'Alert notification within 1 minute'
    });
});
/**
 * Test Redis queue error alert
 * POST /api/test/sentry-redis-error
 */
router.post('/test/sentry-redis-error', (req, res) => {
    const error = new Error('Bull queue job failed: Redis connection timeout');
    error.name = 'BullQueueError';
    Sentry.captureException(error, {
        tags: {
            test: true,
            alert_test: 'redis_queue',
            queue: 'conversion',
        },
        contexts: {
            queue: {
                job_id: 'test-job-123',
                queue_name: 'conversion',
                retry_count: 3,
            },
        },
        level: 'error',
    });
    res.status(500).json({
        success: false,
        error: 'Test Redis queue error triggered',
        message: 'Queue failure alert should fire if >5 errors in 1 minute',
        tip: 'Run this endpoint 6+ times to trigger alert'
    });
});
/**
 * Test CloudConvert API error alert
 * POST /api/test/sentry-cloudconvert-error
 */
router.post('/test/sentry-cloudconvert-error', (req, res) => {
    const error = new Error('CloudConvert API request failed: Unauthorized (401)');
    Sentry.captureException(error, {
        tags: {
            test: true,
            alert_test: 'cloudconvert_api',
            service: 'cloudconvert',
        },
        contexts: {
            cloudconvert: {
                endpoint: '/v2/jobs',
                http_status: 401,
                error_message: 'Invalid API key',
            },
        },
        extra: {
            http_status_code: 401,
            service: 'CloudConvert',
        },
        level: 'error',
    });
    res.status(500).json({
        success: false,
        error: 'Test CloudConvert error triggered',
        message: 'External API failure alert should fire',
        action_required: 'Check CloudConvert dashboard and API key'
    });
});
/**
 * Test PayFast webhook error alert
 * POST /api/test/sentry-payfast-error
 */
router.post('/test/sentry-payfast-error', (req, res) => {
    const error = new Error('PayFast webhook processing failed: Invalid signature');
    Sentry.captureException(error, {
        tags: {
            test: true,
            alert_test: 'payfast_webhook',
            revenue_critical: true,
        },
        contexts: {
            payfast: {
                transaction: '/api/payfast/webhook',
                payment_id: 'test-payment-123',
                error_type: 'signature_validation',
            },
        },
        level: 'fatal',
    });
    res.status(500).json({
        success: false,
        error: 'Test PayFast webhook error triggered',
        message: 'CRITICAL: Payment alert should fire immediately',
        severity: 'revenue-critical',
        expected_notification: 'Slack #alerts-payments + Email to finance@pdflab.pro'
    });
});
/**
 * Test performance/slow transaction
 * POST /api/test/sentry-slow-performance
 * Note: Uses Sentry.startSpan for newer SDK versions
 */
router.post('/test/sentry-slow-performance', async (req, res) => {
    await Sentry.startSpan({
        op: 'test.performance',
        name: 'Test Slow API Response',
        attributes: {
            test: true,
            alert_test: 'performance',
        },
    }, async () => {
        // Simulate slow operation (3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));
        res.json({
            success: true,
            message: 'Slow performance test completed',
            duration: '3 seconds',
            expected: 'Performance alert should fire if P95 exceeds threshold',
            note: 'May require multiple requests to trigger P95 alert'
        });
    });
});
/**
 * Test user impact (multiple users affected)
 * POST /api/test/sentry-user-impact
 */
router.post('/test/sentry-user-impact', (req, res) => {
    // Simulate error affecting unique user
    const userId = req.body.user_id || `test-user-${Math.random().toString(36).substring(7)}`;
    const error = new Error('Error affecting user during conversion');
    Sentry.captureException(error, {
        tags: {
            test: true,
            alert_test: 'user_impact',
        },
        user: {
            id: userId,
        },
        level: 'error',
    });
    res.status(500).json({
        success: false,
        error: 'Test user impact error triggered',
        user_id: userId,
        message: 'High user impact alert fires when >50 unique users affected in 5 minutes',
        tip: 'Send requests with different user_id values to simulate multiple users'
    });
});
/**
 * Test batch processing error
 * POST /api/test/sentry-batch-error
 */
router.post('/test/sentry-batch-error', (req, res) => {
    const error = new Error('Batch processing failed: Timeout exceeded for batch job');
    Sentry.captureException(error, {
        tags: {
            test: true,
            alert_test: 'batch_processing',
            operation: 'batch',
        },
        contexts: {
            batch: {
                batch_id: 'test-batch-123',
                total_files: 10,
                completed_files: 3,
                failed_files: 7,
                operation_type: 'convert',
            },
        },
        level: 'error',
    });
    res.status(500).json({
        success: false,
        error: 'Test batch processing error triggered',
        message: 'Batch failure alert should fire',
        batch_info: {
            batch_id: 'test-batch-123',
            status: 'failed',
            completion_rate: '30%'
        }
    });
});
/**
 * Get test results summary
 * GET /api/test/sentry-status
 */
router.get('/test/sentry-status', (req, res) => {
    res.json({
        success: true,
        sentry_enabled: !!process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        project: 'pdflab-backend',
        dashboard: 'https://pdf-lab-pro.sentry.io',
        available_tests: [
            'POST /api/test/sentry-error - Basic error capture',
            'POST /api/test/sentry-db-error - Database connection error',
            'POST /api/test/sentry-redis-error - Redis queue error',
            'POST /api/test/sentry-cloudconvert-error - CloudConvert API error',
            'POST /api/test/sentry-payfast-error - PayFast webhook error',
            'POST /api/test/sentry-slow-performance - Slow performance',
            'POST /api/test/sentry-user-impact - User impact error',
            'POST /api/test/sentry-batch-error - Batch processing error',
        ],
        instructions: 'Run these endpoints to verify Sentry alerts are working correctly',
        note: 'These endpoints are only available in development/staging environments'
    });
});
exports.default = router;
//# sourceMappingURL=test.routes.js.map