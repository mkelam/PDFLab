import { Request, Response } from 'express'
import { Op } from 'sequelize'
import bcrypt from 'bcryptjs'
import { Partner, PromoCode, UserAttribution, User } from '../models'
import { PartnerStatus, CommissionTier } from '../models/Partner'
import { DiscountType } from '../models/PromoCode'

/**
 * Partner Dashboard Controller
 *
 * Provides API endpoints for:
 * 1. Partner authentication
 * 2. Partner performance tracking
 * 3. Referral analytics
 * 4. Commission calculations
 * 5. Promo code management
 */

/**
 * POST /api/partners/login
 * Partner login endpoint
 */
export const partnerLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, password } = req.body

    if (!slug || !password) {
      res.status(400).json({
        error: 'Missing credentials',
        message: 'Please provide both slug and password'
      })
      return
    }

    // Find partner by slug
    const partner = await Partner.findOne({ where: { slug } })

    if (!partner) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid slug or password'
      })
      return
    }

    // Check if partner has a password set
    if (!partner.password_hash) {
      res.status(401).json({
        error: 'Password not set',
        message: 'Please contact admin to set up your password'
      })
      return
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, partner.password_hash)

    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid slug or password'
      })
      return
    }

    // Check partner status
    if (partner.status !== PartnerStatus.ACTIVE) {
      res.status(403).json({
        error: 'Account not active',
        message: `Your partner account is ${partner.status}. Please contact admin.`
      })
      return
    }

    // Update last login
    partner.last_login_at = new Date()
    await partner.save()

    // Return partner data (without password hash)
    res.status(200).json({
      message: 'Login successful',
      partner: {
        id: partner.id,
        slug: partner.slug,
        name: partner.name,
        email: partner.email,
        platform: partner.platform,
        status: partner.status,
        commission_tier: partner.commission_tier,
        commission_rate: partner.commission_rate
      }
    })
  } catch (error) {
    console.error('[Partner Login] Error:', error)
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    })
  }
}

/**
 * GET /api/partners/:slug/dashboard
 * Get partner dashboard with performance metrics
 */
export const getPartnerDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params

    // Find partner by slug
    const partner = await Partner.findOne({
      where: { slug },
      include: [
        {
          model: PromoCode,
          as: 'promo_codes'
        }
      ]
    })

    if (!partner) {
      res.status(404).json({
        error: 'Partner not found',
        message: `No partner found with slug: ${slug}`
      })
      return
    }

    // Get attribution stats
    const attributions = await UserAttribution.findAll({
      where: { partner_id: partner.id }
    })

    // Calculate current month stats
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const currentMonthAttributions = attributions.filter(
      (attr) => attr.created_at >= currentMonthStart
    )

    // Calculate conversion metrics
    const totalSignups = attributions.length
    const totalConversions = attributions.filter((attr) => attr.converted_to_paid).length
    const conversionRate = totalSignups > 0 ? (totalConversions / totalSignups) * 100 : 0

    const currentMonthSignups = currentMonthAttributions.length
    const currentMonthConversions = currentMonthAttributions.filter(
      (attr) => attr.converted_to_paid
    ).length

    // Calculate commission
    const totalCommissionEarned = attributions.reduce(
      (sum, attr) => sum + parseFloat(attr.commission_due.toString()),
      0
    )
    const totalCommissionPaid = attributions
      .filter((attr) => attr.commission_paid)
      .reduce((sum, attr) => sum + parseFloat(attr.commission_due.toString()), 0)
    const pendingCommission = totalCommissionEarned - totalCommissionPaid

    // Recent referrals (last 10)
    const recentReferrals = await UserAttribution.findAll({
      where: { partner_id: partner.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'name', 'plan', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    })

    res.status(200).json({
      partner: {
        id: partner.id,
        name: partner.name,
        slug: partner.slug,
        platform: partner.platform,
        follower_count: partner.follower_count,
        commission_rate: partner.commission_rate,
        commission_tier: partner.commission_tier,
        status: partner.status,
        referral_link: partner.getReferralLink(),
        free_licenses: {
          allocated: partner.free_licenses_allocated,
          used: partner.free_licenses_used,
          remaining: partner.getFreeLicensesRemaining()
        }
      },
      stats: {
        all_time: {
          signups: totalSignups,
          conversions: totalConversions,
          conversion_rate: conversionRate.toFixed(2) + '%',
          revenue_generated: partner.total_revenue_generated,
          commission_earned: totalCommissionEarned.toFixed(2),
          commission_paid: totalCommissionPaid.toFixed(2),
          commission_pending: pendingCommission.toFixed(2)
        },
        current_month: {
          signups: currentMonthSignups,
          conversions: currentMonthConversions,
          conversion_rate:
            currentMonthSignups > 0
              ? ((currentMonthConversions / currentMonthSignups) * 100).toFixed(2) + '%'
              : '0%'
        }
      },
      promo_codes: partner.promo_codes?.map((code) => ({
        id: code.id,
        code: code.code,
        discount_type: code.discount_type,
        discount_value: code.discount_value,
        uses: code.current_uses,
        max_uses: code.max_uses,
        is_active: code.is_active,
        expires_at: code.expires_at
      })),
      recent_referrals: recentReferrals.map((attr) => ({
        id: attr.id,
        user_email: attr.user?.email,
        user_name: attr.user?.name,
        user_plan: attr.user?.plan,
        attribution_method: attr.attribution_method,
        signup_date: attr.created_at,
        converted: attr.converted_to_paid,
        conversion_date: attr.converted_at,
        commission_due: attr.commission_due,
        commission_paid: attr.commission_paid
      }))
    })
  } catch (error) {
    console.error('[Partner Dashboard] Error:', error)
    res.status(500).json({
      error: 'Failed to load dashboard',
      message: 'An error occurred while loading partner dashboard'
    })
  }
}

