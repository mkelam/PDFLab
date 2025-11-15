"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const partner_controller_1 = require("../controllers/partner.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = (0, express_1.Router)();
// =======================================
// AUTHENTICATION ROUTES (must come first!)
// =======================================
/**
 * POST /api/partners/login
 * Partner login endpoint
 */
router.post('/login', partner_controller_1.partnerLogin);
// =======================================
// ADMIN-ONLY ROUTES
// =======================================
/**
 * GET /api/partners/admin/all
 * Get all partners (admin only)
 */
router.get('/admin/all', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partner_controller_1.getAllPartners);
/**
 * POST /api/partners/admin/create
 * Create a new partner (admin only)
 */
router.post('/admin/create', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partner_controller_1.createPartner);
/**
 * POST /api/partners/admin/:id/promo-code
 * Create promo code for a partner (admin only)
 */
router.post('/admin/:id/promo-code', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partner_controller_1.createPromoCode);
/**
 * GET /api/partners/admin/attribution/stats
 * Get overall attribution statistics (admin only)
 */
router.get('/admin/attribution/stats', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partner_controller_1.getAttributionStats);
// =======================================
// PUBLIC PARTNER ROUTES (must come after admin routes!)
// =======================================
/**
 * GET /api/partners/:slug/dashboard
 * Get partner dashboard (public but requires partner knowledge)
 */
router.get('/:slug/dashboard', partner_controller_1.getPartnerDashboard);
/**
 * GET /api/partners/:slug/referrals
 * Get partner referrals with pagination
 */
router.get('/:slug/referrals', partner_controller_1.getPartnerReferrals);
exports.default = router;
//# sourceMappingURL=partner.routes.js.map