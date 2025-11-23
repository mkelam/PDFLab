"use strict";
/**
 * Fix User Quotas Script
 * Run this to repair users who have incorrect quota limits after plan upgrades
 *
 * Usage:
 *   npx tsx src/scripts/fix-user-quotas.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const quota_utils_1 = require("../utils/quota.utils");
const logger_1 = __importDefault(require("../config/logger"));
async function main() {
    try {
        logger_1.default.info('🔧 PDFLab Quota Fix Script');
        logger_1.default.info('='.repeat(50));
        // Connect to database
        logger_1.default.info('\n📡 Connecting to database...');
        await database_1.sequelize.authenticate();
        logger_1.default.info('✓ Database connected');
        // Get all users
        const users = await User_1.User.findAll();
        logger_1.default.info(`\n📊 Found ${users.length} users`);
        // Show current state
        logger_1.default.info('\n📋 Current Quota Status:');
        logger_1.default.info('-'.repeat(80));
        logger_1.default.info('Email'.padEnd(30), 'Plan'.padEnd(15), 'Current Limit'.padEnd(15), 'Expected'.padEnd(15), 'Status');
        logger_1.default.info('-'.repeat(80));
        for (const user of users) {
            const info = (0, quota_utils_1.getQuotaInfo)(user);
            const status = info.is_synced ? '✓ OK' : '❌ MISMATCH';
            const currentLimit = info.conversions_limit === -1 ? 'Unlimited' : String(info.conversions_limit);
            const expectedLimit = info.expected_limit === -1 ? 'Unlimited' : String(info.expected_limit);
            console.log(user.email.padEnd(30), user.plan.padEnd(15), currentLimit.padEnd(15), expectedLimit.padEnd(15), status);
        }
        // Ask for confirmation (in real script, you'd use readline)
        logger_1.default.info('\n⚠️  About to fix quotas for all users');
        logger_1.default.info('   This will update conversions_limit to match their plan');
        // Fix quotas
        const result = await (0, quota_utils_1.fixAllUserQuotas)();
        logger_1.default.info('\n✅ Quota Fix Complete!');
        logger_1.default.info(`   Fixed: ${result.fixed} users`);
        logger_1.default.info(`   Total: ${result.total} users`);
        logger_1.default.info(`   Unchanged: ${result.total - result.fixed} users`);
        // Show updated state
        logger_1.default.info('\n📋 Updated Quota Status:');
        logger_1.default.info('-'.repeat(80));
        logger_1.default.info('Email'.padEnd(30), 'Plan'.padEnd(15), 'Limit'.padEnd(15), 'Used'.padEnd(10), 'Remaining');
        logger_1.default.info('-'.repeat(80));
        const updatedUsers = await User_1.User.findAll();
        for (const user of updatedUsers) {
            const info = (0, quota_utils_1.getQuotaInfo)(user);
            const limit = info.conversions_limit === -1 ? 'Unlimited' : String(info.conversions_limit);
            const remaining = info.conversions_remaining === 'unlimited' ? 'Unlimited' : String(info.conversions_remaining);
            console.log(user.email.padEnd(30), user.plan.padEnd(15), limit.padEnd(15), String(user.conversions_used).padEnd(10), remaining);
        }
        logger_1.default.info('\n🎉 All quotas are now synced!');
    }
    catch (error) {
        logger_1.default.error('\n❌ Error:', { error: error instanceof Error ? error.message : String(error) });
        process.exit(1);
    }
    finally {
        await database_1.sequelize.close();
        process.exit(0);
    }
}
main();
//# sourceMappingURL=fix-user-quotas.js.map