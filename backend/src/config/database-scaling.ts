import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import logger from './logger'

dotenv.config()

/**
 * Database Scaling Configuration - Phase 2
 *
 * Implements read/write splitting with MySQL primary-replica setup
 * for improved performance and scalability.
 */

// Primary database (writes)
export const sequelizePrimary = new Sequelize({
  dialect: 'mysql',
  host: process.env['DB_HOST'] || 'mysql-primary',
  port: parseInt(process.env['DB_PORT'] || '3306'),
  username: process.env['DB_USER'] || 'pdflab',
  password: process.env['DB_PASSWORD'] || '',
  database: process.env['DB_NAME'] || 'pdflab_production',
  logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,           // Maximum connections for writes
    min: 2,            // Minimum idle connections
    acquire: 30000,    // 30 seconds timeout
    idle: 10000        // 10 seconds idle timeout
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
})

// Replica database (reads)
export const sequelizeReplica = new Sequelize({
  dialect: 'mysql',
  host: process.env['DB_REPLICA_HOST'] || 'mysql-replica',
  port: parseInt(process.env['DB_REPLICA_PORT'] || '3307'),
  username: process.env['DB_USER'] || 'pdflab',
  password: process.env['DB_PASSWORD'] || '',
  database: process.env['DB_NAME'] || 'pdflab_production',
  logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 20,           // More connections for reads
    min: 5,            // Higher minimum for read-heavy workload
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
})

// Unified connection with automatic read/write splitting
export const sequelizeScaled = new Sequelize({
  dialect: 'mysql',
  database: process.env['DB_NAME'] || 'pdflab_production',
  username: process.env['DB_USER'] || 'pdflab',
  password: process.env['DB_PASSWORD'] || '',
  logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 30,           // Total connection pool
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
})

/**
 * Test database connections
 */
export async function testDatabaseConnections(): Promise<{
  primary: boolean
  replica: boolean
  scaled: boolean
}> {
  const results = {
    primary: false,
    replica: false,
    scaled: false
  }

  // Test primary
  try {
    await sequelizePrimary.authenticate()
    logger.info('Primary database connection established', {
      host: process.env['DB_HOST'],
      port: process.env['DB_PORT']
    })
    results.primary = true
  } catch (error) {
    logger.error('Primary database connection failed', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  // Test replica
  try {
    await sequelizeReplica.authenticate()
    logger.info('Replica database connection established', {
      host: process.env['DB_REPLICA_HOST'],
      port: process.env['DB_REPLICA_PORT']
    })
    results.replica = true
  } catch (error) {
    logger.error('Replica database connection failed', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  // Test scaled (unified)
  try {
    await sequelizeScaled.authenticate()
    logger.info('Scaled database connection established (read/write split)')
    results.scaled = true
  } catch (error) {
    logger.error('Scaled database connection failed', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  return results
}

/**
 * Get connection pool statistics
 * Note: pool is an internal property of ConnectionManager, we use type assertion
 */
export function getPoolStats() {
  // Type assertion needed as pool is internal to Sequelize's ConnectionManager
  const primaryPool = (sequelizePrimary.connectionManager as any).pool
  const replicaPool = (sequelizeReplica.connectionManager as any).pool
  const scaledPool = (sequelizeScaled.connectionManager as any).pool

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
  }
}

// Export scaled connection as default for new code
export default sequelizeScaled
