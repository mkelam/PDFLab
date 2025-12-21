#!/usr/bin/env tsx

/**
 * PDF Tracker Database Migration
 * Creates the pdf_tracker_config and pdf_tracker_reports tables
 */

import { sequelize } from '../config/database'
import PdfTrackerConfig from '../models/PdfTrackerConfig'
import PdfTrackerReport from '../models/PdfTrackerReport'
import type { TrackerStats, SubredditResult, ConfigSnapshot } from '../models/PdfTrackerReport'
import logger from '../config/logger'
import fs from 'fs'
import path from 'path'

// Types for JSON data
interface JsonConfig {
  subreddits: string[]
  pdf_keywords: string[]
  complaint_keywords: string[]
  viral_threshold: number
}

interface JsonReport {
  date: string
  generated: string
  subreddits_monitored: string[]
  viral_threshold: number
  stats: TrackerStats
  subreddit_results: SubredditResult[]
}

interface JsonResults {
  reports: JsonReport[]
}

interface NodeError extends Error {
  code?: string
  errno?: number
}

// Path to existing JSON files (from backend/src/scripts -> project_root/scripts/pdf-tracker)
// When running via tsx: __dirname is backend/src/scripts
// When running via dist: __dirname is backend/dist/scripts
const TRACKER_DIR = path.resolve(__dirname, '..', '..', '..', 'scripts', 'pdf-tracker')
const CONFIG_FILE = path.join(TRACKER_DIR, 'tracker_config.json')
const RESULTS_FILE = path.join(TRACKER_DIR, 'tracker_results.json')

async function runMigration(): Promise<void> {
  try {
    logger.info('Starting PDF Tracker database migration...')
    logger.info(`Database config: host=${process.env['DB_HOST'] ?? 'localhost'}, database=${process.env['DB_NAME'] ?? 'pdflab'}`)

    // Test connection
    try {
      await sequelize.authenticate()
      logger.info('[OK] Database connection established')
    } catch (connError) {
      const error = connError as NodeError
      logger.error('Database connection failed:', {
        message: error.message,
        code: error.code,
        errno: error.errno
      })
      console.error('\n Cannot connect to MySQL database.')
      console.error('Please ensure MySQL is running and the following environment variables are set:')
      console.error('  DB_HOST=' + (process.env['DB_HOST'] ?? 'localhost'))
      console.error('  DB_PORT=' + (process.env['DB_PORT'] ?? '3306'))
      console.error('  DB_USER=' + (process.env['DB_USER'] ?? 'pdflab'))
      console.error('  DB_NAME=' + (process.env['DB_NAME'] ?? 'pdflab'))
      console.error('\nError details:', error.message)
      process.exit(1)
    }

    // Sync PdfTrackerConfig model (creates table if not exists)
    await PdfTrackerConfig.sync({ alter: false })
    logger.info('[OK] pdf_tracker_config table created/verified')

    // Sync PdfTrackerReport model (creates table if not exists)
    await PdfTrackerReport.sync({ alter: false })
    logger.info('[OK] pdf_tracker_reports table created/verified')

    // Verify tables were created
    const configTable = await sequelize.getQueryInterface().describeTable('pdf_tracker_config')
    logger.info('pdf_tracker_config columns: ' + Object.keys(configTable).join(', '))

    const reportsTable = await sequelize.getQueryInterface().describeTable('pdf_tracker_reports')
    logger.info('pdf_tracker_reports columns: ' + Object.keys(reportsTable).join(', '))

    // Migrate existing JSON data
    logger.info('')
    logger.info('Migrating existing JSON data...')

    // Migrate config
    if (fs.existsSync(CONFIG_FILE)) {
      const jsonConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as JsonConfig

      // Check if config already exists
      const existingConfig = await PdfTrackerConfig.findOne({ where: { is_active: true } })

      if (existingConfig === null) {
        await PdfTrackerConfig.create({
          subreddits: jsonConfig.subreddits,
          pdf_keywords: jsonConfig.pdf_keywords,
          complaint_keywords: jsonConfig.complaint_keywords,
          viral_threshold: jsonConfig.viral_threshold,
          is_active: true
        })
        logger.info('[OK] Migrated config from JSON')
      } else {
        logger.info('[SKIP] Config already exists in database')
      }
    } else {
      logger.info('[SKIP] No config JSON file found')
    }

    // Migrate reports
    if (fs.existsSync(RESULTS_FILE)) {
      const jsonResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')) as JsonResults
      let migratedCount = 0
      let skippedCount = 0

      if (jsonResults.reports.length > 0) {
        for (const report of jsonResults.reports) {
          try {
            // Check if report already exists
            const existing = await PdfTrackerReport.findOne({
              where: { report_date: report.date }
            })

            if (existing === null) {
              const configSnapshot: ConfigSnapshot = {
                subreddits: report.subreddits_monitored,
                pdf_keywords: [],
                complaint_keywords: [],
                viral_threshold: report.viral_threshold
              }

              await PdfTrackerReport.create({
                report_date: report.date,
                generated_at: new Date(report.generated.replace(' ', 'T')),
                stats: report.stats,
                subreddit_results: report.subreddit_results,
                config_snapshot: configSnapshot
              })
              migratedCount++
            } else {
              skippedCount++
            }
          } catch (err) {
            logger.error('Error migrating report: ' + report.date, { error: err })
          }
        }
        logger.info(`[OK] Migrated ${String(migratedCount)} reports, skipped ${String(skippedCount)} existing`)
      }
    } else {
      logger.info('[SKIP] No results JSON file found')
    }

    logger.info('')
    logger.info('[DONE] PDF Tracker migration completed successfully!')
    process.exit(0)
  } catch (error) {
    const err = error as NodeError
    logger.error('Migration failed:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    })
    console.error('\n Migration failed:', err.message)
    process.exit(1)
  }
}

void runMigration()
