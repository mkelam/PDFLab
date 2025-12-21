import type { Request, Response } from 'express'
import type { ChildProcess } from 'child_process'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import logger from '../config/logger'
import { PdfTrackerConfig, PdfTrackerReport } from '../models'
import type { TrackerStats, SubredditResult, ConfigSnapshot } from '../models/PdfTrackerReport'

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

// Path to the PDF tracker script (still needed to run the Python scraper)
const TRACKER_DIR = path.join(__dirname, '..', '..', '..', 'scripts', 'pdf-tracker')
const TRACKER_SCRIPT = path.join(TRACKER_DIR, 'pdf_tracker.py')
const CONFIG_FILE = path.join(TRACKER_DIR, 'tracker_config.json')
const RESULTS_FILE = path.join(TRACKER_DIR, 'tracker_results.json')

// Default configuration (fallback)
const DEFAULT_CONFIG: ConfigSnapshot = {
  subreddits: ['GetMotivated', 'LifeProTips', 'GetStudying', 'selfimprovement', 'DecidingToBeBetter', 'gtd'],
  pdf_keywords: ['pdf', 'ebook', 'template', 'download', 'printable'],
  complaint_keywords: ['wont load', 'doesnt work', 'cant open', 'hate', 'broken', 'crash', 'annoying', 'frustrated'],
  viral_threshold: 10
}

// Helper to sync config to JSON file (for Python script compatibility)
const syncConfigToFile = (config: PdfTrackerConfig): void => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      subreddits: config.subreddits,
      pdf_keywords: config.pdf_keywords,
      complaint_keywords: config.complaint_keywords,
      viral_threshold: config.viral_threshold
    }, null, 2))
  } catch (error) {
    logger.error('Error syncing config to file', { error })
  }
}

// Helper to read JSON config from file
const readJsonConfig = (filePath: string): JsonConfig | null => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as JsonConfig
    }
    return null
  } catch (error) {
    logger.error('Error reading JSON config file', { filePath, error })
    return null
  }
}

// Helper to read JSON results from Python script
const readJsonResults = (filePath: string): JsonResults => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as JsonResults
    }
    return { reports: [] }
  } catch (error) {
    logger.error('Error reading JSON results file', { filePath, error })
    return { reports: [] }
  }
}

/**
 * Get PDF tracker configuration
 * GET /api/admin/pdf-tracker/config
 */
export const getConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    let config = await PdfTrackerConfig.getActiveConfig()

    if (config === null) {
      // Create default config if none exists
      config = await PdfTrackerConfig.create({
        subreddits: DEFAULT_CONFIG.subreddits,
        pdf_keywords: DEFAULT_CONFIG.pdf_keywords,
        complaint_keywords: DEFAULT_CONFIG.complaint_keywords,
        viral_threshold: DEFAULT_CONFIG.viral_threshold,
        is_active: true
      })
    }

    res.json({
      config: {
        subreddits: config.subreddits,
        pdf_keywords: config.pdf_keywords,
        complaint_keywords: config.complaint_keywords,
        viral_threshold: config.viral_threshold
      }
    })
  } catch (error) {
    logger.error('Error getting PDF tracker config', { error })
    res.status(500).json({ error: 'Failed to get configuration' })
  }
}

/**
 * Update PDF tracker configuration
 * PUT /api/admin/pdf-tracker/config
 */
export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<JsonConfig>
    const subreddits = body.subreddits
    const pdf_keywords = body.pdf_keywords
    const complaint_keywords = body.complaint_keywords
    const viral_threshold = body.viral_threshold

    const configData = {
      subreddits: Array.isArray(subreddits) ? subreddits : [],
      pdf_keywords: Array.isArray(pdf_keywords) ? pdf_keywords : [],
      complaint_keywords: Array.isArray(complaint_keywords) ? complaint_keywords : [],
      viral_threshold: typeof viral_threshold === 'number' ? viral_threshold : 10
    }

    const config = await PdfTrackerConfig.upsertConfig(configData)

    // Sync to JSON file for Python script
    syncConfigToFile(config)

    logger.info('PDF tracker config updated', { adminId: req.user?.id })

    res.json({
      success: true,
      config: {
        subreddits: config.subreddits,
        pdf_keywords: config.pdf_keywords,
        complaint_keywords: config.complaint_keywords,
        viral_threshold: config.viral_threshold
      }
    })
  } catch (error) {
    logger.error('Error updating PDF tracker config', { error })
    res.status(500).json({ error: 'Failed to update configuration' })
  }
}

