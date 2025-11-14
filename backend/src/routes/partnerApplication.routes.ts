import express from 'express'
import {
  submitApplication,
  getApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  flagApplication
} from '../controllers/partnerApplication.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/admin.middleware'

const router = express.Router()

// Public routes
router.post('/submit', submitApplication)

// Admin routes (protected)
router.get('/', authenticate, requireAdmin, getApplications)
router.get('/:id', authenticate, requireAdmin, getApplication)
router.post('/:id/approve', authenticate, requireAdmin, approveApplication)
router.post('/:id/reject', authenticate, requireAdmin, rejectApplication)
router.post('/:id/flag', authenticate, requireAdmin, flagApplication)

export default router

