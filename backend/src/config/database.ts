import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import logger from './logger'

dotenv.config()

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '3306'),
  username: process.env['DB_USER'] || 'pdflab',
  password: process.env['DB_PASSWORD'] || '',
  database: process.env['DB_NAME'] || 'pdflab',
  logging: process.env['NODE_ENV'] === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
})

export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate()
    logger.info('Database connection established successfully', {
      host: process.env['DB_HOST'],
      database: process.env['DB_NAME']
    })
    return true
  } catch (error) {
    logger.error('Unable to connect to database', {
      error: error instanceof Error ? error.message : String(error),
      host: process.env['DB_HOST'],
      database: process.env['DB_NAME']
    })
    return false
  }
}

export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    // Skip alter to avoid "too many keys" error - use migrations instead
    await sequelize.sync({ force, alter: false })
    logger.info('Database synchronized successfully', { force })
  } catch (error) {
    logger.error('Database sync failed', {
      error: error instanceof Error ? error.message : String(error),
      force
    })
    throw error
  }
}