/**
 * Add item to configuration
 * POST /api/admin/pdf-tracker/config/add
 */
export const addConfigItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as { category?: string; value?: string }
    const category = body.category
    const value = body.value

    if (typeof category !== 'string' || typeof value !== 'string' || category === '' || value === '') {
      res.status(400).json({ error: 'Category and value are required' })
      return
    }

    const validCategories = ['subreddits', 'pdf_keywords', 'complaint_keywords'] as const
    type ValidCategory = typeof validCategories[number]

    if (!validCategories.includes(category as ValidCategory)) {
      res.status(400).json({ error: 'Invalid category' })
      return
    }

    let config = await PdfTrackerConfig.getActiveConfig()

    if (config === null) {
      config = await PdfTrackerConfig.create({
        subreddits: DEFAULT_CONFIG.subreddits,
        pdf_keywords: DEFAULT_CONFIG.pdf_keywords,
        complaint_keywords: DEFAULT_CONFIG.complaint_keywords,
        viral_threshold: DEFAULT_CONFIG.viral_threshold,
        is_active: true
      })
    }

    // Add item if not already present
    const validCategory = category as ValidCategory
    const currentItems = config[validCategory]
    if (!currentItems.includes(value)) {
      const updatedItems = [...currentItems, value]
      await config.update({ [validCategory]: updatedItems })
    }

    // Sync to JSON file for Python script
    syncConfigToFile(config)

    res.json({
      success: true,
      config: {
        subreddits: config.subreddits,
        pdf_keywords: config.pdf_keywords,
        complaint_keywords: config.complaint_keywords,
        viral_threshold: config.viral_threshold
      }
    })
  } catch (error) {
    logger.error('Error adding config item', { error })
    res.status(500).json({ error: 'Failed to add item' })
  }
}

/**
 * Remove item from configuration
 * POST /api/admin/pdf-tracker/config/remove
 */
export const removeConfigItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as { category?: string; value?: string }
    const category = body.category
    const value = body.value

    if (typeof category !== 'string' || typeof value !== 'string' || category === '' || value === '') {
      res.status(400).json({ error: 'Category and value are required' })
      return
    }

    const validCategories = ['subreddits', 'pdf_keywords', 'complaint_keywords'] as const
    type ValidCategory = typeof validCategories[number]

    if (!validCategories.includes(category as ValidCategory)) {
      res.status(400).json({ error: 'Invalid category' })
      return
    }

    const config = await PdfTrackerConfig.getActiveConfig()

    if (config === null) {
      res.status(404).json({ error: 'Configuration not found' })
      return
    }

    // Remove item
    const validCategory = category as ValidCategory
    const currentItems = config[validCategory]
    const updatedItems = currentItems.filter((item: string) => item !== value)
    await config.update({ [validCategory]: updatedItems })

    // Sync to JSON file for Python script
    syncConfigToFile(config)

    res.json({
      success: true,
      config: {
        subreddits: config.subreddits,
        pdf_keywords: config.pdf_keywords,
        complaint_keywords: config.complaint_keywords,
        viral_threshold: config.viral_threshold
      }
    })
  } catch (error) {
    logger.error('Error removing config item', { error })
    res.status(500).json({ error: 'Failed to remove item' })
  }
}

/**
 * Get PDF tracker results
 * GET /api/admin/pdf-tracker/results
 */