/**
 * GET /api/partners/:slug/referrals
 * Get all referrals for a partner (with pagination)
 */
export const getPartnerReferrals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params
    const { page = 1, limit = 20, status } = req.query

    const partner = await Partner.findOne({ where: { slug } })
    if (!partner) {
      res.status(404).json({ error: 'Partner not found' })
      return
    }

    // Build where clause
    const whereClause: any = { partner_id: partner.id }
    if (status === 'converted') {
      whereClause.converted_to_paid = true
    } else if (status === 'pending') {
      whereClause.converted_to_paid = false
    }

    // Fetch referrals with pagination
    const offset = (Number(page) - 1) * Number(limit)
    const { rows: referrals, count: total } = await UserAttribution.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'name', 'plan', 'created_at']
        },
        {
          model: PromoCode,
          as: 'promo_code',
          attributes: ['code']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    })

    res.status(200).json({
      referrals: referrals.map((attr) => ({
        id: attr.id,
        user: {
          email: attr.user?.email,
          name: attr.user?.name,
          plan: attr.user?.plan,
          signup_date: attr.user?.created_at
        },
        attribution_method: attr.attribution_method,
        promo_code: attr.promo_code?.code,
        utm_source: attr.utm_source,
        utm_campaign: attr.utm_campaign,
        signup_date: attr.created_at,
        converted: attr.converted_to_paid,
        conversion_date: attr.converted_at,
        first_payment: attr.first_payment_amount,
        commission_due: attr.commission_due,
        commission_paid: attr.commission_paid
      })),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('[Partner Referrals] Error:', error)
    res.status(500).json({
      error: 'Failed to load referrals',
      message: 'An error occurred while loading referrals'
    })
  }
}

/**
 * POST /api/admin/partners
 * Create a new partner (admin only)
 */
export const createPartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      slug,
      platform,
      follower_count,
      website,
      commission_tier,
      free_licenses_allocated
    } = req.body

    // Validation
    if (!name || !email || !slug) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, email, and slug are required'
      })
      return
    }

    // Check if slug/email already exists
    const existingPartner = await Partner.findOne({
      where: {
        [Op.or]: [{ slug }, { email }]
      }
    })

    if (existingPartner) {
      res.status(400).json({
        error: 'Partner already exists',
        message: 'A partner with this slug or email already exists'
      })
      return
    }

    // Get commission rate from tier
    const tierRates: Record<CommissionTier, number> = {
      [CommissionTier.BRONZE]: 30.0,
      [CommissionTier.SILVER]: 40.0,
      [CommissionTier.GOLD]: 50.0,
      [CommissionTier.PLATINUM]: 60.0
    }
    const commission_rate = tierRates[commission_tier as CommissionTier] || 30.0

    // Create partner
    const partner = await Partner.create({
      name,
      email,
      slug,
      platform,
      follower_count,
      website,
      commission_tier: commission_tier || CommissionTier.BRONZE,
      commission_rate,
      free_licenses_allocated: free_licenses_allocated || 10,
      status: PartnerStatus.PENDING
    })

    // Create default promo code
    const defaultPromoCode = `${slug.toUpperCase().replace(/-/g, '')}10` // e.g., JEFFSU10
    await PromoCode.create({
      partner_id: partner.id,
      code: defaultPromoCode,
      discount_type: DiscountType.PERCENTAGE,
      discount_value: 10.0,
      max_uses: 100
    })

    res.status(201).json({
      message: 'Partner created successfully',
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        slug: partner.slug,
        commission_tier: partner.commission_tier,
        commission_rate: partner.commission_rate,
        referral_link: partner.getReferralLink(),
        default_promo_code: defaultPromoCode
      }
    })
  } catch (error) {
    console.error('[Create Partner] Error:', error)
    res.status(500).json({
      error: 'Failed to create partner',
      message: 'An error occurred while creating partner'
    })
  }
}

