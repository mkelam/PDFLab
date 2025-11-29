/**
 * Migration Runner: Add Founder Application Fields
 * Run with: npx ts-node run-migration-016.ts
 */

import { query } from './src/config/database'

async function runMigration() {
  console.log('Starting migration 016: Add Founder Application Fields...')

  try {
    // Add columns
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_status VARCHAR(20) DEFAULT 'none';
    `)
    console.log('✓ Added founder_application_status column')

    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_reason TEXT;
    `)
    console.log('✓ Added founder_application_reason column')

    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_use_case TEXT;
    `)
    console.log('✓ Added founder_application_use_case column')

    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_submitted_at TIMESTAMP;
    `)
    console.log('✓ Added founder_application_submitted_at column')

    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_reviewed_at TIMESTAMP;
    `)
    console.log('✓ Added founder_application_reviewed_at column')

    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_reviewed_by UUID;
    `)
    console.log('✓ Added founder_application_reviewed_by column')

    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_rejection_reason TEXT;
    `)
    console.log('✓ Added founder_rejection_reason column')

    // Add index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_founder_application_status ON users(founder_application_status);
    `)
    console.log('✓ Created index idx_users_founder_application_status')

    console.log('\n✅ Migration 016 completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

runMigration()