export const getResults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const reports = await PdfTrackerReport.findAll({
      order: [['report_date', 'DESC']],
      limit: 30
    })

    // Transform to match the expected frontend format
    const formattedReports = reports.map(report => ({
      date: report.report_date,
      generated: report.generated_at.toISOString().replace('T', ' ').substring(0, 19),
      subreddits_monitored: report.config_snapshot.subreddits,
      viral_threshold: report.config_snapshot.viral_threshold,
      stats: report.stats,
      subreddit_results: report.subreddit_results
    }))

    res.json({ reports: formattedReports })
  } catch (error) {
    logger.error('Error getting PDF tracker results', { error })
    res.status(500).json({ error: 'Failed to get results' })
  }
}

/**
 * Get specific report by date
 * GET /api/admin/pdf-tracker/results/:date
 */
export const getReportByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const dateParam = req.params['date']

    if (typeof dateParam !== 'string' || dateParam === '') {
      res.status(400).json({ error: 'Date parameter is required' })
      return
    }

    const report = await PdfTrackerReport.findOne({
      where: { report_date: dateParam }
    })

    if (report === null) {
      res.status(404).json({ error: 'Report not found' })
      return
    }

    res.json({
      report: {
        date: report.report_date,
        generated: report.generated_at.toISOString().replace('T', ' ').substring(0, 19),
        subreddits_monitored: report.config_snapshot.subreddits,
        viral_threshold: report.config_snapshot.viral_threshold,
        stats: report.stats,
        subreddit_results: report.subreddit_results
      }
    })
  } catch (error) {
    logger.error('Error getting report by date', { error })
    res.status(500).json({ error: 'Failed to get report' })
  }
}

/**
 * Run the PDF tracker
 * POST /api/admin/pdf-tracker/run
 */
export const runTracker = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if script exists
    if (!fs.existsSync(TRACKER_SCRIPT)) {
      res.status(500).json({ error: 'Tracker script not found' })
      return
    }

    // Ensure config is synced to JSON file before running
    const config = await PdfTrackerConfig.getActiveConfig()
    if (config !== null) {
      syncConfigToFile(config)
    }

    logger.info('Running PDF tracker', { adminId: req.user?.id })

    // Run the Python script
    const python: ChildProcess = spawn('python', [TRACKER_SCRIPT], {
      cwd: TRACKER_DIR,
      env: { ...process.env }
    })

    let stdout = ''
    let stderr = ''

    python.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    python.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    python.on('close', (code: number | null) => {
      void (async (): Promise<void> => {
        if (code === 0) {
          logger.info('PDF tracker completed successfully')

          try {
            // Read results from JSON file (written by Python script)
            const results = readJsonResults(RESULTS_FILE)

            if (results.reports.length > 0) {
              const latestResult = results.reports[0]
              if (latestResult === undefined) {
                res.json({
                  success: true,
                  message: 'Tracker completed but no results found',
                  output: stdout,
                  report: null
                })
                return
              }

              // Get current config for snapshot
              const currentConfig = await PdfTrackerConfig.getActiveConfig()
              const configSnapshot: ConfigSnapshot = currentConfig !== null ? {
                subreddits: currentConfig.subreddits,
                pdf_keywords: currentConfig.pdf_keywords,
                complaint_keywords: currentConfig.complaint_keywords,
                viral_threshold: currentConfig.viral_threshold
              } : DEFAULT_CONFIG

              // Upsert the report (update if same date exists, create if not)
              const [report, created] = await PdfTrackerReport.upsert({
                report_date: latestResult.date,
                generated_at: new Date(latestResult.generated.replace(' ', 'T')),
                stats: latestResult.stats,
                subreddit_results: latestResult.subreddit_results,
                config_snapshot: configSnapshot
              })

              logger.info('Report saved to database', { date: latestResult.date, created, reportId: report.id })

              res.json({
                success: true,
                message: 'Tracker completed successfully',
                output: stdout,
                report: {
                  date: latestResult.date,
                  generated: latestResult.generated,
                  stats: latestResult.stats,
                  subreddit_results: latestResult.subreddit_results
                }
              })
            } else {
              res.json({
                success: true,
                message: 'Tracker completed but no results found',
                output: stdout,
                report: null
              })
            }
          } catch (dbError) {
            logger.error('Error saving report to database', { error: dbError })
            res.status(500).json({
              success: false,
              error: 'Tracker ran but failed to save to database',
              details: String(dbError)
            })
          }
        } else {
          logger.error('PDF tracker failed', { code, stderr })
          res.status(500).json({
            success: false,
            error: 'Tracker failed',
            details: stderr !== '' ? stderr : stdout
          })
        }
      })()
    })

    python.on('error', (error: Error) => {
      logger.error('Failed to spawn PDF tracker', { error })
      res.status(500).json({
        success: false,
        error: 'Failed to run tracker',
        details: error.message
      })
    })

  } catch (error) {
    logger.error('Error running PDF tracker', { error })
    res.status(500).json({ error: 'Failed to run tracker' })
  }
}

