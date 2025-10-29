import { Request, Response } from 'express'
import { User, UserPlan } from '../models'
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  isValidEmail,
  isValidPassword
} from '../utils/auth.utils'

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body

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
      res.status(422).json({
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

    // Create user
    const user = await User.create({
      email,
      password_hash,
      name: name || undefined,
      plan: UserPlan.FREE,
      conversions_used: 0,
      conversions_limit: parseInt(process.env.CONVERSIONS_LIMIT_FREE || '3'),
      created_at: new Date(),
      updated_at: new Date()
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

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        conversions_used: user.conversions_used,
        conversions_limit: user.conversions_limit
      },
      token: accessToken,
      refresh_token: refreshToken
    })
  } catch (error) {
    console.error('Registration error:', error)
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
        plan: user.plan,
        conversions_used: user.conversions_used,
        conversions_limit: user.conversions_limit,
        last_login: user.last_login
      },
      token: accessToken,
      refresh_token: refreshToken
    })
  } catch (error) {
    console.error('Login error:', error)
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        conversions_used: user.conversions_used,
        conversions_limit: user.conversions_limit,
        subscription_status: user.subscription_status,
        subscription_end_date: user.subscription_end_date,
        created_at: user.created_at,
        last_login: user.last_login
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
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
    const { refresh_token } = req.body

    if (!refresh_token) {
      res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      })
      return
    }

    // Verify refresh token (using same verifyToken function)
    const { verifyToken } = await import('../utils/auth.utils')
    const decoded = verifyToken(refresh_token)

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
      refresh_token: newRefreshToken
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing your token'
    })
  }
}
