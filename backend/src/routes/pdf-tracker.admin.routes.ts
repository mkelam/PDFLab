/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'
import {
  getConfig,
  updateConfig,
  addConfigItem,
  removeConfigItem,
  getResults,
  getReportByDate,
  runTracker,
  getStats,
  migrateJsonToDatabase
} from '../controllers/pdf-tracker.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/admin.middleware'

const router = Router()

// All routes require authentication and admin permissions
// GET /api/admin/pdf-tracker/config - Get configuration
router.get('/pdf-tracker/config', requireAuth, requirePermission('system.view'), getConfig)

// PUT /api/admin/pdf-tracker/config - Update configuration
router.put('/pdf-tracker/config', requireAuth, requirePermission('system.configure'), updateConfig)

// POST /api/admin/pdf-tracker/config/add - Add item to configuration
router.post('/pdf-tracker/config/add', requireAuth, requirePermission('system.configure'), addConfigItem)

// POST /api/admin/pdf-tracker/config/remove - Remove item from configuration
router.post('/pdf-tracker/config/remove', requireAuth, requirePermission('system.configure'), removeConfigItem)

// GET /api/admin/pdf-tracker/results - Get all results
router.get('/pdf-tracker/results', requireAuth, requirePermission('system.view'), getResults)

// GET /api/admin/pdf-tracker/results/:date - Get report by date
router.get('/pdf-tracker/results/:date', requireAuth, requirePermission('system.view'), getReportByDate)

// POST /api/admin/pdf-tracker/run - Run the tracker
router.post('/pdf-tracker/run', requireAuth, requirePermission('system.configure'), runTracker)

// GET /api/admin/pdf-tracker/stats - Get stats
router.get('/pdf-tracker/stats', requireAuth, requirePermission('system.view'), getStats)

// POST /api/admin/pdf-tracker/migrate - Migrate JSON data to database
router.post('/pdf-tracker/migrate', requireAuth, requirePermission('system.configure'), migrateJsonToDatabase)

export default router
