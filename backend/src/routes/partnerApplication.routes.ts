import express from 'express'
import {
  submitApplication,
  getApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  flagApplication
} from '../controllers/partnerApplication.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/admin.middleware'

const router = express.Router()

// Public routes
router.post('/submit', submitApplication)

// Admin routes (protected)
router.get('/', requireAuth, requireAdmin, getApplications)
router.get('/:id', requireAuth, requireAdmin, getApplication)
router.post('/:id/approve', requireAuth, requireAdmin, approveApplication)
router.post('/:id/reject', requireAuth, requireAdmin, rejectApplication)
router.post('/:id/flag', requireAuth, requireAdmin, flagApplication)

export default router

