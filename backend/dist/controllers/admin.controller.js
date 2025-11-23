"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserQuotaEndpoint = exports.fixQuotas = exports.getQuotaStatus = exports.getStats = exports.exportUsersToCSV = exports.bulkQuotaReset = exports.getUserActivity = exports.getUserConversions = exports.deleteUser = exports.impersonateUser = exports.createUser = exports.verifyUserEmail = exports.resendVerificationEmail = exports.resetUserPassword = exports.resetUserQuota = exports.updateUserPlan = exports.updateUser = exports.getUserById = exports.getBetaUsers = exports.getAllUsers = void 0;
const User_1 = require("../models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const quota_utils_1 = require("../utils/quota.utils");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * GET /api/admin/users
 * Get all users with search, filtering, and pagination
 * Query params: search, plan, role, status, page, limit, sortBy, sortOrder
 */
const getAllUsers = async (req, res) => {
    try {
        const { search = '', plan, role, page = '1', limit = '25', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause for filtering
        const where = {};
        // Search by email or name
        if (search) {
            where[sequelize_1.Op.or] = [
                { email: { [sequelize_1.Op.like]: `%${search}%` } },
                { name: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        // Filter by plan
        if (plan && plan !== 'all') {
            where.plan = plan;
        }
        // Filter by role
        if (role && role !== 'all') {
            where.role = role;
        }
        // Get users with pagination
        const { count, rows: users } = await User_1.User.findAndCountAll({
            where,
            attributes: { exclude: ['password_hash'] },
            order: [[sortBy, sortOrder]],
            limit: limitNum,
            offset
        });
        const totalPages = Math.ceil(count / limitNum);
        res.json({
            success: true,
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get all users error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllUsers = getAllUsers;
/**
 * GET /api/admin/beta-users
 * Get all beta users (users with is_beta_user = true)
 * Query params: search, page, limit, sortBy, sortOrder
 */
const getBetaUsers = async (req, res) => {
    try {
        const { search = '', page = '1', limit = '25', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause - only beta users
        const where = { is_beta_user: true };
        // Search by email or name
        if (search) {
            where[sequelize_1.Op.or] = [
                { email: { [sequelize_1.Op.like]: `%${search}%` } },
                { name: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        // Get beta users with pagination
        const { count, rows: users } = await User_1.User.findAndCountAll({
            where,
            attributes: { exclude: ['password_hash'] },
            order: [[sortBy, sortOrder]],
            limit: limitNum,
            offset
        });
        const totalPages = Math.ceil(count / limitNum);
        res.json({
            success: true,
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get beta users error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch beta users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getBetaUsers = getBetaUsers;
/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id, {
            attributes: { exclude: ['password_hash'] }
        });
        if (!user) {
            res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID'
            });
            return;
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        logger_1.default.error('Get user by ID error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserById = getUserById;
/**
 * PUT /api/admin/users/:id
 * Update user profile (name, email, plan, role)
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, plan, role } = req.body;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User_1.User.findOne({ where: { email } });
            if (existingUser) {
                res.status(400).json({
                    error: 'Email already exists',
                    message: 'Another user is already using this email address'
                });
                return;
            }
        }
        // Update user fields
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (email !== undefined)
            updates.email = email;
        if (plan !== undefined)
            updates.plan = plan;
        if (role !== undefined)
            updates.role = role;
        await user.update(updates);
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
        });
    }
    catch (error) {
        logger_1.default.error('Update user error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to update user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateUser = updateUser;
/**
 * PUT /api/admin/users/:id/plan
 * Update user plan/tier
 */
const updateUserPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan } = req.body;
        if (!['free', 'starter', 'pro', 'enterprise'].includes(plan)) {
            res.status(400).json({
                error: 'Invalid plan',
                message: 'Plan must be one of: free, starter, pro, enterprise'
            });
            return;
        }
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Update plan and conversion limits
        const limits = {
            free: 3,
            starter: 100,
            pro: -1, // Unlimited
            enterprise: -1 // Unlimited
        };
        await user.update({
            plan,
            conversions_limit: limits[plan]
        });
        res.json({
            success: true,
            message: 'User plan updated successfully',
            user: {
                id: user.id,
                email: user.email,
                plan: user.plan,
                conversions_limit: user.conversions_limit
            }
        });
    }
    catch (error) {
        logger_1.default.error('Update user plan error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to update user plan',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateUserPlan = updateUserPlan;
/**
 * PUT /api/admin/users/:id/quota
 * Reset user conversion quota
 */
const resetUserQuota = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        await user.update({
            conversions_used: 0
        });
        res.json({
            success: true,
            message: 'User quota reset successfully',
            user: {
                id: user.id,
                email: user.email,
                conversions_used: 0,
                conversions_limit: user.conversions_limit
            }
        });
    }
    catch (error) {
        logger_1.default.error('Reset user quota error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to reset user quota',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.resetUserQuota = resetUserQuota;
/**
 * POST /api/admin/users/:id/reset-password
 * Generate password reset link/token for user
 */
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Generate a temporary password reset token (in production, this would be emailed)
        const { generateAccessToken } = await Promise.resolve().then(() => __importStar(require('../utils/auth.utils')));
        const resetToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        // In production, you would send this via email
        // For now, we just return it to the admin
        const resetLink = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        res.json({
            success: true,
            message: 'Password reset link generated',
            resetLink,
            resetToken
        });
    }
    catch (error) {
        logger_1.default.error('Reset password error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to generate reset link',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.resetUserPassword = resetUserPassword;
/**
 * POST /api/admin/users/:id/resend-verification
 * Resend email verification to user
 */
const resendVerificationEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Generate verification token
        const { generateAccessToken } = await Promise.resolve().then(() => __importStar(require('../utils/auth.utils')));
        const verificationToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            plan: user.plan
        }, '24h'); // 24-hour expiry for email verification
        // Send verification email
        const emailService = await Promise.resolve().then(() => __importStar(require('../services/email.service')));
        const emailSent = await emailService.default.sendVerificationEmail(user.email, verificationToken);
        if (!emailSent) {
            res.status(500).json({
                error: 'Failed to send email',
                message: 'Email service error - please check SMTP configuration'
            });
            return;
        }
        res.json({
            success: true,
            message: `Verification email sent to ${user.email}`,
            email: user.email
        });
    }
    catch (error) {
        logger_1.default.error('Resend verification email error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to send verification email',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.resendVerificationEmail = resendVerificationEmail;
/**
 * POST /api/admin/users/:id/verify-email
 * Manually verify user's email (admin only)
 */
const verifyUserEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Check if already verified
        if (user.email_verified) {
            res.status(400).json({
                error: 'Email already verified',
                message: `Email ${user.email} was already verified on ${user.email_verified_at?.toISOString()}`
            });
            return;
        }
        // Update user verification status
        await user.update({
            email_verified: true,
            email_verified_at: new Date()
        });
        res.json({
            success: true,
            message: `Email ${user.email} manually verified by admin`,
            user: {
                id: user.id,
                email: user.email,
                email_verified: user.email_verified,
                email_verified_at: user.email_verified_at
            }
        });
    }
    catch (error) {
        logger_1.default.error('Verify user email error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to verify user email',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.verifyUserEmail = verifyUserEmail;
/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
const createUser = async (req, res) => {
    try {
        const { email, password, name, plan = 'free' } = req.body;
        if (!email || !password) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'Email and password are required'
            });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.User.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                error: 'User already exists',
                message: 'A user with this email already exists'
            });
            return;
        }
        // Hash password
        const password_hash = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = await User_1.User.create({
            email,
            password_hash,
            name: name || email.split('@')[0],
            plan,
            conversions_used: 0,
            conversions_limit: plan === 'free' ? 3 : plan === 'starter' ? 100 : -1
        });
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan
            }
        });
    }
    catch (error) {
        logger_1.default.error('Create user error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to create user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createUser = createUser;
/**
 * POST /api/admin/users/:id/impersonate
 * Generate temporary impersonation token (super admin only)
 */
const impersonateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if admin is super_admin
        const adminUserId = req.userId;
        const adminUser = await User_1.User.findByPk(adminUserId);
        if (!adminUser || adminUser.role !== 'super_admin') {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Only super admins can impersonate users'
            });
            return;
        }
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Generate impersonation token (30-minute expiry)
        const { generateAccessToken } = await Promise.resolve().then(() => __importStar(require('../utils/auth.utils')));
        const impersonationToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            plan: user.plan,
            impersonatedBy: adminUserId,
            impersonation: true
        }, '30m');
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
        });
    }
    catch (error) {
        logger_1.default.error('Impersonate user error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to generate impersonation token',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.impersonateUser = impersonateUser;
/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only)
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        await user.destroy();
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Delete user error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to delete user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteUser = deleteUser;
/**
 * GET /api/admin/users/:id/conversions
 * Get user's conversion history
 */
const getUserConversions = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '50', type, status } = req.query;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Import ConversionJob model
        const { ConversionJob } = await Promise.resolve().then(() => __importStar(require('../models')));
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        // Build where clause
        const where = { user_id: id };
        if (type && type !== 'all') {
            where.type = type;
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        // Get conversions with pagination
        const { count, rows: conversions } = await ConversionJob.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset
        });
        const totalPages = Math.ceil(count / limitNum);
        res.json({
            success: true,
            conversions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get user conversions error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch user conversions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserConversions = getUserConversions;
/**
 * GET /api/admin/users/:id/activity
 * Get user's activity timeline (logins, conversions, payments)
 */
const getUserActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '50' } = req.query;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({
                error: 'User not found'
            });
            return;
        }
        // Import models
        const { ConversionJob, AdminAuditLog } = await Promise.resolve().then(() => __importStar(require('../models')));
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
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
        });
        // 2. Audit logs (password resets, quota resets, etc.)
        const auditLogs = await AdminAuditLog.findAll({
            where: {
                entity_type: 'user',
                entity_id: id
            },
            attributes: ['id', 'action', 'changes', 'ip_address', 'created_at'],
            limit: limitNum,
            order: [['created_at', 'DESC']]
        });
        // Combine and format activity events
        const activities = [];
        // Add conversions
        conversions.forEach((conv) => {
            activities.push({
                id: `conv-${conv.id}`,
                type: 'conversion',
                action: `Conversion ${conv.status}`,
                details: `${conv.type.replace('-', ' → ').toUpperCase()}: ${conv.file_name}`,
                status: conv.status,
                timestamp: conv.created_at
            });
        });
        // Add audit events
        auditLogs.forEach((log) => {
            activities.push({
                id: `audit-${log.id}`,
                type: 'admin_action',
                action: log.action,
                details: JSON.stringify(log.changes),
                ip_address: log.ip_address,
                timestamp: log.created_at
            });
        });
        // Add login event (from user.last_login)
        if (user.last_login) {
            activities.push({
                id: 'last-login',
                type: 'login',
                action: 'User logged in',
                details: 'Last recorded login',
                timestamp: user.last_login
            });
        }
        // Sort by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Paginate
        const paginatedActivities = activities.slice(offset, offset + limitNum);
        const total = activities.length;
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            activities: paginatedActivities,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get user activity error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch user activity',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserActivity = getUserActivity;
/**
 * POST /api/admin/users/bulk-quota-reset
 * Reset quota for multiple users at once
 */
const bulkQuotaReset = async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            res.status(400).json({
                error: 'Invalid request',
                message: 'userIds must be a non-empty array'
            });
            return;
        }
        // Limit to 1000 users per batch to prevent timeouts
        if (userIds.length > 1000) {
            res.status(400).json({
                error: 'Too many users',
                message: 'Maximum 1000 users per bulk operation'
            });
            return;
        }
        // Reset quota for all selected users
        const [affectedCount] = await User_1.User.update({ conversions_used: 0 }, { where: { id: userIds } });
        // Get updated users for response
        const updatedUsers = await User_1.User.findAll({
            where: { id: userIds },
            attributes: ['id', 'email', 'name', 'conversions_used', 'conversions_limit']
        });
        res.json({
            success: true,
            message: `Quota reset for ${affectedCount} users`,
            affectedCount,
            users: updatedUsers
        });
    }
    catch (error) {
        logger_1.default.error('Bulk quota reset error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to reset quotas',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.bulkQuotaReset = bulkQuotaReset;
/**
 * GET /api/admin/users/export
 * Export users to CSV (respects filters)
 */
const exportUsersToCSV = async (req, res) => {
    try {
        const { search = '', plan, role } = req.query;
        // Build where clause (same as getAllUsers)
        const where = {};
        if (search) {
            where[sequelize_1.Op.or] = [
                { email: { [sequelize_1.Op.like]: `%${search}%` } },
                { name: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        if (plan && plan !== 'all') {
            where.plan = plan;
        }
        if (role && role !== 'all') {
            where.role = role;
        }
        // Get all users matching filters (no pagination for export)
        const users = await User_1.User.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 10000 // Hard limit to prevent memory issues
        });
        // Generate CSV content
        const headers = ['ID', 'Email', 'Name', 'Role', 'Plan', 'Conversions Used', 'Conversions Limit', 'Last Login', 'Created At'];
        const csvRows = [headers.join(',')];
        users.forEach((user) => {
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
            ];
            csvRows.push(row.join(','));
        });
        const csvContent = csvRows.join('\n');
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `users_export_${timestamp}.csv`;
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
    catch (error) {
        logger_1.default.error('Export users error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to export users',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.exportUsersToCSV = exportUsersToCSV;
/**
 * GET /api/admin/stats
 * Get platform statistics
 */
const getStats = async (req, res) => {
    try {
        const totalUsers = await User_1.User.count();
        const freeUsers = await User_1.User.count({ where: { plan: 'free' } });
        const starterUsers = await User_1.User.count({ where: { plan: 'starter' } });
        const proUsers = await User_1.User.count({ where: { plan: 'pro' } });
        const enterpriseUsers = await User_1.User.count({ where: { plan: 'enterprise' } });
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
        });
    }
    catch (error) {
        logger_1.default.error('Get stats error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getStats = getStats;
/**
 * GET /api/admin/quota-status
 * Get quota status for all users (shows who needs fixing)
 */
const getQuotaStatus = async (req, res) => {
    try {
        const users = await User_1.User.findAll();
        const status = users.map(user => {
            const info = (0, quota_utils_1.getQuotaInfo)(user);
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
            };
        });
        const needsFix = status.filter(s => s.needs_fix).length;
        res.json({
            success: true,
            total_users: users.length,
            users_needing_fix: needsFix,
            users: status
        });
    }
    catch (error) {
        logger_1.default.error('Get quota status error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to get quota status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getQuotaStatus = getQuotaStatus;
/**
 * POST /api/admin/fix-quotas
 * Fix quota limits for ALL users based on their plans
 */
const fixQuotas = async (req, res) => {
    try {
        logger_1.default.info('🔧 Admin triggered quota fix for all users');
        const result = await (0, quota_utils_1.fixAllUserQuotas)();
        res.json({
            success: true,
            message: `Fixed ${result.fixed} out of ${result.total} users`,
            fixed: result.fixed,
            total: result.total,
            unchanged: result.total - result.fixed
        });
    }
    catch (error) {
        logger_1.default.error('Fix quotas error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fix quotas',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.fixQuotas = fixQuotas;
/**
 * POST /api/admin/users/:id/sync-quota
 * Sync quota for a specific user
 */
const syncUserQuotaEndpoint = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findByPk(id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const beforeInfo = (0, quota_utils_1.getQuotaInfo)(user);
        await (0, quota_utils_1.syncUserQuota)(user);
        const afterInfo = (0, quota_utils_1.getQuotaInfo)(user);
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
        });
    }
    catch (error) {
        logger_1.default.error('Sync user quota error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to sync quota',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.syncUserQuotaEndpoint = syncUserQuotaEndpoint;
//# sourceMappingURL=admin.controller.js.map