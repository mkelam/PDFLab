/**
 * Fix User Quotas Script
 * Run this to repair users who have incorrect quota limits after plan upgrades
 *
 * Usage:
 *   npx tsx src/scripts/fix-user-quotas.ts
 */

import { sequelize } from '../config/database'
import { User } from '../models/User'
import { fixAllUserQuotas, getQuotaInfo } from '../utils/quota.utils'
import logger from '../config/logger'

async function main() {
  try {
    logger.info('🔧 PDFLab Quota Fix Script')
    logger.info('=' .repeat(50))

    // Connect to database
    logger.info('\n📡 Connecting to database...')
    await sequelize.authenticate()
    logger.info('✓ Database connected')

    // Get all users
    const users = await User.findAll()
    logger.info(`\n📊 Found ${users.length} users`)

    // Show current state
    logger.info('\n📋 Current Quota Status:')
    logger.info('-'.repeat(80))
    logger.info('Email'.padEnd(30), 'Plan'.padEnd(15), 'Current Limit'.padEnd(15), 'Expected'.padEnd(15), 'Status')
    logger.info('-'.repeat(80))

    for (const user of users) {
      const info = getQuotaInfo(user)
      const status = info.is_synced ? '✓ OK' : '❌ MISMATCH'
      const currentLimit = info.conversions_limit === -1 ? 'Unlimited' : String(info.conversions_limit)
      const expectedLimit = info.expected_limit === -1 ? 'Unlimited' : String(info.expected_limit)

      console.log(
        user.email.padEnd(30),
        user.plan.padEnd(15),
        currentLimit.padEnd(15),
        expectedLimit.padEnd(15),
        status
      )
    }

    // Ask for confirmation (in real script, you'd use readline)
    logger.info('\n⚠️  About to fix quotas for all users')
    logger.info('   This will update conversions_limit to match their plan')

    // Fix quotas
    const result = await fixAllUserQuotas()

    logger.info('\n✅ Quota Fix Complete!')
    logger.info(`   Fixed: ${result.fixed} users`)
    logger.info(`   Total: ${result.total} users`)
    logger.info(`   Unchanged: ${result.total - result.fixed} users`)

    // Show updated state
    logger.info('\n📋 Updated Quota Status:')
    logger.info('-'.repeat(80))
    logger.info('Email'.padEnd(30), 'Plan'.padEnd(15), 'Limit'.padEnd(15), 'Used'.padEnd(10), 'Remaining')
    logger.info('-'.repeat(80))

    const updatedUsers = await User.findAll()
    for (const user of updatedUsers) {
      const info = getQuotaInfo(user)
      const limit = info.conversions_limit === -1 ? 'Unlimited' : String(info.conversions_limit)
      const remaining = info.conversions_remaining === 'unlimited' ? 'Unlimited' : String(info.conversions_remaining)

      console.log(
        user.email.padEnd(30),
        user.plan.padEnd(15),
        limit.padEnd(15),
        String(user.conversions_used).padEnd(10),
        remaining
      )
    }

    logger.info('\n🎉 All quotas are now synced!')

  } catch (error) {
    logger.error('\n❌ Error:', { error: error instanceof Error ? error.message : String(error) })
    process.exit(1)
  } finally {
    await sequelize.close()
    process.exit(0)
  }
}

main()
