#!/usr/bin/env tsx
"use strict";
/**
 * PDF Tracker Database Migration
 * Creates the pdf_tracker_config and pdf_tracker_reports tables
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const PdfTrackerConfig_1 = __importDefault(require("../models/PdfTrackerConfig"));
const PdfTrackerReport_1 = __importDefault(require("../models/PdfTrackerReport"));
const logger_1 = __importDefault(require("../config/logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Path to existing JSON files (from backend/src/scripts -> project_root/scripts/pdf-tracker)
// When running via tsx: __dirname is backend/src/scripts
// When running via dist: __dirname is backend/dist/scripts
const TRACKER_DIR = path_1.default.resolve(__dirname, '..', '..', '..', 'scripts', 'pdf-tracker');
const CONFIG_FILE = path_1.default.join(TRACKER_DIR, 'tracker_config.json');
const RESULTS_FILE = path_1.default.join(TRACKER_DIR, 'tracker_results.json');
async function runMigration() {
    try {
        logger_1.default.info('Starting PDF Tracker database migration...');
        logger_1.default.info(`Database config: host=${process.env['DB_HOST'] ?? 'localhost'}, database=${process.env['DB_NAME'] ?? 'pdflab'}`);
        // Test connection
        try {
            await database_1.sequelize.authenticate();
            logger_1.default.info('[OK] Database connection established');
        }
        catch (connError) {
            const error = connError;
            logger_1.default.error('Database connection failed:', {
                message: error.message,
                code: error.code,
                errno: error.errno
            });
            console.error('\n Cannot connect to MySQL database.');
            console.error('Please ensure MySQL is running and the following environment variables are set:');
            console.error('  DB_HOST=' + (process.env['DB_HOST'] ?? 'localhost'));
            console.error('  DB_PORT=' + (process.env['DB_PORT'] ?? '3306'));
            console.error('  DB_USER=' + (process.env['DB_USER'] ?? 'pdflab'));
            console.error('  DB_NAME=' + (process.env['DB_NAME'] ?? 'pdflab'));
            console.error('\nError details:', error.message);
            process.exit(1);
        }
        // Sync PdfTrackerConfig model (creates table if not exists)
        await PdfTrackerConfig_1.default.sync({ alter: false });
        logger_1.default.info('[OK] pdf_tracker_config table created/verified');
        // Sync PdfTrackerReport model (creates table if not exists)
        await PdfTrackerReport_1.default.sync({ alter: false });
        logger_1.default.info('[OK] pdf_tracker_reports table created/verified');
        // Verify tables were created
        const configTable = await database_1.sequelize.getQueryInterface().describeTable('pdf_tracker_config');
        logger_1.default.info('pdf_tracker_config columns: ' + Object.keys(configTable).join(', '));
        const reportsTable = await database_1.sequelize.getQueryInterface().describeTable('pdf_tracker_reports');
        logger_1.default.info('pdf_tracker_reports columns: ' + Object.keys(reportsTable).join(', '));
        // Migrate existing JSON data
        logger_1.default.info('');
        logger_1.default.info('Migrating existing JSON data...');
        // Migrate config
        if (fs_1.default.existsSync(CONFIG_FILE)) {
            const jsonConfig = JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf-8'));
            // Check if config already exists
            const existingConfig = await PdfTrackerConfig_1.default.findOne({ where: { is_active: true } });
            if (existingConfig === null) {
                await PdfTrackerConfig_1.default.create({
                    subreddits: jsonConfig.subreddits,
                    pdf_keywords: jsonConfig.pdf_keywords,
                    complaint_keywords: jsonConfig.complaint_keywords,
                    viral_threshold: jsonConfig.viral_threshold,
                    is_active: true
                });
                logger_1.default.info('[OK] Migrated config from JSON');
            }
            else {
                logger_1.default.info('[SKIP] Config already exists in database');
            }
        }
        else {
            logger_1.default.info('[SKIP] No config JSON file found');
        }
        // Migrate reports
        if (fs_1.default.existsSync(RESULTS_FILE)) {
            const jsonResults = JSON.parse(fs_1.default.readFileSync(RESULTS_FILE, 'utf-8'));
            let migratedCount = 0;
            let skippedCount = 0;
            if (jsonResults.reports.length > 0) {
                for (const report of jsonResults.reports) {
                    try {
                        // Check if report already exists
                        const existing = await PdfTrackerReport_1.default.findOne({
                            where: { report_date: report.date }
                        });
                        if (existing === null) {
                            const configSnapshot = {
                                subreddits: report.subreddits_monitored,
                                pdf_keywords: [],
                                complaint_keywords: [],
                                viral_threshold: report.viral_threshold
                            };
                            await PdfTrackerReport_1.default.create({
                                report_date: report.date,
                                generated_at: new Date(report.generated.replace(' ', 'T')),
                                stats: report.stats,
                                subreddit_results: report.subreddit_results,
                                config_snapshot: configSnapshot
                            });
                            migratedCount++;
                        }
                        else {
                            skippedCount++;
                        }
                    }
                    catch (err) {
                        logger_1.default.error('Error migrating report: ' + report.date, { error: err });
                    }
                }
                logger_1.default.info(`[OK] Migrated ${String(migratedCount)} reports, skipped ${String(skippedCount)} existing`);
            }
        }
        else {
            logger_1.default.info('[SKIP] No results JSON file found');
        }
        logger_1.default.info('');
        logger_1.default.info('[DONE] PDF Tracker migration completed successfully!');
        process.exit(0);
    }
    catch (error) {
        const err = error;
        logger_1.default.error('Migration failed:', {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        console.error('\n Migration failed:', err.message);
        process.exit(1);
    }
}
void runMigration();
//# sourceMappingURL=migrate-pdf-tracker.js.map