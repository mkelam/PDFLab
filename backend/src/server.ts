// IMPORTANT: Sentry must be imported FIRST, before any other imports
import * as Sentry from '@sentry/node'
import dotenv from 'dotenv'

// Load environment variables FIRST (needed for Sentry DSN)
dotenv.config()

// Import logger EARLY (needed for Sentry initialization)
import logger from './config/logger'

// Initialize Sentry (only if DSN is configured)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || 'development',

    beforeSend(event) {
      // Remove sensitive data
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }

      // Don't send in development unless SENTRY_DEV=true
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV) {
        return null
      }

      return event
    },
  })
  logger.info('Sentry error tracking initialized')
} else {
  logger.warn('Sentry DSN not configured - error tracking disabled')
}

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import ejs from 'ejs'
import { testConnection, syncDatabase } from './config/database'
import { connectRedis, closeQueues } from './config/redis'
import { apiLimiter } from './middleware/ratelimit.middleware'
import { initializeGuestSession } from './middleware/guest.middleware'
import { requestIdMiddleware } from './middleware/request-id.middleware'
import { httpLoggerMiddleware } from './middleware/http-logger.middleware'

// Import models to ensure they're registered with Sequelize
import './models/AdminAuditLog'
import './models/SystemHealthLog'

// Import routes
import authRoutes from './routes/auth.routes'
import googleAuthRoutes from './routes/auth.google.routes'
import conversionRoutes from './routes/conversion.routes'
import batchRoutes from './routes/batch.routes'
import payfastRoutes from './routes/payfast.routes'
import betaRoutes from './routes/beta.routes'
import feedbackRoutes from './routes/feedback.routes'
import onboardingRoutes from './routes/onboarding.routes'
import adminRoutes from './routes/admin.routes'
import conversionAdminRoutes from './routes/conversion.admin.routes'
import paymentAdminRoutes from './routes/payment.admin.routes'
import systemAdminRoutes from './routes/system.admin.routes'
import circuitBreakerRoutes from './routes/system.circuit-breaker.routes'
import analyticsAdminRoutes from './routes/analytics.admin.routes'
import auditAdminRoutes from './routes/audit.admin.routes'
import analyticsRoutes from './routes/analytics.routes'
import profileRoutes from './routes/profile.routes'
import testRoutes from './routes/test.routes'
import partnerRoutes from './routes/partner.routes'
import partnerApplicationRoutes from './routes/partnerApplication.routes'
import metricsRoutes from './routes/metrics.routes'
import founderRoutes from './routes/founder.routes'

// Import attribution middleware
import { captureAttribution } from './middleware/attribution.middleware'

// Import metrics middleware
import { metricsMiddleware } from './middleware/metrics.middleware'

const app = express()
const PORT = parseInt(process.env.PORT || '3001')

// Trust proxy (required for rate limiting behind Nginx)
app.set('trust proxy', true)

// Request correlation ID (before all other middleware)
app.use(requestIdMiddleware)

// HTTP request logging
app.use(httpLoggerMiddleware)// Prometheus metrics collection (after request ID, before routes)app.use(metricsMiddleware)
app.use(httpLoggerMiddleware)

// Sentry middleware (only if DSN is configured)
// Note: Modern @sentry/node doesn't require explicit middleware
// Sentry.init() automatically instruments Express
if (process.env.SENTRY_DSN) {
  logger.info('Sentry Express instrumentation active')
}

// =====================
// View Engine Setup
// =====================

// Set views directory
app.set('views', path.join(__dirname, 'views', 'pages'))
app.set('view engine', 'ejs')

// Helper function to render with layout
const renderWithLayout = async (view: string, data: any = {}): Promise<string> => {
  const layoutPath = path.join(__dirname, 'views', 'layouts', 'main.ejs')
  const viewPath = path.join(__dirname, 'views', 'pages', `${view}.ejs`)

  const body = await ejs.renderFile(viewPath, data)
  return ejs.renderFile(layoutPath, { ...data, body })
}

// =====================
// Middleware
// =====================

// Security headers
app.use(helmet())

// CORS configuration
const corsOrigins = process.env['CORS_ORIGIN']?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',  // Partner portal local dev
  'http://localhost:3002',
  'https://pdflab.pro',
  'http://pdflab.pro',
  'https://partners.pdflab.pro',  // Partner portal production
  'http://partners.pdflab.pro'
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true)

      if (corsOrigins.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn('CORS blocked request from origin', { origin })
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type']
  })
)

// Compression
app.use(compression())

// Serve static files (for circuit board background)
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Cookie parsing
app.use(cookieParser())

// Guest session initialization (runs for all requests)
app.use(initializeGuestSession)

// Attribution tracking (captures referral links and UTM parameters)
app.use(captureAttribution)

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Rate limiting
app.use('/api/', apiLimiter)

