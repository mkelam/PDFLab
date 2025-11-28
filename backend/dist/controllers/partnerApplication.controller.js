"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flagApplication = exports.rejectApplication = exports.approveApplication = exports.getApplication = exports.getApplications = exports.submitApplication = void 0;
const uuid_1 = require("uuid");
const PartnerApplication_1 = __importDefault(require("../models/PartnerApplication"));
const Partner_1 = require("../models/Partner");
const email_service_1 = __importDefault(require("../services/email.service"));
const partner_utils_1 = require("../utils/partner.utils");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Auto-scoring algorithm for partner applications
 * Scores 0-100 based on:
 * - Platform authority (40 points)
 * - Audience size (30 points)
 * - Content quality (20 points)
 * - Niche match (10 points)
 */
function calculateApplicationScore(application) {
    let score = 0;
    // Platform authority (40 points)
    const platformScores = {
        youtube: 40,
        linkedin: 35,
        blog: 30,
        newsletter: 30,
        instagram: 25,
        tiktok: 25,
        twitter: 20,
        other: 10
    };
    score += platformScores[application.primary_platform] || 0;
    // Audience size (30 points)
    const audienceScores = {
        '500k_plus': 30,
        '100k_500k': 25,
        '50k_100k': 20,
        '10k_50k': 15,
        '1k_10k': 10,
        'under_1k': 0
    };
    score += audienceScores[application.audience_size] || 0;
    // Content quality - based on length and keywords (20 points)
    const whyPdflab = application.why_pdflab?.toLowerCase() || '';
    const contentIdea = application.content_idea?.toLowerCase() || '';
    // Length check
    if (whyPdflab.length >= 200 && contentIdea.length >= 100) {
        score += 10;
    }
    else if (whyPdflab.length >= 100 && contentIdea.length >= 50) {
        score += 5;
    }
    // Quality keywords
    const qualityKeywords = [
        'tutorial', 'review', 'guide', 'audience', 'community',
        'video', 'course', 'integration', 'workflow', 'productivity'
    ];
    const foundKeywords = qualityKeywords.filter(keyword => whyPdflab.includes(keyword) || contentIdea.includes(keyword));
    score += Math.min(foundKeywords.length * 2, 10); // Max 10 points
    // Niche match (10 points)
    const goodNiches = [
        'saas founders', 'marketers', 'content creators',
        'business professionals', 'developers', 'designers'
    ];
    const niche = application.audience_niche?.toLowerCase() || '';
    if (goodNiches.some(good => niche.includes(good))) {
        score += 10;
    }
    else if (niche.length > 0) {
        score += 5;
    }
    return Math.min(score, 100);
}
/**
 * Check if application should be auto-rejected
 */
function shouldAutoReject(application, score) {
    // Check for disposable email domains
    const disposableDomains = [
        'tempmail', 'guerrillamail', '10minutemail', 'throwaway',
        'mailinator', 'maildrop', 'trashmail'
    ];
    const emailDomain = application.email.split('@')[1]?.toLowerCase() || '';
    if (disposableDomains.some(d => emailDomain.includes(d))) {
        return { reject: true, reason: 'Disposable email address detected' };
    }
    // Audience too small (unless high score from other factors)
    if (application.audience_size === 'under_1k' && score < 40) {
        return { reject: true, reason: 'Minimum audience size of 1,000 required' };
    }
    // Response too short (spam filter) - only check if provided
    if (application.why_pdflab && application.why_pdflab.length < 50) {
        return {
            reject: true,
            reason: 'Application requires more detailed explanation (minimum 50 characters)'
        };
    }
    // No spam keywords - only check if fields are provided
    const spamKeywords = ['make money', 'quick cash', 'easy money', 'get rich'];
    const text = ((application.why_pdflab || '') + ' ' + (application.content_idea || '')).toLowerCase();
    if (spamKeywords.some(spam => text.includes(spam))) {
        return { reject: true, reason: 'Application does not meet quality standards' };
    }
    return { reject: false };
}
/**
 * Submit partner application (PUBLIC)
 * POST /api/partner-applications/submit
 */
