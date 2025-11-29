"use strict";
/**
 * Founder's Edition Application & Approval Routes
 * Handles application submission and admin approval workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const database_1 = require("../config/database");
// Helper function to send email (placeholder - implement actual email service)
async function sendEmail(options) {
    console.log(`Email to ${options.to}: ${options.subject}`);
    // TODO: Implement actual email sending
}
// Helper function to execute queries
async function query(sql, params) {
    const results = await database_1.sequelize.query(sql, {
        replacements: params,
        type: sequelize_1.QueryTypes.SELECT
    });
    return { rows: results };
}
const router = (0, express_1.Router)();
/**
 * POST /api/founder/apply
 * Submit Founder's Edition application
 */
router.post('/apply', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { reason, use_case } = req.body;
        if (!reason || !use_case) {
            return res.status(400).json({
                error: 'Application incomplete',
                message: 'Please provide both reason and use case'
            });
        }
        // Check if spots are still available
        const spotsResult = await query(`SELECT
        100 - COUNT(*) FILTER (WHERE founder_application_status = 'approved' OR founder_status != 'none') as spots_remaining
       FROM users`);
        const spotsRemaining = spotsResult.rows[0].spots_remaining;
        if (spotsRemaining <= 0) {
            return res.status(400).json({
                error: 'No spots available',
                message: 'All 100 Founder\'s Edition spots have been filled'
            });
        }
        // Check if user already has an application
        const existing = await query('SELECT founder_application_status FROM users WHERE id = $1', [userId]);
        if (existing.rows[0]?.founder_application_status !== 'none') {
            return res.status(400).json({
                error: 'Application already exists',
                message: 'You have already submitted an application',
                status: existing.rows[0].founder_application_status
            });
        }
        // Submit application
        await query(`UPDATE users
       SET founder_application_status = 'pending',
           founder_application_reason = $1,
           founder_application_use_case = $2,
           founder_application_submitted_at = NOW()
       WHERE id = $3`, [reason, use_case, userId]);
        // Get user info for confirmation email
        const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        // Send confirmation email
        await sendEmail({
            to: user.email,
            subject: 'Founder\'s Edition Application Received',
            html: `
        <h2>Application Received!</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>We've received your Founder's Edition application. Our team will review it shortly.</p>
        <p><strong>What happens next:</strong></p>
        <ul>
          <li>Our team reviews your application (typically within 24-48 hours)</li>
          <li>You'll receive an email with our decision</li>
          <li>If approved, you'll get immediate access to the 14-day challenge</li>
        </ul>
        <p><strong>Your Application:</strong></p>
        <p><em>Why you want to join:</em><br>${reason}</p>
        <p><em>How you'll use PDFLab:</em><br>${use_case}</p>
        <p>Best,<br>The PDFLab Team</p>
      `
        });
        res.json({
            success: true,
            message: 'Application submitted successfully',
            status: 'pending'
        });
    }
    catch (error) {
        console.error('Application submission error:', error);
        res.status(500).json({
            error: 'Application failed',
            message: 'Failed to submit application'
        });
    }
});
/**
 * GET /api/founder/applications
 * Get all pending applications (admin only)
 */
router.get('/applications', admin_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let whereClause = "founder_application_status != 'none'";
        if (status && typeof status === 'string') {
            whereClause = `founder_application_status = '${status}'`;
        }
        const result = await query(`SELECT
        id,
        email,
        name,
        founder_application_status,
        founder_application_reason,
        founder_application_use_case,
        founder_application_submitted_at,
        founder_application_reviewed_at,
        founder_rejection_reason,
        created_at
       FROM users
       WHERE ${whereClause}
       ORDER BY founder_application_submitted_at DESC
       LIMIT 200`);
        res.json({
            applications: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
            error: 'Failed to fetch applications'
        });
    }
});
/**
 * GET /api/founder/application-stats
 * Get application statistics (admin only)
 */