// =====================
// Routes
// =====================

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: 'OK',
      redis: 'OK'
    }
  }

  try {
    // Check database
    await testConnection()
  } catch (error) {
    health.checks.database = 'FAIL'
    health.status = 'DEGRADED'
  }

  try {
    // Check Redis
    const { redisClient } = await import('./config/redis')
    await redisClient.ping()
  } catch (error) {
    health.checks.redis = 'FAIL'
    health.status = 'DEGRADED'
  }

  const statusCode = health.status === 'OK' ? 200 : 503

  // Return JSON response
  res.status(statusCode).json(health)
})

// Metrics endpoint (before rate limiting for Prometheus scraping)app.use('/', metricsRoutes)
// API routes
app.use('/api/auth', authRoutes)
app.use('/api', googleAuthRoutes)  // Google OAuth routes (/api/auth/google/*)
app.use('/api/batch', batchRoutes)
app.use('/api/payfast', payfastRoutes)
app.use('/api/beta', betaRoutes)
app.use('/api', feedbackRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/partners', partnerRoutes) // Influencer attribution tracking
app.use('/api/partner-applications', partnerApplicationRoutes) // Partner application system
app.use('/api/founder', founderRoutes) // Founder's Edition challenge
app.use('/api/admin', adminRoutes)
app.use('/api/admin', conversionAdminRoutes)
app.use('/api/admin/payments', paymentAdminRoutes)
app.use('/api/admin/system', systemAdminRoutes)
app.use('/api/admin/system', circuitBreakerRoutes)
app.use('/api/admin/analytics', analyticsAdminRoutes)
app.use('/api/admin/audit-logs', auditAdminRoutes)
app.use('/api', conversionRoutes)

// Test routes (only in development/staging - NOT production)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', testRoutes)
  logger.info('Sentry test routes enabled (development/staging only)')
}

// Root route
app.get('/', async (req: Request, res: Response) => {
  const html = await renderWithLayout('home', {
    title: 'PDFLab API - Home',
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  })
  res.send(html)
})

// User management page (admin panel)
app.get('/users', async (req: Request, res: Response) => {
  const html = await renderWithLayout('admin-users', {
    title: 'User Management - PDFLab API'
  })
  res.send(html)
})

// 404 handler
app.use((req: Request, res: Response) => {
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
  })
})

// Sentry error handling is automatic with Sentry.init()
// Modern @sentry/node automatically captures unhandled errors

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Global error handler', {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    requestId: req.id,
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id
  })

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  })
})

// =====================
// Server Initialization
// =====================

const startServer = async () => {
  try {
    logger.info('PDFLab Backend Starting', {
      environment: process.env.NODE_ENV,
      port: PORT,
      nodeVersion: process.version
    })

    // Connect to database
    const dbConnected = await testConnection()
    if (!dbConnected) {
      throw new Error('Failed to connect to database')
    }

    // Sync database (create tables)
    // Temporarily disabled due to too many keys error - tables already exist
    // await syncDatabase(false) // Don't force recreate tables
    logger.info('Using existing database tables (sync disabled)')

    // Connect to Redis (optional for testing)
    const redisConnected = await connectRedis()
    if (!redisConnected) {
      logger.warn('Redis not available - job queue disabled')
      logger.warn('PDF conversions will not work without Redis')
    } else {
      // Initialize Bull queues first
      const { initializeQueues } = await import('./config/redis')
      initializeQueues()

      // Then import and initialize job workers
      const { initializeConversionWorker } = await import('./jobs/conversion.job')
      const { initializeCleanupWorker } = await import('./jobs/cleanup.job')

      initializeConversionWorker()
      initializeCleanupWorker()

      logger.info('Job workers initialized')
    }

    // Initialize monthly quota reset cron job
    const { initializeQuotaResetJob } = await import('./jobs/quota-reset.job')
    const quotaResetJob = initializeQuotaResetJob()
    if (quotaResetJob) {
      logger.info('Monthly quota reset scheduled')
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        healthCheck: `http://localhost:${PORT}/health`,
        apiEndpoint: `http://localhost:${PORT}/api`
      })
    })
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

// Graceful shutdown - ONLY called for SIGTERM/SIGINT
const gracefulShutdown = async (signal: string) => {
  logger.info('Graceful shutdown initiated', { signal })

  try {
    // Close queues and Redis
    await closeQueues()

    // Close database connection
    const { sequelize } = await import('./config/database')
    await sequelize.close()
    logger.info('Database connection closed')

    // Flush Sentry events
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      await Sentry.close(2000)
    }

    logger.info('Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    process.exit(1)
  }
}

// ONLY exit on intentional signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, starting graceful shutdown')
  gracefulShutdown('SIGTERM')
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, starting graceful shutdown')
  gracefulShutdown('SIGINT')
})

// Handle uncaught exceptions WITHOUT killing the process
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception - Non-Fatal', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString()
  })

  // Report to Sentry
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        source: 'uncaughtException',
        fatal: 'false'
      }
    })
  }

  // DO NOT CALL process.exit()
  // Let PM2 or Docker handle process restarts if truly needed
})

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled Rejection - Non-Fatal', {
    reason: String(reason),
    promise: String(promise),
    timestamp: new Date().toISOString()
  })

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
    })
  }

  // DO NOT CALL process.exit()
})

// Start the server
startServer()