const submitApplication = async (req, res) => {
    try {
        const { email, full_name, brand_name, country, primary_platform, audience_size, audience_niche, platform_url, why_pdflab, promotion_methods, content_idea, estimated_conversions, previous_affiliates } = req.body;
        // Validation - only require core fields
        if (!email || !full_name || !primary_platform || !audience_size || !audience_niche || !platform_url) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Check for duplicate application
        const existingApplication = await PartnerApplication_1.default.findOne({
            where: { email }
        });
        if (existingApplication) {
            if (existingApplication.status === 'pending') {
                res.status(409).json({ error: 'You already have a pending application' });
                return;
            }
            else if (existingApplication.status === 'approved') {
                res.status(409).json({ error: 'You are already an approved partner' });
                return;
            }
            else if (existingApplication.status === 'rejected') {
                // Check if 90 days have passed
                const daysSinceRejection = Math.floor((Date.now() - new Date(existingApplication.reviewed_at || 0).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceRejection < 90) {
                    res.status(403).json({
                        error: `You can reapply ${90 - daysSinceRejection} days after your previous rejection`
                    });
                    return;
                }
            }
        }
        // Sanitize optional fields - convert empty strings to null for ENUM columns
        const sanitizedEstimatedConversions = estimated_conversions && estimated_conversions.trim() !== ''
            ? estimated_conversions
            : null;
        const sanitizedPreviousAffiliates = previous_affiliates && previous_affiliates.trim() !== ''
            ? previous_affiliates
            : null;
        // Calculate application score
        const applicationData = {
            email,
            full_name,
            brand_name: brand_name || null,
            country: country || null,
            primary_platform,
            audience_size,
            audience_niche,
            platform_url,
            why_pdflab: why_pdflab || null,
            promotion_methods: Array.isArray(promotion_methods) ? promotion_methods : [promotion_methods],
            content_idea: content_idea || null,
            estimated_conversions: sanitizedEstimatedConversions,
            previous_affiliates: sanitizedPreviousAffiliates
        };
        const score = calculateApplicationScore(applicationData);
        const autoReject = shouldAutoReject(applicationData, score);
        // Create application
        const application = await PartnerApplication_1.default.create({
            id: (0, uuid_1.v4)(),
            ...applicationData,
            status: autoReject.reject ? 'rejected' : 'pending',
            score,
            rejection_reason: autoReject.reason,
            reviewed_at: autoReject.reject ? new Date() : undefined
        });
        // Send email notification
        if (autoReject.reject) {
            await email_service_1.default.sendEmail({
                to: email,
                subject: 'PDFLab Partner Application - Update',
                html: `
          <p>Hi ${full_name},</p>
          <p>Thank you for your interest in the PDFLab Partner Program.</p>
          <p>Unfortunately, we're unable to approve your application at this time.</p>
          <p><strong>Reason:</strong> ${autoReject.reason}</p>
          <p>You're welcome to reapply after 90 days if your circumstances change.</p>
          <p>Best regards,<br/>The PDFLab Team</p>
        `
            }).catch(err => logger_1.default.error('Email error:', { error: err instanceof Error ? err.message : String(err) }));
            res.status(200).json({
                message: 'Application received but does not meet current requirements',
                status: 'rejected'
            });
            return;
        }
        // Successful submission
        await email_service_1.default.sendEmail({
            to: email,
            subject: 'PDFLab Partner Application Received 🎉',
            html: `
        <p>Hi ${full_name},</p>
        <p>Thank you for applying to the PDFLab Partner Program!</p>
        <p>We've received your application and our team is reviewing it. We typically respond within 2-3 business days.</p>
        <p><strong>What happens next?</strong></p>
        <ul>
          <li>Our team reviews your application and platform</li>
          <li>If approved, you'll receive your unique referral code and dashboard access</li>
          <li>You'll get access to brand assets, sample content, and partner resources</li>
        </ul>
        <p>We'll be in touch soon!</p>
        <p>Best regards,<br/>The PDFLab Team</p>
      `
        }).catch(err => logger_1.default.error('Email error:', { error: err instanceof Error ? err.message : String(err) }));
        res.status(201).json({
            message: 'Application submitted successfully',
            application_id: application.id,
            status: 'pending'
        });
    }
    catch (error) {
        logger_1.default.error('Submit application error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to submit application' });
    }
};
exports.submitApplication = submitApplication;
/**
 * Get all partner applications (ADMIN ONLY)
 * GET /api/partner-applications
 */
