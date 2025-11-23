import { Request, Response } from 'express'
import { User } from '../models'
import bcrypt from 'bcrypt'
import logger from '../config/logger'

/**
 * Get user profile
 * @route GET /api/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await User.findByPk(userId, {
      attributes: [
        'id',
        'email',
        'name',
        'plan',
        'conversions_used',
        'conversions_limit',
        'subscription_status',
        'subscription_end_date',
        'created_at',
        'last_login',
        'email_verified',
        'email_verified_at'
      ]
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error: any) {
    logger.error('Get profile error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    })
  }
}

/**
 * Update user profile
 * @route PUT /api/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { name, email } = req.body

    // Validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    if (name && (name.length < 2 || name.length > 100)) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters' })
    }

    // Check if email is already taken
    if (email) {
      const existingUser = await User.findOne({
        where: { email }
      })

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email already in use' })
      }
    }

    // Update user
    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (name) user.name = name
    if (email) {
      user.email = email
      // If email changed, mark as unverified
      if (user.email !== email) {
        user.email_verified = false
        user.email_verified_at = null
      }
    }

    await user.save()

    // Return updated user (exclude sensitive fields)
    const updatedUser = await User.findByPk(userId, {
      attributes: [
        'id',
        'email',
        'name',
        'plan',
        'conversions_used',
        'conversions_limit',
        'subscription_status',
        'created_at',
        'email_verified'
      ]
    })

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error: any) {
    logger.error('Update profile error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    })
  }
}

/**
 * Change password
 * @route PUT /api/profile/password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { currentPassword, newPassword } = req.body

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    // Get user with password
    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    user.password_hash = hashedPassword
    await user.save()

    res.json({ message: 'Password changed successfully' })
  } catch (error: any) {
    logger.error('Change password error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to change password',
      message: error.message
    })
  }
}

/**
 * Delete account
 * @route DELETE /api/profile
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { password, confirmation } = req.body

    // Validation
    if (!password || confirmation !== 'DELETE') {
      return res.status(400).json({
        error: 'Password and confirmation (type DELETE) are required'
      })
    }

    // Get user
    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Password is incorrect' })
    }

    // Delete user (cascade will delete related records)
    await user.destroy()

    res.json({ message: 'Account deleted successfully' })
  } catch (error: any) {
    logger.error('Delete account error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to delete account',
      message: error.message
    })
  }
}

/**
 * Get account statistics
 * @route GET /api/profile/stats
 */
export const getAccountStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await User.findByPk(userId, {
      attributes: [
        'plan',
        'conversions_used',
        'conversions_limit',
        'subscription_status',
        'subscription_end_date',
        'created_at'
      ]
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Calculate account age
    const accountAge = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate quota usage percentage
    const quotaUsagePercent = user.conversions_limit > 0
      ? Math.round((user.conversions_used / user.conversions_limit) * 100)
      : 0

    // Calculate remaining conversions
    const remainingConversions = Math.max(0, user.conversions_limit - user.conversions_used)

    // Subscription status
    const isSubscriptionActive = user.subscription_status === 'active'
    const daysUntilRenewal = user.subscription_end_date
      ? Math.floor(
          (new Date(user.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null

    res.json({
      plan: {
        name: user.plan,
        status: user.subscription_status || 'free'
      },
      quota: {
        used: user.conversions_used,
        limit: user.conversions_limit,
        remaining: remainingConversions,
        usagePercent: quotaUsagePercent
      },
      subscription: {
        active: isSubscriptionActive,
        endsAt: user.subscription_end_date,
        daysUntilRenewal
      },
      account: {
        createdAt: user.created_at,
        accountAgeDays: accountAge
      }
    })
  } catch (error: any) {
    logger.error('Get stats error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch account statistics',
      message: error.message
    })
  }
}
