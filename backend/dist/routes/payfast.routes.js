"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payfast_controller_1 = require("../controllers/payfast.controller");
const router = (0, express_1.Router)();
/**
 * Public routes
 */
// Get all pricing plans
router.get('/plans', payfast_controller_1.getPlans);
// Get PayFast configuration status
router.get('/config', payfast_controller_1.getConfig);
// PayFast ITN webhook (no auth required - PayFast sends this)
router.post('/webhook', payfast_controller_1.handleWebhook);
// Return URL (success)
router.get('/return', payfast_controller_1.handleReturn);
// Cancel URL
router.get('/cancel', payfast_controller_1.handleCancel);
/**
 * Protected routes (require authentication)
 */
// Initialize payment
router.post('/initialize', auth_middleware_1.authMiddleware, payfast_controller_1.initializePayment);
// Get subscription details
router.get('/subscription/:id', auth_middleware_1.authMiddleware, payfast_controller_1.getSubscription);
// Cancel subscription
router.post('/cancel-subscription', auth_middleware_1.authMiddleware, payfast_controller_1.cancelSubscription);
exports.default = router;
//# sourceMappingURL=payfast.routes.js.map