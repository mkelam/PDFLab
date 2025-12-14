import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  getPlans,
  initializePayment,
  capturePayment,
  handleWebhook,
  handleReturn,
  handleCancel,
  getSubscription,
  cancelSubscription,
  getConfig,
  validateConnection,
  processRefund,
  lookupPayment
} from '../controllers/paypal.controller'

const router = Router()

/**
 * Public routes
 */

// Get all pricing plans
router.get('/plans', getPlans)

// Get PayPal configuration status
router.get('/config', getConfig)

// Validate API connection (useful for testing)
router.get('/validate', validateConnection)

// PayPal webhook (no auth required - PayPal sends this)
router.post('/webhook', handleWebhook)

// Return URLs (PayPal redirects user here after payment)
router.get('/return', handleReturn)
router.get('/cancel', handleCancel)

/**
 * Protected routes (require authentication)
 */

// Initialize payment - returns approval URL
router.post('/initialize', authMiddleware, initializePayment)

// Capture payment after approval (for one-time orders)
router.post('/capture', authMiddleware, capturePayment)

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
