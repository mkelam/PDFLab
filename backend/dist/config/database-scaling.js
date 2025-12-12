"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelizeScaled = exports.sequelizeReplica = exports.sequelizePrimary = void 0;
exports.testDatabaseConnections = testDatabaseConnections;
exports.getPoolStats = getPoolStats;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
dotenv_1.default.config();
/**
 * Database Scaling Configuration - Phase 2
 *
 * Implements read/write splitting with MySQL primary-replica setup
 * for improved performance and scalability.
 */
// Primary database (writes)
exports.sequelizePrimary = new sequelize_1.Sequelize({
    dialect: 'mysql',
    host: process.env['DB_HOST'] || 'mysql-primary',
    port: parseInt(process.env['DB_PORT'] || '3306'),
    username: process.env['DB_USER'] || 'pdflab',
    password: process.env['DB_PASSWORD'] || '',
    database: process.env['DB_NAME'] || 'pdflab_production',
    logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger_1.default.debug(msg) : false,
    pool: {
        max: 10, // Maximum connections for writes
        min: 2, // Minimum idle connections
        acquire: 30000, // 30 seconds timeout
        idle: 10000 // 10 seconds idle timeout
    },
    dialectOptions: {
        connectTimeout: 10000,
        timezone: '+00:00'
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});
// Replica database (reads)
exports.sequelizeReplica = new sequelize_1.Sequelize({
    dialect: 'mysql',
    host: process.env['DB_REPLICA_HOST'] || 'mysql-replica',
    port: parseInt(process.env['DB_REPLICA_PORT'] || '3307'),
    username: process.env['DB_USER'] || 'pdflab',
    password: process.env['DB_PASSWORD'] || '',
    database: process.env['DB_NAME'] || 'pdflab_production',
    logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger_1.default.debug(msg) : false,
    pool: {
        max: 20, // More connections for reads
        min: 5, // Higher minimum for read-heavy workload
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        connectTimeout: 10000,
        timezone: '+00:00'
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});
// Unified connection with automatic read/write splitting
exports.sequelizeScaled = new sequelize_1.Sequelize({
    dialect: 'mysql',
    database: process.env['DB_NAME'] || 'pdflab_production',
    username: process.env['DB_USER'] || 'pdflab',
    password: process.env['DB_PASSWORD'] || '',
    logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger_1.default.debug(msg) : false,
    pool: {
        max: 30, // Total connection pool
        min: 5,
        acquire: 30000,
        idle: 10000
    },
    replication: {
        read: [
            {
                host: process.env['DB_REPLICA_HOST'] || 'mysql-replica',
                port: parseInt(process.env['DB_REPLICA_PORT'] || '3307'),
                username: process.env['DB_USER'] || 'pdflab',
                password: process.env['DB_PASSWORD'] || ''
            }
        ],
        write: {
            host: process.env['DB_HOST'] || 'mysql-primary',
            port: parseInt(process.env['DB_PORT'] || '3306'),
            username: process.env['DB_USER'] || 'pdflab',
            password: process.env['DB_PASSWORD'] || ''
        }
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});
/**
 * Test database connections
 */
async function testDatabaseConnections() {
    const results = {
        primary: false,
        replica: false,
        scaled: false
    };
    // Test primary
    try {
        await exports.sequelizePrimary.authenticate();
        logger_1.default.info('Primary database connection established', {
            host: process.env['DB_HOST'],
            port: process.env['DB_PORT']
        });
        results.primary = true;
    }
    catch (error) {
        logger_1.default.error('Primary database connection failed', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
    // Test replica
    try {
        await exports.sequelizeReplica.authenticate();
        logger_1.default.info('Replica database connection established', {
            host: process.env['DB_REPLICA_HOST'],
            port: process.env['DB_REPLICA_PORT']
        });
        results.replica = true;
    }
    catch (error) {
        logger_1.default.error('Replica database connection failed', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
    // Test scaled (unified)
    try {
        await exports.sequelizeScaled.authenticate();
        logger_1.default.info('Scaled database connection established (read/write split)');
        results.scaled = true;
    }
    catch (error) {
        logger_1.default.error('Scaled database connection failed', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
    return results;
}
/**
 * Get connection pool statistics
 */
function getPoolStats() {
    const primaryPool = exports.sequelizePrimary.connectionManager.pool;
    const replicaPool = exports.sequelizeReplica.connectionManager.pool;
    const scaledPool = exports.sequelizeScaled.connectionManager.pool;
    return {
        primary: {
            size: primaryPool?.size || 0,
            available: primaryPool?.available || 0,
            using: primaryPool?.using || 0,
            waiting: primaryPool?.waiting || 0
        },
        replica: {
            size: replicaPool?.size || 0,
            available: replicaPool?.available || 0,
            using: replicaPool?.using || 0,
            waiting: replicaPool?.waiting || 0
        },
        scaled: {
            size: scaledPool?.size || 0,
            available: scaledPool?.available || 0,
            using: scaledPool?.using || 0,
            waiting: scaledPool?.waiting || 0
        }
    };
}
// Export scaled connection as default for new code
exports.default = exports.sequelizeScaled;
//# sourceMappingURL=database-scaling.js.map