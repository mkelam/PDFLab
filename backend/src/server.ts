import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { testConnection, syncDatabase } from './config/database'
import { connectRedis, closeQueues } from './config/redis'
import { apiLimiter } from './middleware/ratelimit.middleware'

// Import routes
import authRoutes from './routes/auth.routes'
import conversionRoutes from './routes/conversion.routes'
// NOTE: PayFast routes temporarily disabled due to tsx module cache issue
// TODO: Uncomment after restarting machine or clearing tsx cache
// import payfastRoutes from './routes/payfast.routes'

// Load environment variables
dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '3001')

// =====================
// Middleware
// =====================

// Security headers
app.use(helmet())

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
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
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

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
  res.status(statusCode).json(health)
})

// API routes
app.use('/api/auth', authRoutes)
// NOTE: PayFast routes temporarily disabled - uncomment after restart
// app.use('/api/payfast', payfastRoutes)
app.use('/api', conversionRoutes)

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'PDFLab API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      payfast: '/api/payfast',
      conversion: '/api'
    }
  })
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
    if (process.env.NODE_ENV === 'development') {
      await syncDatabase(false) // Don't force recreate tables
    }

    // Connect to Redis
    const redisConnected = await connectRedis()
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis')
    }

    // Import job workers (this will start processing)
    await import('./jobs/conversion.job')
    await import('./jobs/cleanup.job')
    console.log('✓ Job workers initialized')

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
