import { Router } from 'express'
import passport, { isGoogleOAuthConfigured } from '../config/passport'
import jwt from 'jsonwebtoken'

const router = Router()

// Google OAuth login
router.get('/auth/google', (req, res, next): void => {
  // Check if Google OAuth is configured
  if (!isGoogleOAuthConfigured) {
    console.warn('[Google Routes] Google OAuth not configured')
    res.status(503).json({
      error: 'Google OAuth not configured',
      message: 'Google login is not available. Please use email/password login or contact support.'
    })
    return
  }

  console.log('[Google Routes] /auth/google route accessed')
  console.log('[Google Routes] Redirecting to Google OAuth...')
  next()
}, (req, res, next): void => {
  // Only call passport.authenticate if Google OAuth is configured
  if (isGoogleOAuthConfigured) {
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next)
  }
})

// Google OAuth callback
router.get('/auth/google/callback',
  (req, res, next): void => {
    // Check if Google OAuth is configured
    if (!isGoogleOAuthConfigured) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      res.redirect(`${frontendUrl}/login?error=google_not_configured`)
      return
    }
    // Call passport authenticate
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
    })(req, res, next)
  },
  (req, res): void => {
    console.log('[Google Routes] Callback route hit')
    const user = req.user as any

    if (!user) {
      console.error('[Google Routes] ERROR: No user in request')
      res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`)
      return
    }

    console.log('[Google Routes] User authenticated:', user.email)

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'secret'
    const jwtExpiration: string = process.env.JWT_EXPIRATION || '15m'
    const jwtRefreshExpiration: string = process.env.JWT_REFRESH_EXPIRATION || '30d'

    console.log('[Google Routes] Generating JWT tokens')
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: jwtExpiration as jwt.SignOptions['expiresIn'] }
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: jwtRefreshExpiration as jwt.SignOptions['expiresIn'] }
    )

    console.log('[Google Routes] Tokens generated successfully')

    // Update last login
    user.last_login = new Date()
    user.save()

    console.log('[Google Routes] Last login updated')

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    console.log('[Google Routes] Redirecting to:', `${frontendUrl}/auth/callback`)
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`)
  }
)

export default router