/**
 * Get tracker stats
 * GET /api/admin/pdf-tracker/stats
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await PdfTrackerConfig.getActiveConfig()
    const totalReports = await PdfTrackerReport.count()
    const latestReport = await PdfTrackerReport.findOne({
      order: [['report_date', 'DESC']]
    })

    const stats = {
      totalReports,
      subredditsMonitored: config?.subreddits.length ?? 0,
      pdfKeywords: config?.pdf_keywords.length ?? 0,
      complaintKeywords: config?.complaint_keywords.length ?? 0,
      viralThreshold: config?.viral_threshold ?? 10,
      latestReport: latestReport !== null ? {
        date: latestReport.report_date,
        generated: latestReport.generated_at.toISOString().replace('T', ' ').substring(0, 19),
        totalPostsScanned: latestReport.stats.total_posts_scanned,
        pdfPostsFound: latestReport.stats.pdf_posts_found,
        complaintsFound: latestReport.stats.complaints_found
      } : null
    }

    res.json({ stats })
  } catch (error) {
    logger.error('Error getting PDF tracker stats', { error })
    res.status(500).json({ error: 'Failed to get stats' })
  }
}

/**
 * Migrate existing JSON data to database
 * POST /api/admin/pdf-tracker/migrate
 */
export const migrateJsonToDatabase = async (_req: Request, res: Response): Promise<void> => {
  try {
    let migratedConfig = false
    let migratedReports = 0

    // Migrate config
    const jsonConfig = readJsonConfig(CONFIG_FILE)
    if (jsonConfig !== null) {
      await PdfTrackerConfig.upsertConfig({
        subreddits: jsonConfig.subreddits,
        pdf_keywords: jsonConfig.pdf_keywords,
        complaint_keywords: jsonConfig.complaint_keywords,
        viral_threshold: jsonConfig.viral_threshold
      })
      migratedConfig = true
      logger.info('Migrated config from JSON to database')
    }

    // Migrate reports
    const jsonResults = readJsonResults(RESULTS_FILE)
    if (jsonResults.reports.length > 0) {
      for (const report of jsonResults.reports) {
        try {
          await PdfTrackerReport.upsert({
            report_date: report.date,
            generated_at: new Date(report.generated.replace(' ', 'T')),
            stats: report.stats,
            subreddit_results: report.subreddit_results,
            config_snapshot: {
              subreddits: report.subreddits_monitored,
              pdf_keywords: jsonConfig?.pdf_keywords ?? [],
              complaint_keywords: jsonConfig?.complaint_keywords ?? [],
              viral_threshold: report.viral_threshold
            }
          })
          migratedReports++
        } catch (err) {
          logger.error('Error migrating report', { date: report.date, error: err })
        }
      }
      logger.info('Migrated reports from JSON to database', { count: migratedReports })
    }

    res.json({
      success: true,
      migratedConfig,
      migratedReports
    })
  } catch (error) {
    logger.error('Error migrating JSON to database', { error })
    res.status(500).json({ error: 'Failed to migrate data' })
  }
}
