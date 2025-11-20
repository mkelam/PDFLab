import { Router } from 'express'
import passport from '../config/passport'
import jwt from 'jsonwebtoken'

const router = Router()

// LinkedIn OAuth login
router.get('/auth/linkedin',
  passport.authenticate('linkedin', { session: false })
)

// LinkedIn OAuth callback
router.get('/auth/linkedin/callback',
  passport.authenticate('linkedin', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed` }),
  (req, res) => {
    const user = req.user as any

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
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`)
  }
)

export default router
