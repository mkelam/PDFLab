"use strict";
/**
 * Fix User Quotas Script
 * Run this to repair users who have incorrect quota limits after plan upgrades
 *
 * Usage:
 *   npx tsx src/scripts/fix-user-quotas.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const quota_utils_1 = require("../utils/quota.utils");
async function main() {
    try {
        console.log('🔧 PDFLab Quota Fix Script');
        console.log('='.repeat(50));
        // Connect to database
        console.log('\n📡 Connecting to database...');
        await database_1.sequelize.authenticate();
        console.log('✓ Database connected');
        // Get all users
        const users = await User_1.User.findAll();
        console.log(`\n📊 Found ${users.length} users`);
        // Show current state
        console.log('\n📋 Current Quota Status:');
        console.log('-'.repeat(80));
        console.log('Email'.padEnd(30), 'Plan'.padEnd(15), 'Current Limit'.padEnd(15), 'Expected'.padEnd(15), 'Status');
        console.log('-'.repeat(80));
        for (const user of users) {
            const info = (0, quota_utils_1.getQuotaInfo)(user);
            const status = info.is_synced ? '✓ OK' : '❌ MISMATCH';
            const currentLimit = info.conversions_limit === -1 ? 'Unlimited' : String(info.conversions_limit);
            const expectedLimit = info.expected_limit === -1 ? 'Unlimited' : String(info.expected_limit);
            console.log(user.email.padEnd(30), user.plan.padEnd(15), currentLimit.padEnd(15), expectedLimit.padEnd(15), status);
        }
        // Ask for confirmation (in real script, you'd use readline)
        console.log('\n⚠️  About to fix quotas for all users');
        console.log('   This will update conversions_limit to match their plan');
        // Fix quotas
        const result = await (0, quota_utils_1.fixAllUserQuotas)();
        console.log('\n✅ Quota Fix Complete!');
        console.log(`   Fixed: ${result.fixed} users`);
        console.log(`   Total: ${result.total} users`);
        console.log(`   Unchanged: ${result.total - result.fixed} users`);
        // Show updated state
        console.log('\n📋 Updated Quota Status:');
        console.log('-'.repeat(80));
        console.log('Email'.padEnd(30), 'Plan'.padEnd(15), 'Limit'.padEnd(15), 'Used'.padEnd(10), 'Remaining');
        console.log('-'.repeat(80));
        const updatedUsers = await User_1.User.findAll();
        for (const user of updatedUsers) {
            const info = (0, quota_utils_1.getQuotaInfo)(user);
            const limit = info.conversions_limit === -1 ? 'Unlimited' : String(info.conversions_limit);
            const remaining = info.conversions_remaining === 'unlimited' ? 'Unlimited' : String(info.conversions_remaining);
            console.log(user.email.padEnd(30), user.plan.padEnd(15), limit.padEnd(15), String(user.conversions_used).padEnd(10), remaining);
        }
        console.log('\n🎉 All quotas are now synced!');
    }
    catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
    finally {
        await database_1.sequelize.close();
        process.exit(0);
    }
}
main();
//# sourceMappingURL=fix-user-quotas.js.map