router.get('/application-stats', admin_middleware_1.requireAdmin, async (req, res) => {
    try {
        const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE founder_application_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE founder_application_status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE founder_application_status = 'rejected') as rejected_count,
        100 - COUNT(*) FILTER (WHERE founder_application_status = 'approved' OR founder_status != 'none') as spots_remaining
      FROM users
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Application stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch stats'
        });
    }
});
/**
 * POST /api/founder/approve/:userId
 * Approve a Founder's Edition application (admin only)
 */
router.post('/approve/:userId', admin_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user?.userId;
        // Get user info
        const userResult = await query(`SELECT email, name, founder_application_status
       FROM users
       WHERE id = $1`, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.founder_application_status !== 'pending') {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Only pending applications can be approved'
            });
        }
        // Approve application and activate founder status
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 14); // 14 days from now
        await query(`UPDATE users
       SET founder_application_status = 'approved',
           founder_application_reviewed_at = NOW(),
           founder_application_reviewed_by = $1,
           founder_status = 'active',
           founder_deadline = $2
       WHERE id = $3`, [adminId, deadline, userId]);
        // Send approval email
        await sendEmail({
            to: user.email,
            subject: '🎉 Founder\'s Edition Application Approved!',
            html: `
        <h2>Welcome to Founder's Edition! 🎉</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p><strong>Congratulations!</strong> Your Founder's Edition application has been approved!</p>

        <h3>Your 14-Day Challenge Starts Now</h3>
        <p>Complete these requirements within <strong>14 days</strong> to earn lifetime access:</p>
        <ul>
          <li><strong>10 successful PDF conversions</strong></li>
          <li><strong>Submit product feedback</strong></li>
        </ul>

        <p><strong>Challenge Deadline:</strong> ${deadline.toLocaleDateString()}</p>

        <p><a href="https://pdflab.pro/login" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Get Started Now</a></p>

        <p>Track your progress anytime by logging into your account.</p>

        <p>Best,<br>The PDFLab Team</p>
      `
        });
        res.json({
            success: true,
            message: 'Application approved',
            deadline: deadline.toISOString()
        });
    }
    catch (error) {
        console.error('Approval error:', error);
        res.status(500).json({
            error: 'Failed to approve application'
        });
    }
});
/**
 * POST /api/founder/reject/:userId
 * Reject a Founder's Edition application (admin only)
 */
router.post('/reject/:userId', admin_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.userId;
        if (!reason) {
            return res.status(400).json({
                error: 'Reason required',
                message: 'Please provide a reason for rejection'
            });
        }
        // Get user info
        const userResult = await query(`SELECT email, name, founder_application_status
       FROM users
       WHERE id = $1`, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.founder_application_status !== 'pending') {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Only pending applications can be rejected'
            });
        }
        // Reject application
        await query(`UPDATE users
       SET founder_application_status = 'rejected',
           founder_application_reviewed_at = NOW(),
           founder_application_reviewed_by = $1,
           founder_rejection_reason = $2
       WHERE id = $3`, [adminId, reason, userId]);
        // Send rejection email
        await sendEmail({
            to: user.email,
            subject: 'Founder\'s Edition Application Update',
            html: `
        <h2>Application Update</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>Thank you for your interest in PDFLab's Founder's Edition.</p>
        <p>After careful review, we're unable to approve your application at this time.</p>

        <p><strong>Reason:</strong></p>
        <p>${reason}</p>

        <p>We appreciate your interest in PDFLab and hope you'll continue to use our service. You can still access all standard features with a regular account.</p>

        <p>Best,<br>The PDFLab Team</p>
      `
        });
        res.json({
            success: true,
            message: 'Application rejected'
        });
    }
    catch (error) {
        console.error('Rejection error:', error);
        res.status(500).json({
            error: 'Failed to reject application'
        });
    }
});
/**
 * GET /api/founder/my-application
 * Get current user's application status
 */
router.get('/my-application', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const result = await query(`SELECT
        founder_application_status,
        founder_application_reason,
        founder_application_use_case,
        founder_application_submitted_at,
        founder_application_reviewed_at,
        founder_rejection_reason,
        founder_status,
        founder_deadline
       FROM users
       WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({
            error: 'Failed to fetch application'
        });
    }
});
exports.default = router;
//# sourceMappingURL=founder.application.routes.js.map