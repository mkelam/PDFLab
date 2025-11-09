#!/usr/bin/env tsx

/**
 * Database Migration Runner
 * Runs the batch_jobs table migration
 */

import { sequelize } from '../config/database'
import { BatchJob } from '../models/BatchJob'

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...')

    // Test connection
    await sequelize.authenticate()
    console.log('✓ Database connection established')

    // Sync BatchJob model (creates table if not exists)
    await BatchJob.sync({ alter: false })
    console.log('✓ BatchJob table created/verified')

    // Verify table was created
    const tableDescription = await sequelize.getQueryInterface().describeTable('batch_jobs')
    console.log('\n📊 BatchJob Table Schema:')
    console.log('Columns:', Object.keys(tableDescription).join(', '))

    console.log('\n✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
