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
// IMPORTANT: Sentry must be imported FIRST, before any other imports
const Sentry = __importStar(require("@sentry/node"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST (needed for Sentry DSN)
dotenv_1.default.config();
// Import logger EARLY (needed for Sentry initialization)
const logger_1 = __importDefault(require("./config/logger"));
// Initialize Sentry (only if DSN is configured)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        environment: process.env.NODE_ENV || 'development',
        beforeSend(event) {
            // Remove sensitive data
            if (event.user) {
                delete event.user.email;
                delete event.user.ip_address;
            }
            if (event.request?.headers) {
                delete event.request.headers.authorization;
                delete event.request.headers.cookie;
            }
            // Don't send in development unless SENTRY_DEV=true
            if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV) {
                return null;
            }
            return event;
        },
    });
    logger_1.default.info('Sentry error tracking initialized');
}
else {
    logger_1.default.warn('Sentry DSN not configured - error tracking disabled');
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const ratelimit_middleware_1 = require("./middleware/ratelimit.middleware");
const guest_middleware_1 = require("./middleware/guest.middleware");
const request_id_middleware_1 = require("./middleware/request-id.middleware");
const http_logger_middleware_1 = require("./middleware/http-logger.middleware");
// Import models to ensure they're registered with Sequelize
require("./models/AdminAuditLog");
require("./models/SystemHealthLog");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const auth_google_routes_1 = __importDefault(require("./routes/auth.google.routes"));
const conversion_routes_1 = __importDefault(require("./routes/conversion.routes"));
const batch_routes_1 = __importDefault(require("./routes/batch.routes"));
const payfast_routes_1 = __importDefault(require("./routes/payfast.routes"));
const beta_routes_1 = __importDefault(require("./routes/beta.routes"));
const feedback_routes_1 = __importDefault(require("./routes/feedback.routes"));
const onboarding_routes_1 = __importDefault(require("./routes/onboarding.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const conversion_admin_routes_1 = __importDefault(require("./routes/conversion.admin.routes"));
const payment_admin_routes_1 = __importDefault(require("./routes/payment.admin.routes"));
const system_admin_routes_1 = __importDefault(require("./routes/system.admin.routes"));
const system_circuit_breaker_routes_1 = __importDefault(require("./routes/system.circuit-breaker.routes"));
const analytics_admin_routes_1 = __importDefault(require("./routes/analytics.admin.routes"));
const audit_admin_routes_1 = __importDefault(require("./routes/audit.admin.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const test_routes_1 = __importDefault(require("./routes/test.routes"));
const partner_routes_1 = __importDefault(require("./routes/partner.routes"));
const partnerApplication_routes_1 = __importDefault(require("./routes/partnerApplication.routes"));
// Import attribution middleware
const attribution_middleware_1 = require("./middleware/attribution.middleware");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001');
// Trust proxy (required for rate limiting behind Nginx)
app.set('trust proxy', true);
// Request correlation ID (before all other middleware)
app.use(request_id_middleware_1.requestIdMiddleware);
// HTTP request logging
app.use(http_logger_middleware_1.httpLoggerMiddleware); // Prometheus metrics collection (after request ID, before routes)app.use(metricsMiddleware)
app.use(http_logger_middleware_1.httpLoggerMiddleware);
// Sentry middleware (only if DSN is configured)
// Note: Modern @sentry/node doesn't require explicit middleware
// Sentry.init() automatically instruments Express
if (process.env.SENTRY_DSN) {
    logger_1.default.info('Sentry Express instrumentation active');
}
// =====================
// View Engine Setup
// =====================
// Set views directory
app.set('views', path_1.default.join(__dirname, 'views', 'pages'));
app.set('view engine', 'ejs');
// Helper function to render with layout
const renderWithLayout = async (view, data = {}) => {
    const layoutPath = path_1.default.join(__dirname, 'views', 'layouts', 'main.ejs');
    const viewPath = path_1.default.join(__dirname, 'views', 'pages', `${view}.ejs`);
    const body = await ejs_1.default.renderFile(viewPath, data);
    return ejs_1.default.renderFile(layoutPath, { ...data, body });
};
// =====================
// Middleware
// =====================
// Security headers
app.use((0, helmet_1.default)());
// CORS configuration
const corsOrigins = process.env['CORS_ORIGIN']?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001', // Partner portal local dev
    'http://localhost:3002',
    'https://pdflab.pro',
    'http://pdflab.pro',
    'https://partners.pdflab.pro', // Partner portal production
    'http://partners.pdflab.pro'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (corsOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger_1.default.warn('CORS blocked request from origin', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type']
}));
// Compression
app.use((0, compression_1.default)());
// Serve static files (for circuit board background)
app.use('/images', express_1.default.static(path_1.default.join(__dirname, '..', 'public', 'images')));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parsing
app.use((0, cookie_parser_1.default)());
// Guest session initialization (runs for all requests)
app.use(guest_middleware_1.initializeGuestSession);
// Attribution tracking (captures referral links and UTM parameters)
app.use(attribution_middleware_1.captureAttribution);
// Logging
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Rate limiting
app.use('/api/', ratelimit_middleware_1.apiLimiter);
// =====================
// Routes
// =====================
// Health check
app.get('/health', async (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'OK',
        checks: {
            database: 'OK',
            redis: 'OK'
        }
    };
    try {
        // Check database
        await (0, database_1.testConnection)();
    }
    catch (error) {
        health.checks.database = 'FAIL';
        health.status = 'DEGRADED';
    }
    try {
        // Check Redis
        const { redisClient } = await Promise.resolve().then(() => __importStar(require('./config/redis')));
        await redisClient.ping();
    }
    catch (error) {
        health.checks.redis = 'FAIL';
        health.status = 'DEGRADED';
    }
    const statusCode = health.status === 'OK' ? 200 : 503;
    // Return JSON response
    res.status(statusCode).json(health);
});
// Metrics endpoint (before rate limiting for Prometheus scraping)app.use('/', metricsRoutes)
// API routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api', auth_google_routes_1.default); // Google OAuth routes (/api/auth/google/*)
app.use('/api/batch', batch_routes_1.default);
app.use('/api/payfast', payfast_routes_1.default);
app.use('/api/beta', beta_routes_1.default);
app.use('/api', feedback_routes_1.default);
app.use('/api/onboarding', onboarding_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/profile', profile_routes_1.default);
app.use('/api/partners', partner_routes_1.default); // Influencer attribution tracking
app.use('/api/partner-applications', partnerApplication_routes_1.default); // Partner application system
app.use('/api/admin', admin_routes_1.default);
app.use('/api/admin', conversion_admin_routes_1.default);
app.use('/api/admin/payments', payment_admin_routes_1.default);
app.use('/api/admin/system', system_admin_routes_1.default);
app.use('/api/admin/system', system_circuit_breaker_routes_1.default);
app.use('/api/admin/analytics', analytics_admin_routes_1.default);
app.use('/api/admin/audit-logs', audit_admin_routes_1.default);
app.use('/api', conversion_routes_1.default);
// Test routes (only in development/staging - NOT production)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api', test_routes_1.default);
    logger_1.default.info('Sentry test routes enabled (development/staging only)');
}
// Root route
app.get('/', async (req, res) => {
    const html = await renderWithLayout('home', {
        title: 'PDFLab API - Home',
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    });
    res.send(html);
});
// User management page (admin panel)
app.get('/users', async (req, res) => {
    const html = await renderWithLayout('admin-users', {
        title: 'User Management - PDFLab API'
    });
    res.send(html);
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: [
            'GET /health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/profile',
            'GET /api/payfast/plans',
            'POST /api/payfast/initialize',
            'POST /api/payfast/webhook',
            'POST /api/upload',
            'GET /api/status/:job_id',
            'GET /api/download/:job_id',
            'GET /api/history'
        ]
    });
});
// Sentry error handling is automatic with Sentry.init()
// Modern @sentry/node automatically captures unhandled errors
// Global error handler
app.use((err, req, res, next) => {
    logger_1.default.error('Global error handler', {
        error: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        requestId: req.id,
        method: req.method,
        url: req.url,
        userId: req.user?.id
    });
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    res.status(statusCode).json({
        error: err.name || 'Error',
        message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack
        })
    });
});
// =====================
// Server Initialization
// =====================
const startServer = async () => {
    try {
        logger_1.default.info('PDFLab Backend Starting', {
            environment: process.env.NODE_ENV,
            port: PORT,
            nodeVersion: process.version
        });
        // Connect to database
        const dbConnected = await (0, database_1.testConnection)();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }
        // Sync database (create tables)
        // Temporarily disabled due to too many keys error - tables already exist
        // await syncDatabase(false) // Don't force recreate tables
        logger_1.default.info('Using existing database tables (sync disabled)');
        // Connect to Redis (optional for testing)
        const redisConnected = await (0, redis_1.connectRedis)();
        if (!redisConnected) {
            logger_1.default.warn('Redis not available - job queue disabled');
            logger_1.default.warn('PDF conversions will not work without Redis');
        }
        else {
            // Initialize Bull queues first
            const { initializeQueues } = await Promise.resolve().then(() => __importStar(require('./config/redis')));
            initializeQueues();
            // Then import and initialize job workers
            const { initializeConversionWorker } = await Promise.resolve().then(() => __importStar(require('./jobs/conversion.job')));
            const { initializeCleanupWorker } = await Promise.resolve().then(() => __importStar(require('./jobs/cleanup.job')));
            initializeConversionWorker();
            initializeCleanupWorker();
            logger_1.default.info('Job workers initialized');
        }
        // Initialize monthly quota reset cron job
        const { initializeQuotaResetJob } = await Promise.resolve().then(() => __importStar(require('./jobs/quota-reset.job')));
        const quotaResetJob = initializeQuotaResetJob();
        if (quotaResetJob) {
            logger_1.default.info('Monthly quota reset scheduled');
        }
        // Start Express server
        app.listen(PORT, () => {
            logger_1.default.info('Server started successfully', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString(),
                healthCheck: `http://localhost:${PORT}/health`,
                apiEndpoint: `http://localhost:${PORT}/api`
            });
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
    }
};
// Graceful shutdown - ONLY called for SIGTERM/SIGINT
const gracefulShutdown = async (signal) => {
    logger_1.default.info('Graceful shutdown initiated', { signal });
    try {
        // Close queues and Redis
        await (0, redis_1.closeQueues)();
        // Close database connection
        const { sequelize } = await Promise.resolve().then(() => __importStar(require('./config/database')));
        await sequelize.close();
        logger_1.default.info('Database connection closed');
        // Flush Sentry events
        if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
            await Sentry.close(2000);
        }
        logger_1.default.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
    }
};
// ONLY exit on intentional signals
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM received, starting graceful shutdown');
    gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT received, starting graceful shutdown');
    gracefulShutdown('SIGINT');
});
// Handle uncaught exceptions WITHOUT killing the process
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception - Non-Fatal', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString()
    });
    // Report to Sentry
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            level: 'error',
            tags: {
                source: 'uncaughtException',
                fatal: 'false'
            }
        });
    }
    // DO NOT CALL process.exit()
    // Let PM2 or Docker handle process restarts if truly needed
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection - Non-Fatal', {
        reason: String(reason),
        promise: String(promise),
        timestamp: new Date().toISOString()
    });
    // Report to Sentry
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.captureException(new Error('Unhandled Promise Rejection'), {
            level: 'error',
            tags: {
                source: 'unhandledRejection',
                fatal: 'false'
            },
            extra: {
                reason: String(reason),
                promise: String(promise)
            }
        });
    }
    // DO NOT CALL process.exit()
});
// Start the server
startServer();
//# sourceMappingURL=server.js.map