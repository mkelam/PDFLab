"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const paygenius_controller_1 = require("../controllers/paygenius.controller");
const router = (0, express_1.Router)();
/**
 * Public routes
 */
// Get all pricing plans
router.get('/plans', paygenius_controller_1.getPlans);
// Get PayGenius configuration status
router.get('/config', paygenius_controller_1.getConfig);
// Validate API connection (useful for testing)
router.get('/validate', paygenius_controller_1.validateConnection);
// PayGenius webhook (no auth required - PayGenius sends this)
router.post('/webhook', paygenius_controller_1.handleWebhook);
// Return URLs (PayGenius redirects user here after payment)
router.get('/return', paygenius_controller_1.handleReturn);
router.get('/cancel', paygenius_controller_1.handleCancel);
router.get('/error', paygenius_controller_1.handleError);
/**
 * Protected routes (require authentication)
 */
// Initialize payment - returns redirect URL
router.post('/initialize', auth_middleware_1.authMiddleware, paygenius_controller_1.initializePayment);
// Get subscription details
router.get('/subscription/:id', auth_middleware_1.authMiddleware, paygenius_controller_1.getSubscription);
// Cancel subscription
router.post('/cancel-subscription', auth_middleware_1.authMiddleware, paygenius_controller_1.cancelSubscription);
// Lookup payment status
router.get('/payment/:reference', auth_middleware_1.authMiddleware, paygenius_controller_1.lookupPayment);
/**
 * Admin routes (require authentication + admin role)
 * Note: Admin middleware should be added in the main routes file
 */
// Process refund
router.post('/refund', auth_middleware_1.authMiddleware, paygenius_controller_1.processRefund);
exports.default = router;
//# sourceMappingURL=paygenius.routes.js.map