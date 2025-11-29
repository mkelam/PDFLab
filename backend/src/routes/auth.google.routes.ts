import { Router, Request, Response, NextFunction } from 'express'
import passport from '../config/passport'
import jwt from 'jsonwebtoken'
import logger from '../config/logger'

const router = Router()

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

// Middleware to check if Google OAuth is available
const requireGoogleOAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!isGoogleOAuthConfigured) {
    logger.warn('Google OAuth route accessed but not configured')
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Google OAuth is not configured on this server'
    })
    return
  }
  next()
}

// Google OAuth login
router.get('/auth/google', requireGoogleOAuth, (req, res, next) => {
  logger.debug('Google OAuth: Login route accessed')
  next()
}, passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

// Google OAuth callback
router.get('/auth/google/callback',
  requireGoogleOAuth,
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
  (req, res) => {
    const user = req.user as any

    if (!user) {
      logger.error('Google OAuth callback: No user in request')
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`)
    }

    logger.info('Google OAuth: User authenticated', { email: user.email, userId: user.id })

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'secret'
    const jwtExpiration: string = process.env.JWT_EXPIRATION || '15m'
    const jwtRefreshExpiration: string = process.env.JWT_REFRESH_EXPIRATION || '30d'

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

    // Update last login
    user.last_login = new Date()
    user.save()

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    logger.debug('Google OAuth: Redirecting to frontend', { frontendUrl })
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`)
  }
)

export default router
