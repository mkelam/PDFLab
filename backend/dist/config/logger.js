"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const { combine, timestamp, json, printf, colorize, errors } = winston_1.default.format;
// Custom format for console (development)
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
// Create logger instance
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), // Include stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json() // JSON format for production
    ),
    defaultMeta: {
        service: 'pdflab-backend',
        environment: process.env.NODE_ENV,
        hostname: process.env.HOSTNAME || 'unknown'
    },
    transports: []
});
// Console transport (development)
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: combine(colorize(), consoleFormat)
    }));
}
// File transports (production)
if (process.env.NODE_ENV === 'production') {
    // All logs (daily rotation)
    logger.add(new winston_daily_rotate_file_1.default({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // Keep 30 days
        format: json()
    }));
    // Error logs (daily rotation)
    logger.add(new winston_daily_rotate_file_1.default({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: json()
    }));
    // HTTP logs (daily rotation)
    logger.add(new winston_daily_rotate_file_1.default({
        filename: 'logs/http-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        maxSize: '20m',
        maxFiles: '14d', // Keep 14 days (high volume)
        format: json()
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map