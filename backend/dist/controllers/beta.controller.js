"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBetaApplicationStatus = exports.rejectBetaApplication = exports.approveBetaApplication = exports.getAllBetaApplications = exports.submitBetaApplication = void 0;
const models_1 = require("../models");
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Submit Beta Application
const submitBetaApplication = async (req, res) => {
    try {
        const { full_name, email, company, role, use_case, monthly_volume, plan_requested, linkedin_url, twitter_url, website_url, } = req.body;
        // Validation
        if (!full_name || !email || !use_case) {
            res.status(400).json({
                message: 'Full name, email, and use case are required',
            });
            return;
        }
        // Check if email already applied
        const existingApplication = await models_1.BetaApplication.findOne({
            where: { email },
        });
        if (existingApplication) {
            res.status(400).json({
                message: 'An application with this email already exists',
                status: existingApplication.status,
            });
            return;
        }
        // Check if user already exists
        const existingUser = await models_1.User.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                message: 'An account with this email already exists. Please login instead.',
            });
            return;
        }
        // Create application
        const application = await models_1.BetaApplication.create({
            id: (0, uuid_1.v4)(),
            full_name,
            email,
            company,
            role,
            use_case,
            monthly_volume,
            plan_requested: plan_requested || 'starter',
            linkedin_url,
            twitter_url,
            website_url,
            status: 'pending',
        });
        res.status(201).json({
            message: 'Beta application submitted successfully! We will review your application and get back to you soon.',
            application: {
                id: application.id,
                email: application.email,
                status: application.status,
                plan_requested: application.plan_requested,
                created_at: application.created_at,
            },
        });
    }
    catch (error) {
        console.error('Beta application error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.submitBetaApplication = submitBetaApplication;
// Get All Beta Applications (Admin only)
const getAllBetaApplications = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }
        const applications = await models_1.BetaApplication.findAll({
            where,
            order: [['created_at', 'DESC']],
        });
        res.json({ applications });
    }
    catch (error) {
        console.error('Fetch applications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllBetaApplications = getAllBetaApplications;
// Approve Beta Application (Admin only)
const approveBetaApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const application = await models_1.BetaApplication.findByPk(id);
        if (!application) {
            res.status(404).json({ message: 'Application not found' });
            return;
        }
        if (application.status !== 'pending') {
            res.status(400).json({
                message: `Application already ${application.status}`,
            });
            return;
        }
        // Generate random password
        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt_1.default.hash(randomPassword, 10);
        // Create user account
        const user = await models_1.User.create({
            id: (0, uuid_1.v4)(),
            email: application.email,
            password_hash: hashedPassword,
            name: application.full_name,
            plan: application.plan_requested === 'pro' ? models_1.UserPlan.PRO : models_1.UserPlan.STARTER,
            conversions_limit: application.plan_requested === 'pro' ? -1 : 100,
            conversions_used: 0,
            is_beta_user: true,
            beta_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days - optimal for BETA LAUNCH (18-22% conversion, builds evangelists). Switch to 30 days when product matures.
        });
        // Update application
        application.status = 'approved';
        application.reviewed_by = userId;
        application.reviewed_at = new Date();
        application.user_id = user.id;
        await application.save();
        // TODO: Send email with credentials
        // For now, return password in response (remove in production)
        res.json({
            message: 'Beta application approved successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                is_beta_user: user.is_beta_user,
                beta_expires_at: user.beta_expires_at,
            },
            credentials: {
                email: user.email,
                password: randomPassword, // Send via email in production
            },
        });
    }
    catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.approveBetaApplication = approveBetaApplication;
// Reject Beta Application (Admin only)
const rejectBetaApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;
        const userId = req.user?.id;
        const application = await models_1.BetaApplication.findByPk(id);
        if (!application) {
            res.status(404).json({ message: 'Application not found' });
            return;
        }
        if (application.status !== 'pending') {
            res.status(400).json({
                message: `Application already ${application.status}`,
            });
            return;
        }
        application.status = 'rejected';
        application.reviewed_by = userId;
        application.reviewed_at = new Date();
        application.rejection_reason = rejection_reason;
        await application.save();
        res.json({
            message: 'Beta application rejected',
            application: {
                id: application.id,
                email: application.email,
                status: application.status,
                rejection_reason: application.rejection_reason,
            },
        });
    }
    catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.rejectBetaApplication = rejectBetaApplication;
// Get Beta Application Status (Public - by email)
const getBetaApplicationStatus = async (req, res) => {
    try {
        const { email } = req.params;
        const application = await models_1.BetaApplication.findOne({
            where: { email },
        });
        if (!application) {
            res.status(404).json({
                message: 'No application found for this email',
            });
            return;
        }
        res.json({
            application: {
                id: application.id,
                email: application.email,
                full_name: application.full_name,
                status: application.status,
                plan_requested: application.plan_requested,
                created_at: application.created_at,
                reviewed_at: application.reviewed_at,
            },
        });
    }
    catch (error) {
        console.error('Get application status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBetaApplicationStatus = getBetaApplicationStatus;
//# sourceMappingURL=beta.controller.js.map