import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../utils/auth.utils'
import { User } from '../models'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User
      userId?: string
      userPlan?: string
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No token provided',
        message: 'Authorization header must be in format: Bearer <token>'
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      })
      return
    }

    // Fetch user from database
    const user = await User.findByPk(decoded.userId)
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'User associated with this token does not exist'
      })
      return
    }

    // Attach user to request object
    req.user = user
    req.userId = user.id
    req.userPlan = user.plan

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    })
  }
}

/**
 * Middleware to check if user has reached conversion limit
 */
export const checkConversionQuota = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    if (!user.canConvert()) {
      res.status(429).json({
        error: 'Quota exceeded',
        message: `You have reached your conversion limit (${user.conversions_limit} conversions)`,
        conversions_used: user.conversions_used,
        conversions_limit: user.conversions_limit,
        plan: user.plan,
        upgrade_required: true
      })
      return
    }

    next()
  } catch (error) {
    console.error('Quota check error:', error)
    res.status(500).json({
      error: 'Quota check failed',
      message: 'An error occurred while checking your quota'
    })
  }
}

/**
 * Middleware to require specific plan
 */
export const requirePlan = (...requiredPlans: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    if (!requiredPlans.includes(user.plan)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This feature requires a ${requiredPlans.join(' or ')} plan`,
        current_plan: user.plan,
        required_plans: requiredPlans
      })
      return
    }

    next()
  }
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next()
      return
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (decoded) {
      const user = await User.findByPk(decoded.userId)
      if (user) {
        req.user = user
        req.userId = user.id
        req.userPlan = user.plan
      }
    }

    next()
  } catch (error) {
    // Continue without user if auth fails
    next()
  }
}
