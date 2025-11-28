import { Request, Response } from 'express'
import { User, UserPlan, ConversionJob, UserAttribution, Partner, PromoCode } from '../models'
import { FounderStatus } from '../models/User'
import { AttributionMethod } from '../models/UserAttribution'
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  isValidEmail,
  isValidPassword
} from '../utils/auth.utils'
import { sanitizeText } from '../utils/sanitize.utils'
import emailService from '../services/email.service'
import GuestSessionService from '../services/guest-session.service'
import { getAttributionData } from '../middleware/attribution.middleware'
import logger from '../config/logger'

/**
 * Register a new user
 */
// Constants for Founder's Edition
const FOUNDER_EDITION_CAP = 100
const FOUNDER_CHALLENGE_DAYS = 14

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, promo_code, founder_edition } = req.body

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      })
      return
    }

    if (!isValidEmail(email)) {
      res.status(422).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      })
      return
    }

    if (!isValidPassword(password)) {
      res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters long and contain letters and numbers'
      })
      return
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      res.status(400).json({
        error: 'Email already exists',
        message: 'An account with this email already exists'
      })
      return
    }

    // Hash password
    const password_hash = await hashPassword(password)

    // Sanitize user inputs to prevent XSS
    const sanitizedName = name ? sanitizeText(name) : undefined

    // ===================================
    // FOUNDER'S EDITION HANDLING
    // ===================================
    let isFounderSignup = false
    let founderStatus: FounderStatus = FounderStatus.NONE
    let founderDeadline: Date | undefined
    let userPlan = UserPlan.FREE

    if (founder_edition) {
      // Check if Founder's Edition spots are still available
      const founderCount = await User.count({
        where: {
          founder_status: [FounderStatus.ACTIVE, FounderStatus.EARNED]
        }
      })

      if (founderCount >= FOUNDER_EDITION_CAP) {
        res.status(400).json({
          error: 'Founder Edition sold out',
          message: `All ${FOUNDER_EDITION_CAP} Founder's Edition spots have been claimed. Please sign up for our regular free tier or check out our Partner Pass offers.`,
          spots_remaining: 0
        })
        return
      }

      // Founder signup approved
      isFounderSignup = true
      founderStatus = FounderStatus.ACTIVE
      founderDeadline = new Date(Date.now() + FOUNDER_CHALLENGE_DAYS * 24 * 60 * 60 * 1000)
      userPlan = UserPlan.PRO // Founders get Pro access during the challenge

      logger.info(`[Founder] New Founder's Edition signup: ${email} (${FOUNDER_EDITION_CAP - founderCount - 1} spots remaining)`)
    }

    // Create user
    const user = await User.create({
      email,
      password_hash,
      name: sanitizedName,
      plan: userPlan,
      conversions_used: 0,
      conversions_limit: isFounderSignup ? 999999 : parseInt(process.env['CONVERSIONS_LIMIT_FREE'] || '3'),
      founder_status: founderStatus,
      founder_deadline: founderDeadline,
      founder_feedback_submitted: false,
      founder_conversions_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    })

    // ===================================
    // ATTRIBUTION TRACKING
    // ===================================
    // Capture attribution data to identify which influencer brought this user
    let attributionMethod: AttributionMethod | undefined
    let partnerId: string | undefined
    let promoCodeId: string | undefined
    let referralUrl: string | undefined
    let utmSource: string | undefined
    let utmMedium: string | undefined
    let utmCampaign: string | undefined

    // 1. Check for promo code (highest priority)
    if (promo_code) {
      const promoCodeRecord = await PromoCode.findOne({
        where: { code: promo_code.toUpperCase(), is_active: true },
        include: [{ model: Partner, as: 'partner' }]
      })

      if (promoCodeRecord && promoCodeRecord.isValid()) {
        partnerId = promoCodeRecord.partner_id
        promoCodeId = promoCodeRecord.id
        attributionMethod = AttributionMethod.PROMO_CODE

        // Increment promo code usage
        await promoCodeRecord.incrementUse()

        logger.info(`[Attribution] User ${user.email} signed up with promo code ${promo_code}`)
      } else {
        logger.warn(`[Attribution] Invalid or expired promo code: ${promo_code}`)
      }
    }

    // 2. Check for referral link attribution (from middleware)
    if (!partnerId) {
      const attributionData = getAttributionData(req)
      if (attributionData && attributionData.partner_id) {
        partnerId = attributionData.partner_id
        referralUrl = attributionData.referral_url
        utmSource = attributionData.utm_source
        utmMedium = attributionData.utm_medium
        utmCampaign = attributionData.utm_campaign
        attributionMethod = AttributionMethod.REFERRAL_LINK

        logger.info(`[Attribution] User ${user.email} signed up via referral link from partner ${partnerId}`)
      }
    }

    // 3. Create attribution record
    if (partnerId && attributionMethod) {
      await UserAttribution.create({
        user_id: user.id,
        partner_id: partnerId,
        promo_code_id: promoCodeId,
        attribution_method: attributionMethod,
        referral_url: referralUrl,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        converted_to_paid: false,
        first_payment_amount: 0,
        commission_due: 0,
        commission_paid: false,
        created_at: new Date()
      })

      logger.info(`[Attribution] Created attribution record for user ${user.email} → partner ${partnerId}`)
    } else {
      // Organic signup (no partner attribution)
      await UserAttribution.create({
        user_id: user.id,
        partner_id: undefined,
        attribution_method: AttributionMethod.MANUAL,
        created_at: new Date()
      })

      logger.info(`[Attribution] User ${user.email} is an organic signup (no partner)`)
    }

    // Migrate guest session if exists
    const guestSessionId = req.cookies?.guest_session_id
    let migratedJobs = 0

    if (guestSessionId) {
      try {
        // Get guest session to verify it exists
        const guestSession = await GuestSessionService.getSession(guestSessionId)

        if (guestSession) {
          // Migrate guest conversion jobs to the new user
          const updatedCount = await ConversionJob.update(
            { user_id: user.id },
            { where: { user_id: null } }
          )

          migratedJobs = Array.isArray(updatedCount) ? updatedCount[0] : updatedCount

          if (migratedJobs > 0) {
            logger.info(`✅ Migrated ${migratedJobs} guest conversion job(s) to user ${user.email}`)

            // Update user's conversion count
            user.conversions_used = migratedJobs
            await user.save()
          }

          // Delete guest session from Redis
          await GuestSessionService.deleteSession(guestSessionId)
          logger.info(`✅ Deleted guest session ${guestSessionId}`)

          // Clear guest session cookie
          res.clearCookie('guest_session_id')
        }
      } catch (error) {
        logger.error('Guest session migration error:', { error: error instanceof Error ? error.message : String(error) })
        // Don't fail registration if migration fails
      }
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.email, user.name || undefined).catch((error) => {
      logger.error('Failed to send welcome email:', { error: error instanceof Error ? error.message : String(error) })
      // Don't fail registration if email fails
    })

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    // Build response message
    let successMessage = 'User registered successfully'
    if (isFounderSignup) {
      successMessage = `Welcome to Founder's Edition! Complete 10 conversions and submit feedback within ${FOUNDER_CHALLENGE_DAYS} days to earn lifetime Pro access.`
    } else if (migratedJobs > 0) {
      successMessage = `User registered successfully. ${migratedJobs} conversion${migratedJobs > 1 ? 's' : ''} migrated to your account.`
    }

    // Calculate spots remaining for response
    const spotsRemaining = isFounderSignup
      ? FOUNDER_EDITION_CAP - (await User.count({ where: { founder_status: [FounderStatus.ACTIVE, FounderStatus.EARNED] } }))
      : undefined

    res.status(201).json({
      message: successMessage,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        conversions_used: user.conversions_used,
        conversions_limit: user.conversions_limit,
        founder_status: user.founder_status,
        founder_deadline: user.founder_deadline,
        founder_progress: isFounderSignup ? user.getFounderProgress() : undefined
      },
      token: accessToken,
      refreshToken: refreshToken,
      migrated_jobs: migratedJobs,
      founder_edition: isFounderSignup ? {
        enrolled: true,
        spots_remaining: spotsRemaining,
        deadline: founderDeadline,
        challenge: {
          conversions_required: 10,
          feedback_required: true,
          days_remaining: FOUNDER_CHALLENGE_DAYS
        }
      } : undefined
    })
  } catch (error) {
    logger.error('Registration error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    })
  }
}

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      })
      return
    }

    // Find user
    const user = await User.findOne({ where: { email } })
    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      })
      return
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash)
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      })
      return
    }

    // Update last login
    user.last_login = new Date()
    await user.save()

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        conversions_used: user.conversions_used,
        conversions_limit: user.conversions_limit,
        last_login: user.last_login
      },
      token: accessToken,
      refreshToken: refreshToken
    })
  } catch (error) {
    logger.error('Login error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    })
  }
}

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      conversions_used: user.conversions_used,
      conversions_limit: user.conversions_limit,
      subscription_status: user.subscription_status,
      subscription_end_date: user.subscription_end_date,
      created_at: user.created_at,
      last_login: user.last_login
    })
  } catch (error) {
    logger.error('Get profile error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: 'An error occurred while fetching your profile'
    })
  }
}

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Accept both refreshToken (camelCase) and refresh_token (snake_case) for backwards compatibility
    const { refresh_token, refreshToken: refreshTokenCamel } = req.body
    const token = refreshTokenCamel || refresh_token

    if (!token) {
      res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      })
      return
    }

    // Verify refresh token (using same verifyToken function)
    const { verifyToken } = await import('../utils/auth.utils')
    const decoded = verifyToken(token)

    if (!decoded) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      })
      return
    }

    // Fetch user
    const user = await User.findByPk(decoded.userId)
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'User associated with this token does not exist'
      })
      return
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    })
  } catch (error) {
    logger.error('Refresh token error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing your token'
    })
  }
}

