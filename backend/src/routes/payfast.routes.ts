import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  getPlans,
  initializePayment,
  handleWebhook,
  handleReturn,
  handleCancel,
  getSubscription,
  cancelSubscription,
  getConfig
} from '../controllers/payfast.controller'

const router = Router()

/**
 * Public routes
 */

// Get all pricing plans
router.get('/plans', getPlans)

// Get PayFast configuration status
router.get('/config', getConfig)

// PayFast ITN webhook (no auth required - PayFast sends this)
router.post('/webhook', handleWebhook)

// Return URL (success)
router.get('/return', handleReturn)

// Cancel URL
router.get('/cancel', handleCancel)

/**
 * Protected routes (require authentication)
 */

// Initialize payment
router.post('/initialize', authMiddleware, initializePayment)

// Get subscription details
router.get('/subscription/:id', authMiddleware, getSubscription)

// Cancel subscription
router.post('/cancel-subscription', authMiddleware, cancelSubscription)

export default router
