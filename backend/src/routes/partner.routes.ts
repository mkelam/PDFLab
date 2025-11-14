import { Router } from 'express'
import {
  partnerLogin,
  getPartnerDashboard,
  getPartnerReferrals,
  createPartner,
  getAllPartners,
  createPromoCode,
  getAttributionStats
} from '../controllers/partner.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/admin.middleware'

const router = Router()

// =======================================
// AUTHENTICATION ROUTES (must come first!)
// =======================================

/**
 * POST /api/partners/login
 * Partner login endpoint
 */
router.post('/login', partnerLogin)

// =======================================
// ADMIN-ONLY ROUTES
// =======================================

/**
 * GET /api/partners/admin/all
 * Get all partners (admin only)
 */
router.get('/admin/all', requireAuth, requireAdmin, getAllPartners)

/**
 * POST /api/partners/admin/create
 * Create a new partner (admin only)
 */
router.post('/admin/create', requireAuth, requireAdmin, createPartner)

/**
 * POST /api/partners/admin/:id/promo-code
 * Create promo code for a partner (admin only)
 */
router.post('/admin/:id/promo-code', requireAuth, requireAdmin, createPromoCode)

/**
 * GET /api/partners/admin/attribution/stats
 * Get overall attribution statistics (admin only)
 */
router.get('/admin/attribution/stats', requireAuth, requireAdmin, getAttributionStats)

// =======================================
// PUBLIC PARTNER ROUTES (must come after admin routes!)
// =======================================

/**
 * GET /api/partners/:slug/dashboard
 * Get partner dashboard (public but requires partner knowledge)
 */
router.get('/:slug/dashboard', getPartnerDashboard)

/**
 * GET /api/partners/:slug/referrals
 * Get partner referrals with pagination
 */
router.get('/:slug/referrals', getPartnerReferrals)

export default router
