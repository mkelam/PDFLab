import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const { combine, timestamp, json, printf, colorize, errors } = winston.format

// Custom format for console (development)
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`
  }

  return msg
})

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),  // Include stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()  // JSON format for production
  ),
  defaultMeta: {
    service: 'pdflab-backend',
    environment: process.env.NODE_ENV,
    hostname: process.env.HOSTNAME || 'unknown'
  },
  transports: []
})

// Console transport (development)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      consoleFormat
    )
  }))
}

// File transports (production)
if (process.env.NODE_ENV === 'production') {
  // All logs (daily rotation)
  logger.add(new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',  // Keep 30 days
    format: json()
  }))

  // Error logs (daily rotation)
  logger.add(new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: json()
  }))

  // HTTP logs (daily rotation)
  logger.add(new DailyRotateFile({
    filename: 'logs/http-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '14d',  // Keep 14 days (high volume)
    format: json()
  }))
}

export default logger
