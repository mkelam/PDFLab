import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  getPlans,
  initializePayment,
  handleWebhook,
  handleReturn,
  handleCancel,
  handleError,
  getSubscription,
  cancelSubscription,
  getConfig,
  lookupPayment,
  processRefund,
  validateConnection
} from '../controllers/paygenius.controller'

const router = Router()

/**
 * Public routes
 */

// Get all pricing plans
router.get('/plans', getPlans)

// Get PayGenius configuration status
router.get('/config', getConfig)

// Validate API connection (useful for testing)
router.get('/validate', validateConnection)

// PayGenius webhook (no auth required - PayGenius sends this)
router.post('/webhook', handleWebhook)

// Return URLs (PayGenius redirects user here after payment)
router.get('/return', handleReturn)
router.get('/cancel', handleCancel)
router.get('/error', handleError)

/**
 * Protected routes (require authentication)
 */

// Initialize payment - returns redirect URL
router.post('/initialize', authMiddleware, initializePayment)

// Get subscription details
router.get('/subscription/:id', authMiddleware, getSubscription)

// Cancel subscription
router.post('/cancel-subscription', authMiddleware, cancelSubscription)

// Lookup payment status
router.get('/payment/:reference', authMiddleware, lookupPayment)

/**
 * Admin routes (require authentication + admin role)
 * Note: Admin middleware should be added in the main routes file
 */

// Process refund
router.post('/refund', authMiddleware, processRefund)

export default router
