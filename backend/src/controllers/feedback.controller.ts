import { Request, Response } from 'express'
import { Op } from 'sequelize'
import Feedback, { FeedbackType, FeedbackStatus } from '../models/Feedback'
import { User } from '../models'
import emailService from '../services/email.service'
import { sanitizeText, sanitizeRichText } from '../utils/sanitize.utils'

/**
 * POST /api/feedback
 * Submit new feedback (public endpoint - guests and authenticated users)
 */
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      message,
      user_email,
      user_name,
      page_url,
      screenshot_url
    } = req.body

    // Validation
    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required' })
      return
    }

    if (message.length > 5000) {
      res.status(400).json({ error: 'Message too long (max 5000 characters)' })
      return
    }

    // Get user_id from request if authenticated
    const userId = (req as any).user?.userId || null

    // Get user agent from headers
    const userAgent = req.headers['user-agent'] || null

    // If authenticated, fetch user email/name from database
    let email = user_email
    let name = user_name

    if (userId) {
      const user = await User.findByPk(userId, {
        attributes: ['email', 'name']
      })
      if (user) {
        email = user.email
        name = user.name
      }
    }

    // Sanitize inputs to prevent XSS
    const sanitizedMessage = sanitizeRichText(message.trim())
    const sanitizedName = name ? sanitizeText(name) : null
    const sanitizedEmail = email ? sanitizeText(email) : null

    // Create feedback
    const feedback = await Feedback.create({
      user_id: userId,
      user_email: sanitizedEmail,
      user_name: sanitizedName,
      type: (type as FeedbackType) || 'general',
      message: sanitizedMessage,
      page_url: page_url || null,
      user_agent: userAgent,
      screenshot_url: screenshot_url || null,
      status: 'new'
    })

    // Send email notification to admin
    try {
      await emailService.sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@pdflab.pro',
        subject: `[PDFLab] New ${type || 'general'} feedback`,
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>Type:</strong> ${type || 'general'}</p>
          <p><strong>From:</strong> ${name || 'Anonymous'} (${email || 'No email'})</p>
          <p><strong>Page:</strong> ${page_url || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          <p><a href="https://pdflab.pro/admin/feedback">View in Admin Panel</a></p>
        `
      })
    } catch (emailError) {
      console.error('Failed to send feedback notification email:', emailError)
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Feedback received successfully',
      feedback: {
        id: feedback.id,
        type: feedback.type,
        created_at: feedback.created_at
      }
    })
  } catch (error) {
    console.error('Submit feedback error:', error)
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/feedback
 * Get all feedback with filtering, search, and pagination (admin only)
 */
export const getAllFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search = '',
      status,
      type,
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    // Filter by status
    if (status && status !== 'all') {
      where.status = status
    }

    // Filter by type
    if (type && type !== 'all') {
      where.type = type
    }

    // Search by message, email, or name
    if (search) {
      where[Op.or] = [
        { message: { [Op.like]: `%${search}%` } },
        { user_email: { [Op.like]: `%${search}%` } },
        { user_name: { [Op.like]: `%${search}%` } }
      ]
    }

    // Get feedback with pagination
    const { count, rows: feedback } = await Feedback.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'plan'],
          required: false
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'email', 'name'],
          required: false
        }
      ],
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset
    })

    const totalPages = Math.ceil(count / limitNum)

    res.json({
      success: true,
      feedback,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get feedback error:', error)
    res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/feedback/stats
 * Get feedback statistics (admin only)
 */
export const getFeedbackStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalFeedback = await Feedback.count()
    const newFeedback = await Feedback.count({ where: { status: 'new' } })
    const inProgressFeedback = await Feedback.count({ where: { status: 'in_progress' } })
    const resolvedFeedback = await Feedback.count({ where: { status: 'resolved' } })
    const dismissedFeedback = await Feedback.count({ where: { status: 'dismissed' } })

    const bugReports = await Feedback.count({ where: { type: 'bug' } })
    const featureRequests = await Feedback.count({ where: { type: 'feature' } })
    const generalFeedback = await Feedback.count({ where: { type: 'general' } })

    res.json({
      success: true,
      stats: {
        total: totalFeedback,
        byStatus: {
          new: newFeedback,
          in_progress: inProgressFeedback,
          resolved: resolvedFeedback,
          dismissed: dismissedFeedback
        },
        byType: {
          bug: bugReports,
          feature: featureRequests,
          general: generalFeedback
        }
      }
    })
  } catch (error) {
    console.error('Get feedback stats error:', error)
    res.status(500).json({
      error: 'Failed to fetch feedback statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/admin/feedback/:id
 * Get single feedback by ID (admin only)
 */
export const getFeedbackById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const feedback = await Feedback.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'plan', 'created_at'],
          required: false
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'email', 'name'],
          required: false
        }
      ]
    })

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' })
      return
    }

    res.json({
      success: true,
      feedback
    })
  } catch (error) {
    console.error('Get feedback by ID error:', error)
    res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * PATCH /api/admin/feedback/:id/status
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status } = req.body
    const adminId = (req as any).user?.userId

    if (!status || !['new', 'in_progress', 'resolved', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const feedback = await Feedback.findByPk(id)

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' })
      return
    }

    // Update status
    feedback.status = status as FeedbackStatus
    feedback.admin_id = adminId

    if (status === 'resolved') {
      feedback.resolved_at = new Date()
    }

    await feedback.save()

    res.json({
      success: true,
      message: 'Feedback status updated',
      feedback
    })
  } catch (error) {
    console.error('Update feedback status error:', error)
    res.status(500).json({
      error: 'Failed to update feedback status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/feedback/:id/reply
 * Reply to feedback (admin only)
 */
export const replyToFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { reply } = req.body
    const adminId = (req as any).user?.userId

    if (!reply || reply.trim().length === 0) {
      res.status(400).json({ error: 'Reply message is required' })
      return
    }

    const feedback = await Feedback.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'name'],
          required: false
        }
      ]
    })

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' })
      return
    }

    // Sanitize admin reply to prevent XSS
    const sanitizedReply = sanitizeRichText(reply.trim())

    // Update feedback with reply
    feedback.admin_reply = sanitizedReply
    feedback.admin_id = adminId
    feedback.status = 'resolved' as FeedbackStatus
    feedback.resolved_at = new Date()
    await feedback.save()

    // Send email to user if email is available
    if (feedback.user_email) {
      try {
        const admin = await User.findByPk(adminId, {
          attributes: ['name', 'email']
        })

        await emailService.sendEmail({
          to: feedback.user_email,
          subject: `[PDFLab] Response to your feedback`,
          html: `
            <h2>Thank you for your feedback!</h2>
            <p>Hi ${feedback.user_name || 'there'},</p>
            <p>We've reviewed your feedback and wanted to respond:</p>
            <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 20px 0;">
              ${reply}
            </blockquote>
            <p><strong>Your original message:</strong></p>
            <p>${feedback.message}</p>
            <p>Best regards,<br>${admin?.name || 'PDFLab Team'}</p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send reply email:', emailError)
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Reply sent successfully',
      feedback
    })
  } catch (error) {
    console.error('Reply to feedback error:', error)
    res.status(500).json({
      error: 'Failed to send reply',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * DELETE /api/admin/feedback/:id
 * Delete feedback (admin only)
 */
export const deleteFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const feedback = await Feedback.findByPk(id)

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' })
      return
    }

    await feedback.destroy()

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    })
  } catch (error) {
    console.error('Delete feedback error:', error)
    res.status(500).json({
      error: 'Failed to delete feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/admin/feedback/bulk-update
 * Bulk update feedback status (admin only)
 */
export const bulkUpdateFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status } = req.body
    const adminId = (req as any).user?.userId

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'No feedback IDs provided' })
      return
    }

    if (!status || !['new', 'in_progress', 'resolved', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const updateData: any = {
      status: status as FeedbackStatus,
      admin_id: adminId
    }

    if (status === 'resolved') {
      updateData.resolved_at = new Date()
    }

    const [updatedCount] = await Feedback.update(updateData, {
      where: {
        id: { [Op.in]: ids }
      }
    })

    res.json({
      success: true,
      message: `${updatedCount} feedback items updated`,
      updated: updatedCount
    })
  } catch (error) {
    console.error('Bulk update feedback error:', error)
    res.status(500).json({
      error: 'Failed to bulk update feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * DELETE /api/admin/feedback/bulk-delete
 * Bulk delete feedback (admin only)
 */
export const bulkDeleteFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'No feedback IDs provided' })
      return
    }

    const deletedCount = await Feedback.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    })

    res.json({
      success: true,
      message: `${deletedCount} feedback items deleted`,
      deleted: deletedCount
    })
  } catch (error) {
    console.error('Bulk delete feedback error:', error)
    res.status(500).json({
      error: 'Failed to bulk delete feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
