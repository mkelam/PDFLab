// IMPORTANT: Sentry must be imported FIRST, before any other imports
import * as Sentry from '@sentry/node'
import dotenv from 'dotenv'

// Load environment variables FIRST (needed for Sentry DSN)
dotenv.config()

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
  console.log('✓ Sentry error tracking initialized')
} else {
  console.log('⚠ Sentry DSN not configured - error tracking disabled')
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

// Import models to ensure they're registered with Sequelize
import './models/AdminAuditLog'
import './models/SystemHealthLog'

// Import routes
import authRoutes from './routes/auth.routes'
import conversionRoutes from './routes/conversion.routes'
import batchRoutes from './routes/batch.routes'
import payfastRoutes from './routes/payfast.routes'
import adminRoutes from './routes/admin.routes'
import conversionAdminRoutes from './routes/conversion.admin.routes'
import paymentAdminRoutes from './routes/payment.admin.routes'
import systemAdminRoutes from './routes/system.admin.routes'
import analyticsAdminRoutes from './routes/analytics.admin.routes'
import auditAdminRoutes from './routes/audit.admin.routes'

const app = express()
const PORT = parseInt(process.env.PORT || '3001')

// The Sentry request handler must be the first middleware on the app (if Sentry is configured)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler())
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler())
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
  'http://localhost:3002'
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true)

      if (corsOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true)
      } else {
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

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/batch', batchRoutes)
app.use('/api/payfast', payfastRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin', conversionAdminRoutes)
app.use('/api/admin/payments', paymentAdminRoutes)
app.use('/api/admin/system', systemAdminRoutes)
app.use('/api/admin/analytics', analyticsAdminRoutes)
app.use('/api/admin/audit-logs', auditAdminRoutes)
app.use('/api', conversionRoutes)

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

// The Sentry error handler must be before any other error middleware (if Sentry is configured)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler())
}

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err)

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
    console.log('🚀 Starting PDFLab Backend API...')

    // Connect to database
    const dbConnected = await testConnection()
    if (!dbConnected) {
      throw new Error('Failed to connect to database')
    }

    // Sync database (create tables)
    // Temporarily disabled due to too many keys error - tables already exist
    // await syncDatabase(false) // Don't force recreate tables
    console.log('✓ Using existing database tables (sync disabled)')

    // Connect to Redis (optional for testing)
    const redisConnected = await connectRedis()
    if (!redisConnected) {
      console.warn('⚠ Redis not available - job queue disabled')
      console.warn('⚠ PDF conversions will not work without Redis')
    } else {
      // Initialize Bull queues first
      const { initializeQueues } = await import('./config/redis')
      initializeQueues()

      // Then import and initialize job workers
      const { initializeConversionWorker } = await import('./jobs/conversion.job')
      const { initializeCleanupWorker } = await import('./jobs/cleanup.job')

      initializeConversionWorker()
      initializeCleanupWorker()

      console.log('✓ Job workers initialized')
    }

    // Initialize monthly quota reset cron job
    const { initializeQuotaResetJob } = await import('./jobs/quota-reset.job')
    const quotaResetJob = initializeQuotaResetJob()
    if (quotaResetJob) {
      console.log('✓ Monthly quota reset scheduled')
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('✓ PDFLab API Server running')
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`✓ Port: ${PORT}`)
      console.log(`✓ Health check: http://localhost:${PORT}/health`)
      console.log(`✓ API endpoint: http://localhost:${PORT}/api`)
    })
  } catch (error) {
    console.error('✗ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`)

  try {
    // Close queues and Redis
    await closeQueues()

    // Close database connection
    const { sequelize } = await import('./config/database')
    await sequelize.close()
    console.log('✓ Database connection closed')

    console.log('✓ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    console.error('✗ Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

// Start the server
startServer()

