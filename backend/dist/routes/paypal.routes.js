"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const paypal_controller_1 = require("../controllers/paypal.controller");
const router = (0, express_1.Router)();
/**
 * Public routes
 */
// Get all pricing plans
router.get('/plans', paypal_controller_1.getPlans);
// Get PayPal configuration status
router.get('/config', paypal_controller_1.getConfig);
// Validate API connection (useful for testing)
router.get('/validate', paypal_controller_1.validateConnection);
// PayPal webhook (no auth required - PayPal sends this)
router.post('/webhook', paypal_controller_1.handleWebhook);
// Return URLs (PayPal redirects user here after payment)
router.get('/return', paypal_controller_1.handleReturn);
router.get('/cancel', paypal_controller_1.handleCancel);
/**
 * Protected routes (require authentication)
 */
// Initialize payment - returns approval URL
router.post('/initialize', auth_middleware_1.authMiddleware, paypal_controller_1.initializePayment);
// Capture payment after approval (for one-time orders)
router.post('/capture', auth_middleware_1.authMiddleware, paypal_controller_1.capturePayment);
// Get subscription details
router.get('/subscription/:id', auth_middleware_1.authMiddleware, paypal_controller_1.getSubscription);
// Cancel subscription
router.post('/cancel-subscription', auth_middleware_1.authMiddleware, paypal_controller_1.cancelSubscription);
// Lookup payment status
router.get('/payment/:reference', auth_middleware_1.authMiddleware, paypal_controller_1.lookupPayment);
/**
 * Admin routes (require authentication + admin role)
 * Note: Admin middleware should be added in the main routes file
 */
// Process refund
router.post('/refund', auth_middleware_1.authMiddleware, paypal_controller_1.processRefund);
exports.default = router;
//# sourceMappingURL=paypal.routes.js.map