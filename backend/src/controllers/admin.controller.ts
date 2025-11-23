import { Request, Response } from 'express'
import { User } from '../models/User'
import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { fixAllUserQuotas, syncUserQuota, getQuotaInfo } from '../utils/quota.utils'
import logger from '../config/logger'

/**
 * GET /api/admin/users
 * Get all users with search, filtering, and pagination
 * Query params: search, plan, role, status, page, limit, sortBy, sortOrder
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      plan,
      role,
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause for filtering
    const where: any = {}

    // Search by email or name
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ]
    }

    // Filter by plan
    if (plan && plan !== 'all') {
      where.plan = plan
    }

    // Filter by role
    if (role && role !== 'all') {
      where.role = role
    }

    // Get users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    const totalPages = Math.ceil(count / limitNum)

    res.json({
      success: true,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages
      }
    })
  } catch (error) {
    logger.error('Get all users error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/beta-users
 * Get all beta users (users with is_beta_user = true)
 * Query params: search, page, limit, sortBy, sortOrder
 */
export const getBetaUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause - only beta users
    const where: any = { is_beta_user: true }

    // Search by email or name
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ]
    }

    // Get beta users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    const totalPages = Math.ceil(count / limitNum)

    res.json({
      success: true,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages
      }
    })
  } catch (error) {
    logger.error('Get beta users error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch beta users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    })

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'No user found with this ID'
      })
      return
    }

    res.json({
      success: true,
      user
    })
  } catch (error) {
    logger.error('Get user by ID error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * PUT /api/admin/users/:id
 * Update user profile (name, email, plan, role)
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, email, plan, role } = req.body

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } })
      if (existingUser) {
        res.status(400).json({
          error: 'Email already exists',
          message: 'Another user is already using this email address'
        })
        return
      }
    }

    // Update user fields
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (plan !== undefined) updates.plan = plan
    if (role !== undefined) updates.role = role

    await user.update(updates)

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      }
    })
  } catch (error) {
    logger.error('Update user error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * PUT /api/admin/users/:id/plan
 * Update user plan/tier
 */
export const updateUserPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { plan } = req.body

    if (!['free', 'starter', 'pro', 'enterprise'].includes(plan)) {
      res.status(400).json({
        error: 'Invalid plan',
        message: 'Plan must be one of: free, starter, pro, enterprise'
      })
      return
    }

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Update plan and conversion limits
    const limits: { [key: string]: number } = {
      free: 3,
      starter: 100,
      pro: -1, // Unlimited
      enterprise: -1 // Unlimited
    }

    await user.update({
      plan,
      conversions_limit: limits[plan]
    })

    res.json({
      success: true,
      message: 'User plan updated successfully',
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        conversions_limit: user.conversions_limit
      }
    })
  } catch (error) {
    logger.error('Update user plan error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to update user plan',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * PUT /api/admin/users/:id/quota
 * Reset user conversion quota
 */
export const resetUserQuota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    await user.update({
      conversions_used: 0
    })

    res.json({
      success: true,
      message: 'User quota reset successfully',
      user: {
        id: user.id,
        email: user.email,
        conversions_used: 0,
        conversions_limit: user.conversions_limit
      }
    })
  } catch (error) {
    logger.error('Reset user quota error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to reset user quota',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users/:id/reset-password
 * Generate password reset link/token for user
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Generate a temporary password reset token (in production, this would be emailed)
    const { generateAccessToken } = await import('../utils/auth.utils')
    const resetToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    // In production, you would send this via email
    // For now, we just return it to the admin
    const resetLink = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    res.json({
      success: true,
      message: 'Password reset link generated',
      resetLink,
      resetToken
    })
  } catch (error) {
    logger.error('Reset password error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to generate reset link',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users/:id/resend-verification
 * Resend email verification to user
 */
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Generate verification token
    const { generateAccessToken } = await import('../utils/auth.utils')
    const verificationToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    }, '24h') // 24-hour expiry for email verification

    // Send verification email
    const emailService = await import('../services/email.service')
    const emailSent = await emailService.default.sendVerificationEmail(
      user.email,
      verificationToken
    )

    if (!emailSent) {
      res.status(500).json({
        error: 'Failed to send email',
        message: 'Email service error - please check SMTP configuration'
      })
      return
    }

    res.json({
      success: true,
      message: `Verification email sent to ${user.email}`,
      email: user.email
    })
  } catch (error) {
    logger.error('Resend verification email error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to send verification email',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users/:id/verify-email
 * Manually verify user's email (admin only)
 */
export const verifyUserEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Check if already verified
    if (user.email_verified) {
      res.status(400).json({
        error: 'Email already verified',
        message: `Email ${user.email} was already verified on ${user.email_verified_at?.toISOString()}`
      })
      return
    }

    // Update user verification status
    await user.update({
      email_verified: true,
      email_verified_at: new Date()
    })

    res.json({
      success: true,
      message: `Email ${user.email} manually verified by admin`,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        email_verified_at: user.email_verified_at
      }
    })
  } catch (error) {
    logger.error('Verify user email error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to verify user email',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, plan = 'free' } = req.body

    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      })
      return
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email already exists'
      })
      return
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Create user
    const user = await User.create({
      email,
      password_hash,
      name: name || email.split('@')[0],
      plan,
      conversions_used: 0,
      conversions_limit: plan === 'free' ? 3 : plan === 'starter' ? 100 : -1
    })

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      }
    })
  } catch (error) {
    logger.error('Create user error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users/:id/impersonate
 * Generate temporary impersonation token (super admin only)
 */
export const impersonateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Check if admin is super_admin
    const adminUserId = (req as any).userId
    const adminUser = await User.findByPk(adminUserId)

    if (!adminUser || adminUser.role !== 'super_admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only super admins can impersonate users'
      })
      return
    }

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Generate impersonation token (30-minute expiry)
    const { generateAccessToken } = await import('../utils/auth.utils')
    const impersonationToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      impersonatedBy: adminUserId,
      impersonation: true
    }, '30m')

    res.json({
      success: true,
      message: 'Impersonation token generated',
      token: impersonationToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      },
      expiresIn: '30m'
    })
  } catch (error) {
    logger.error('Impersonate user error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to generate impersonation token',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    await user.destroy()

    res.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    logger.error('Delete user error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/users/:id/conversions
 * Get user's conversion history
 */
export const getUserConversions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const {
      page = '1',
      limit = '50',
      type,
      status
    } = req.query

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Import ConversionJob model
    const { ConversionJob } = await import('../models')

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = { user_id: id }
    if (type && type !== 'all') {
      where.type = type
    }
    if (status && status !== 'all') {
      where.status = status
    }

    // Get conversions with pagination
    const { count, rows: conversions } = await ConversionJob.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    })

    const totalPages = Math.ceil(count / limitNum)

    res.json({
      success: true,
      conversions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages
      }
    })
  } catch (error) {
    logger.error('Get user conversions error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch user conversions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/users/:id/activity
 * Get user's activity timeline (logins, conversions, payments)
 */
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const {
      page = '1',
      limit = '50'
    } = req.query

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      })
      return
    }

    // Import models
    const { ConversionJob, AdminAuditLog } = await import('../models')

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Get activity events from multiple sources
    // 1. Conversion jobs (completed and failed)
    const conversions = await ConversionJob.findAll({
      where: {
        user_id: id,
        status: ['completed', 'failed']
      },
      attributes: ['id', 'type', 'status', 'file_name', 'created_at'],
      limit: limitNum,
      order: [['created_at', 'DESC']]
    })

    // 2. Audit logs (password resets, quota resets, etc.)
    const auditLogs = await AdminAuditLog.findAll({
      where: {
        entity_type: 'user',
        entity_id: id
      },
      attributes: ['id', 'action', 'changes', 'ip_address', 'created_at'],
      limit: limitNum,
      order: [['created_at', 'DESC']]
    })

    // Combine and format activity events
    const activities: any[] = []

    // Add conversions
    conversions.forEach((conv: any) => {
      activities.push({
        id: `conv-${conv.id}`,
        type: 'conversion',
        action: `Conversion ${conv.status}`,
        details: `${conv.type.replace('-', ' → ').toUpperCase()}: ${conv.file_name}`,
        status: conv.status,
        timestamp: conv.created_at
      })
    })

    // Add audit events
    auditLogs.forEach((log: any) => {
      activities.push({
        id: `audit-${log.id}`,
        type: 'admin_action',
        action: log.action,
        details: JSON.stringify(log.changes),
        ip_address: log.ip_address,
        timestamp: log.created_at
      })
    })

    // Add login event (from user.last_login)
    if (user.last_login) {
      activities.push({
        id: 'last-login',
        type: 'login',
        action: 'User logged in',
        details: 'Last recorded login',
        timestamp: user.last_login
      })
    }

    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Paginate
    const paginatedActivities = activities.slice(offset, offset + limitNum)
    const total = activities.length
    const totalPages = Math.ceil(total / limitNum)

    res.json({
      success: true,
      activities: paginatedActivities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    })
  } catch (error) {
    logger.error('Get user activity error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch user activity',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users/bulk-quota-reset
 * Reset quota for multiple users at once
 */
export const bulkQuotaReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds } = req.body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'userIds must be a non-empty array'
      })
      return
    }

    // Limit to 1000 users per batch to prevent timeouts
    if (userIds.length > 1000) {
      res.status(400).json({
        error: 'Too many users',
        message: 'Maximum 1000 users per bulk operation'
      })
      return
    }

    // Reset quota for all selected users
    const [affectedCount] = await User.update(
      { conversions_used: 0 },
      { where: { id: userIds } }
    )

    // Get updated users for response
    const updatedUsers = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'email', 'name', 'conversions_used', 'conversions_limit']
    })

    res.json({
      success: true,
      message: `Quota reset for ${affectedCount} users`,
      affectedCount,
      users: updatedUsers
    })
  } catch (error) {
    logger.error('Bulk quota reset error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to reset quotas',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/users/export
 * Export users to CSV (respects filters)
 */
export const exportUsersToCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      plan,
      role
    } = req.query

    // Build where clause (same as getAllUsers)
    const where: any = {}

    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ]
    }

    if (plan && plan !== 'all') {
      where.plan = plan
    }

    if (role && role !== 'all') {
      where.role = role
    }

    // Get all users matching filters (no pagination for export)
    const users = await User.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 10000 // Hard limit to prevent memory issues
    })

    // Generate CSV content
    const headers = ['ID', 'Email', 'Name', 'Role', 'Plan', 'Conversions Used', 'Conversions Limit', 'Last Login', 'Created At']
    const csvRows = [headers.join(',')]

    users.forEach((user: any) => {
      const row = [
        user.id,
        `"${user.email}"`,
        `"${user.name || ''}"`,
        user.role,
        user.plan,
        user.conversions_used,
        user.conversions_limit === -1 ? 'unlimited' : user.conversions_limit,
        user.last_login ? new Date(user.last_login).toISOString() : '',
        new Date(user.created_at).toISOString()
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const filename = `users_export_${timestamp}.csv`

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csvContent)
  } catch (error) {
    logger.error('Export users error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to export users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.count()
    const freeUsers = await User.count({ where: { plan: 'free' } })
    const starterUsers = await User.count({ where: { plan: 'starter' } })
    const proUsers = await User.count({ where: { plan: 'pro' } })
    const enterpriseUsers = await User.count({ where: { plan: 'enterprise' } })

    res.json({
      success: true,
      stats: {
        totalUsers,
        planDistribution: {
          free: freeUsers,
          starter: starterUsers,
          pro: proUsers,
          enterprise: enterpriseUsers
        }
      }
    })
  } catch (error) {
    logger.error('Get stats error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/quota-status
 * Get quota status for all users (shows who needs fixing)
 */
export const getQuotaStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.findAll()

    const status = users.map(user => {
      const info = getQuotaInfo(user)
      return {
        id: user.id,
        email: user.email,
        plan: user.plan,
        conversions_used: info.conversions_used,
        conversions_limit: info.conversions_limit,
        conversions_remaining: info.conversions_remaining,
        expected_limit: info.expected_limit,
        is_synced: info.is_synced,
        needs_fix: !info.is_synced
      }
    })

    const needsFix = status.filter(s => s.needs_fix).length

    res.json({
      success: true,
      total_users: users.length,
      users_needing_fix: needsFix,
      users: status
    })
  } catch (error) {
    logger.error('Get quota status error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to get quota status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/fix-quotas
 * Fix quota limits for ALL users based on their plans
 */
export const fixQuotas = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔧 Admin triggered quota fix for all users')

    const result = await fixAllUserQuotas()

    res.json({
      success: true,
      message: `Fixed ${result.fixed} out of ${result.total} users`,
      fixed: result.fixed,
      total: result.total,
      unchanged: result.total - result.fixed
    })
  } catch (error) {
    logger.error('Fix quotas error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fix quotas',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/users/:id/sync-quota
 * Sync quota for a specific user
 */
export const syncUserQuotaEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const beforeInfo = getQuotaInfo(user)

    await syncUserQuota(user)

    const afterInfo = getQuotaInfo(user)

    res.json({
      success: true,
      message: `Quota synced for user ${user.email}`,
      user: {
        email: user.email,
        plan: user.plan
      },
      before: {
        conversions_limit: beforeInfo.conversions_limit,
        expected_limit: beforeInfo.expected_limit,
        is_synced: beforeInfo.is_synced
      },
      after: {
        conversions_limit: afterInfo.conversions_limit,
        expected_limit: afterInfo.expected_limit,
        is_synced: afterInfo.is_synced
      }
    })
  } catch (error) {
    logger.error('Sync user quota error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to sync quota',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