/**
 * Request password reset
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body

    // Validation
    if (!email) {
      res.status(400).json({
        error: 'Missing email',
        message: 'Email is required'
      })
      return
    }

    if (!isValidEmail(email)) {
      res.status(422).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      })
      return
    }

    // Find user
    const user = await User.findOne({ where: { email } })

    // Always return success (security best practice - don't reveal if email exists)
    // But only send email if user actually exists
    if (user) {
      // Generate password reset token (valid for 1 hour)
      const resetToken = generatePasswordResetToken({
        userId: user.id,
        email: user.email,
        plan: user.plan
      })

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken)
    }

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    })
  } catch (error) {
    logger.error('Forgot password error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred while processing your request'
    })
  }
}

/**
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, new_password } = req.body

    // Validation
    if (!token || !new_password) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Token and new password are required'
      })
      return
    }

    if (!isValidPassword(new_password)) {
      res.status(422).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters long and contain letters and numbers'
      })
      return
    }

    // Verify token
    const { verifyToken } = await import('../utils/auth.utils')
    const decoded = verifyToken(token)

    if (!decoded || !decoded.userId) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Password reset token is invalid or has expired'
      })
      return
    }

    // Verify token type (must be password_reset token)
    if ((decoded as any).type !== 'password_reset') {
      res.status(401).json({
        error: 'Invalid token type',
        message: 'This token is not valid for password reset'
      })
      return
    }

    // Find user
    const user = await User.findByPk(decoded.userId)
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User associated with this token does not exist'
      })
      return
    }

    // Check if account is locked due to failed reset attempts
    if (user.reset_locked_until && user.reset_locked_until > new Date()) {
      const minutesRemaining = Math.ceil((user.reset_locked_until.getTime() - Date.now()) / 60000)
      res.status(429).json({
        error: 'Account locked',
        message: `Too many failed password reset attempts. Please try again in ${minutesRemaining} minutes.`
      })
      return
    }

    // Check if new password matches current password
    const isSameAsCurrentPassword = await verifyPassword(new_password, user.password_hash)
    if (isSameAsCurrentPassword) {
      // Increment failed reset attempts
      user.failed_reset_attempts = (user.failed_reset_attempts || 0) + 1

      // Lock account after 5 failed attempts (30 minutes)
      if (user.failed_reset_attempts >= 5) {
        user.reset_locked_until = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        await user.save()

        res.status(400).json({
          error: 'Too many attempts',
          message: 'Account has been locked due to too many failed password reset attempts. Please try again in 30 minutes.'
        })
        return
      }

      await user.save()

      res.status(400).json({
        error: 'Password reuse not allowed',
        message: 'New password cannot be the same as your current password'
      })
      return
    }

    // Check password history (last 5 passwords)
    const { PasswordHistory } = await import('../models')
    const passwordHistory = await PasswordHistory.findAll({
      where: { user_id: user.id },
      order: [['created_at', 'DESC']],
      limit: 5
    })

    for (const historyEntry of passwordHistory) {
      const isPasswordReused = await verifyPassword(new_password, historyEntry.password_hash)
      if (isPasswordReused) {
        // Increment failed reset attempts
        user.failed_reset_attempts = (user.failed_reset_attempts || 0) + 1

        // Lock account after 5 failed attempts (30 minutes)
        if (user.failed_reset_attempts >= 5) {
          user.reset_locked_until = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          await user.save()

          res.status(400).json({
            error: 'Too many attempts',
            message: 'Account has been locked due to too many failed password reset attempts. Please try again in 30 minutes.'
          })
          return
        }

        await user.save()

        res.status(400).json({
          error: 'Password reuse not allowed',
          message: 'New password cannot be one of your last 5 passwords. Please choose a different password.'
        })
        return
      }
    }

    // Save current password to history before changing it
    await PasswordHistory.create({
      user_id: user.id,
      password_hash: user.password_hash,
      created_at: new Date()
    })

    // Hash new password
    const password_hash = await hashPassword(new_password)

    // Update password and reset lockout counters
    user.password_hash = password_hash
    user.failed_reset_attempts = 0
    user.reset_locked_until = undefined
    await user.save() // Sequelize automatically updates updated_at

    logger.info(`Password reset successful for user: ${user.email}`)

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    })
  } catch (error) {
    logger.error('Reset password error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Reset failed',
      message: 'An error occurred while resetting your password'
    })
  }
}
