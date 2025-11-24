#!/usr/bin/env tsx

/**
 * Database Migration Runner
 * Runs the batch_jobs table migration
 */

import { sequelize } from '../config/database'
import { BatchJob } from '../models/BatchJob'
import logger from '../config/logger'

async function runMigration() {
  try {
    logger.info('🔄 Starting database migration...')

    // Test connection
    await sequelize.authenticate()
    logger.info('✓ Database connection established')

    // Sync BatchJob model (creates table if not exists)
    await BatchJob.sync({ alter: false })
    logger.info('✓ BatchJob table created/verified')

    // Verify table was created
    const tableDescription = await sequelize.getQueryInterface().describeTable('batch_jobs')
    logger.info('\n📊 BatchJob Table Schema:')
    logger.info('Columns:', Object.keys(tableDescription).join(', '))

    logger.info('\n✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Migration failed:', { error: error instanceof Error ? error.message : String(error) })
    process.exit(1)
  }
}

runMigration()
