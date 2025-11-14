#!/usr/bin/env tsx
"use strict";
/**
 * Database Migration Runner
 * Runs the batch_jobs table migration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const BatchJob_1 = require("../models/BatchJob");
async function runMigration() {
    try {
        console.log('🔄 Starting database migration...');
        // Test connection
        await database_1.sequelize.authenticate();
        console.log('✓ Database connection established');
        // Sync BatchJob model (creates table if not exists)
        await BatchJob_1.BatchJob.sync({ alter: false });
        console.log('✓ BatchJob table created/verified');
        // Verify table was created
        const tableDescription = await database_1.sequelize.getQueryInterface().describeTable('batch_jobs');
        console.log('\n📊 BatchJob Table Schema:');
        console.log('Columns:', Object.keys(tableDescription).join(', '));
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
runMigration();
//# sourceMappingURL=run-migration.js.map