/**
 * GET /api/admin/partners
 * Get all partners (admin only)
 */
export const getAllPartners = async (req: Request, res: Response): Promise<void> => {
  try {
    const partners = await Partner.findAll({
      order: [['created_at', 'DESC']],
      include: [
        {
          model: PromoCode,
          as: 'promo_codes'
        }
      ]
    })

    // Prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    res.status(200).json({
      partners: partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        slug: partner.slug,
        platform: partner.platform,
        follower_count: partner.follower_count,
        commission_tier: partner.commission_tier,
        commission_rate: partner.commission_rate,
        status: partner.status,
        referral_link: partner.getReferralLink(),
        total_signups: partner.total_signups || 0,
        total_conversions: partner.total_conversions || 0,
        conversion_rate: partner.getConversionRate().toFixed(2) + '%',
        total_revenue: parseFloat(partner.total_revenue_generated?.toString() || '0'),
        total_commission_earned: parseFloat(partner.total_commission_earned?.toString() || '0'),
        pending_commission: parseFloat(partner.getPendingCommission()?.toString() || '0'),
        free_licenses_remaining: partner.getFreeLicensesRemaining(),
        promo_codes: partner.promo_codes?.map((code) => code.code)
      }))
    })
  } catch (error) {
    console.error('[Get All Partners] Error:', error)
    res.status(500).json({
      error: 'Failed to load partners',
      message: 'An error occurred while loading partners'
    })
  }
}

/**
 * POST /api/admin/partners/:id/promo-code
 * Create a new promo code for a partner (admin only)
 */
export const createPromoCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { code, discount_type, discount_value, max_uses, expires_at } = req.body

    if (!code || !discount_type || !discount_value) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Code, discount type, and discount value are required'
      })
      return
    }

    // Check if partner exists
    const partner = await Partner.findByPk(id)
    if (!partner) {
      res.status(404).json({ error: 'Partner not found' })
      return
    }

    // Check if code already exists
    const existingCode = await PromoCode.findOne({
      where: { code: code.toUpperCase() }
    })
    if (existingCode) {
      res.status(400).json({
        error: 'Promo code already exists',
        message: 'This promo code is already in use'
      })
      return
    }

    // Create promo code
    const promoCode = await PromoCode.create({
      partner_id: id,
      code: code.toUpperCase(),
      discount_type,
      discount_value,
      max_uses,
      expires_at: expires_at ? new Date(expires_at) : undefined
    })

    res.status(201).json({
      message: 'Promo code created successfully',
      promo_code: {
        id: promoCode.id,
        code: promoCode.code,
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value,
        max_uses: promoCode.max_uses,
        expires_at: promoCode.expires_at
      }
    })
  } catch (error) {
    console.error('[Create Promo Code] Error:', error)
    res.status(500).json({
      error: 'Failed to create promo code',
      message: 'An error occurred while creating promo code'
    })
  }
}

/**
 * GET /api/admin/attribution/stats
 * Get overall attribution statistics (admin only)
 */
export const getAttributionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalAttributions = await UserAttribution.count()
    const partnerAttributions = await UserAttribution.count({
      where: { partner_id: { [Op.ne]: null } }
    })
    const organicSignups = totalAttributions - partnerAttributions
    const convertedUsers = await UserAttribution.count({
      where: { converted_to_paid: true }
    })

    // Calculate total revenue and commission
    const allAttributions = await UserAttribution.findAll({
      where: { converted_to_paid: true }
    })
    const totalRevenue = allAttributions.reduce(
      (sum, attr) => sum + parseFloat(attr.first_payment_amount.toString()),
      0
    )
    const totalCommission = allAttributions.reduce(
      (sum, attr) => sum + parseFloat(attr.commission_due.toString()),
      0
    )

    res.status(200).json({
      stats: {
        total_signups: totalAttributions,
        partner_signups: partnerAttributions,
        organic_signups: organicSignups,
        partner_percentage: ((partnerAttributions / totalAttributions) * 100).toFixed(2) + '%',
        total_conversions: convertedUsers,
        conversion_rate: ((convertedUsers / totalAttributions) * 100).toFixed(2) + '%',
        total_revenue: totalRevenue.toFixed(2),
        total_commission: totalCommission.toFixed(2)
      }
    })
  } catch (error) {
    console.error('[Attribution Stats] Error:', error)
    res.status(500).json({
      error: 'Failed to load stats',
      message: 'An error occurred while loading attribution stats'
    })
  }
}