const getApplications = async (req, res) => {
    try {
        const { status, sort = 'score' } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }
        const applications = await PartnerApplication_1.default.findAll({
            where,
            order: [[sort, 'DESC']],
            attributes: { exclude: ['admin_notes'] } // Hide internal notes from response
        });
        res.json({ applications });
    }
    catch (error) {
        logger_1.default.error('Get applications error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};
exports.getApplications = getApplications;
/**
 * Get single application details (ADMIN ONLY)
 * GET /api/partner-applications/:id
 */
const getApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await PartnerApplication_1.default.findByPk(id);
        if (!application) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        res.json({ application });
    }
    catch (error) {
        logger_1.default.error('Get application error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to fetch application' });
    }
};
exports.getApplication = getApplication;
/**
 * Approve partner application (ADMIN ONLY)
 * POST /api/partner-applications/:id/approve
 */
const approveApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;
        const adminUser = req.user;
        const application = await PartnerApplication_1.default.findByPk(id);
        if (!application) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        if (application.status !== 'pending' && application.status !== 'flagged') {
            res.status(400).json({ error: 'Application is not in pending state' });
            return;
        }
        // Generate unique identifiers
        const slug = await (0, partner_utils_1.generateSlug)(application.full_name);
        const referralCode = await (0, partner_utils_1.generateReferralCode)(application.full_name);
        // Map application platform to partner platform ENUM
        const platformMapping = {
            youtube: 'youtube',
            twitter: 'twitter',
            linkedin: 'linkedin',
            instagram: 'instagram',
            tiktok: 'tiktok',
            blog: 'other',
            newsletter: 'other',
            podcast: 'other'
        };
        const mappedPlatform = platformMapping[application.primary_platform] || 'other';
        // Create partner account
        const partner = await Partner_1.Partner.create({
            id: (0, uuid_1.v4)(),
            application_id: application.id,
            name: application.full_name,
            email: application.email,
            slug,
            referral_code: referralCode,
            brand_name: application.brand_name,
            platform: mappedPlatform,
            website: application.platform_url,
            status: 'active',
            activated_at: new Date(),
            commission_rate: 30.0, // Start at Bronze tier
            commission_tier: 'bronze',
            free_licenses_allocated: 10,
            free_licenses_used: 0,
            total_clicks: 0,
            total_signups: 0,
            total_conversions: 0,
            total_revenue_generated: 0,
            total_commission_earned: 0,
            total_commission_paid: 0,
            current_month_conversions: 0
        });
        // Update application status
        application.status = 'approved';
        application.reviewed_by = adminUser?.id;
        application.reviewed_at = new Date();
        application.admin_notes = admin_notes;
        await application.save();
        // Send approval email with welcome kit
        await email_service_1.default.sendEmail({
            to: application.email,
            subject: 'Welcome to PDFLab Partners! 🎉',
            html: `
        <h1>Welcome to PDFLab Partners, ${application.full_name}!</h1>
        <p>Congratulations! Your application has been approved.</p>

        <h2>Your Partner Details:</h2>
        <ul>
          <li><strong>Referral Code:</strong> ${referralCode}</li>
          <li><strong>Dashboard URL:</strong> https://partners.pdflab.pro/${slug}</li>
          <li><strong>Commission Rate:</strong> 30% (Bronze Tier)</li>
        </ul>

        <h2>Tier System:</h2>
        <ul>
          <li><strong>Bronze (30%):</strong> 0-10 conversions/month</li>
          <li><strong>Silver (40%):</strong> 11-50 conversions/month</li>
          <li><strong>Gold (50%):</strong> 51-100 conversions/month</li>
          <li><strong>Platinum (60%):</strong> 100+ conversions/month (Elite Partners)</li>
        </ul>

        <h2>How to Promote:</h2>
        <ol>
          <li>Share your dashboard link: https://partners.pdflab.pro/${slug}</li>
          <li>Users who sign up through your link get tracked automatically</li>
          <li>When they upgrade to paid, you earn commission</li>
          <li>Track your earnings in real-time on your dashboard</li>
        </ol>

        <h2>Next Steps:</h2>
        <ul>
          <li>Visit your dashboard to see your referral link and stats</li>
          <li>Download brand assets (coming soon)</li>
          <li>Create your first piece of content!</li>
        </ul>

        <p>Questions? Reply to this email or contact support@pdflab.pro</p>

        <p>Let's grow together! 🚀</p>
        <p>Best regards,<br/>The PDFLab Team</p>
      `
        }).catch(err => logger_1.default.error('Email error:', { error: err instanceof Error ? err.message : String(err) }));
        res.json({
            message: 'Application approved successfully',
            partner: {
                id: partner.id,
                slug,
                referral_code: referralCode,
                dashboard_url: `https://partners.pdflab.pro/${slug}`
            }
        });
    }
    catch (error) {
        logger_1.default.error('Approve application error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to approve application' });
    }
};
exports.approveApplication = approveApplication;
/**
 * Reject partner application (ADMIN ONLY)
 * POST /api/partner-applications/:id/reject
 */
const rejectApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason, admin_notes } = req.body;
        const adminUser = req.user;
        const application = await PartnerApplication_1.default.findByPk(id);
        if (!application) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        if (application.status !== 'pending' && application.status !== 'flagged') {
            res.status(400).json({ error: 'Application is not in pending state' });
            return;
        }
        // Update application
        application.status = 'rejected';
        application.reviewed_by = adminUser?.id;
        application.reviewed_at = new Date();
        application.rejection_reason = rejection_reason;
        application.admin_notes = admin_notes;
        await application.save();
        // Send rejection email (polite version)
        await email_service_1.default.sendEmail({
            to: application.email,
            subject: 'PDFLab Partner Application - Update',
            html: `
        <p>Hi ${application.full_name},</p>
        <p>Thank you for your interest in the PDFLab Partner Program.</p>
        <p>After careful review, we're unable to approve your application at this time.</p>
        ${rejection_reason ? `<p><strong>Reason:</strong> ${rejection_reason}</p>` : ''}
        <p>We're currently looking for partners with established audiences in specific niches. You're welcome to reapply after 90 days if your situation changes.</p>
        <p>We appreciate your interest in PDFLab!</p>
        <p>Best regards,<br/>The PDFLab Team</p>
      `
        }).catch(err => logger_1.default.error('Email error:', { error: err instanceof Error ? err.message : String(err) }));
        res.json({ message: 'Application rejected' });
    }
    catch (error) {
        logger_1.default.error('Reject application error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to reject application' });
    }
};
exports.rejectApplication = rejectApplication;
/**
 * Flag application for review (ADMIN ONLY)
 * POST /api/partner-applications/:id/flag
 */
const flagApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;
        const application = await PartnerApplication_1.default.findByPk(id);
        if (!application) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }
        application.status = 'flagged';
        application.admin_notes = admin_notes;
        await application.save();
        res.json({ message: 'Application flagged for review' });
    }
    catch (error) {
        logger_1.default.error('Flag application error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Failed to flag application' });
    }
};
exports.flagApplication = flagApplication;
//# sourceMappingURL=partnerApplication.controller.js.map