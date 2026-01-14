#!/usr/bin/env tsx
"use strict";
/**
 * Database Migration Runner
 * Runs the batch_jobs table migration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const BatchJob_1 = require("../models/BatchJob");
const logger_1 = __importDefault(require("../config/logger"));
async function runMigration() {
    try {
        logger_1.default.info('Starting database migration...');
        // Test connection
        await database_1.sequelize.authenticate();
        logger_1.default.info('Database connection established');
        // Sync BatchJob model (creates table if not exists)
        await BatchJob_1.BatchJob.sync({ alter: false });
        logger_1.default.info('BatchJob table created/verified');
        // Verify table was created
        const tableDescription = await database_1.sequelize.getQueryInterface().describeTable('batch_jobs');
        logger_1.default.info('BatchJob Table Schema:');
        logger_1.default.info('Columns:', Object.keys(tableDescription).join(', '));
        logger_1.default.info('Migration completed successfully!');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Migration failed:', { error: error instanceof Error ? error.message : String(error) });
        process.exit(1);
    }
}
void runMigration();
//# sourceMappingURL=run-migration.js.map