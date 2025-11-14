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
exports.getOnboardingAnalytics = exports.convertSampleTemplate = exports.getOnboardingTemplates = exports.skipOnboarding = exports.completeOnboarding = exports.updateOnboardingProgress = exports.getOnboardingProgress = void 0;
const uuid_1 = require("uuid");
const OnboardingProgress_1 = __importStar(require("../models/OnboardingProgress"));
const OnboardingTemplate_1 = __importDefault(require("../models/OnboardingTemplate"));
const User_1 = require("../models/User");
const ConversionJob_1 = require("../models/ConversionJob");
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
/**
 * Get user's onboarding progress
 * GET /api/onboarding/progress
 */
const getOnboardingProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Find or create onboarding progress for user
        let progress = await OnboardingProgress_1.default.findOne({
            where: { user_id: userId }
        });
        // Create if doesn't exist
        if (!progress) {
            progress = await OnboardingProgress_1.default.create({
                user_id: userId,
                status: OnboardingProgress_1.OnboardingStatus.NOT_STARTED
            });
        }
        // Calculate completion percentage
        const completionPercentage = progress.getCompletionPercentage();
        res.json({
            progress: {
                id: progress.id,
                user_id: progress.user_id,
                status: progress.status,
                // Tour
                tour_completed: progress.tour_completed,
                tour_step_completed: progress.tour_step_completed,
                tour_last_seen_at: progress.tour_last_seen_at,
                // Conversion
                first_conversion_completed: progress.first_conversion_completed,
                first_conversion_at: progress.first_conversion_at,
                // Wizard
                wizard_started: progress.wizard_started,
                wizard_completed: progress.wizard_completed,
                wizard_last_step: progress.wizard_last_step,
                // Template
                sample_template_used: progress.sample_template_used,
                // Completion
                completion_percentage: completionPercentage,
                started_at: progress.started_at,
                completed_at: progress.completed_at,
                skipped_at: progress.skipped_at,
                created_at: progress.created_at,
                updated_at: progress.updated_at
            }
        });
    }
    catch (error) {
        console.error('Error fetching onboarding progress:', error);
        res.status(500).json({ error: 'Failed to fetch onboarding progress' });
    }
};
exports.getOnboardingProgress = getOnboardingProgress;
/**
 * Update onboarding progress
 * POST /api/onboarding/update
 * Body: { tour_step?, first_conversion?, wizard_step?, template_used? }
 */
const updateOnboardingProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { tour_step, tour_completed, first_conversion, wizard_started, wizard_step, wizard_completed, template_used } = req.body;
        // Find or create progress
        let progress = await OnboardingProgress_1.default.findOne({
            where: { user_id: userId }
        });
        if (!progress) {
            progress = await OnboardingProgress_1.default.create({
                user_id: userId,
                status: OnboardingProgress_1.OnboardingStatus.IN_PROGRESS,
                started_at: new Date()
            });
        }
        // Update status to in_progress if not started
        if (progress.status === OnboardingProgress_1.OnboardingStatus.NOT_STARTED) {
            progress.status = OnboardingProgress_1.OnboardingStatus.IN_PROGRESS;
            progress.started_at = new Date();
        }
        // Update tour progress
        if (tour_step !== undefined) {
            progress.tour_step_completed = Math.max(progress.tour_step_completed, tour_step);
            progress.tour_last_seen_at = new Date();
        }
        if (tour_completed === true) {
            progress.tour_completed = true;
        }
        // Update conversion progress
        if (first_conversion === true && !progress.first_conversion_completed) {
            progress.first_conversion_completed = true;
            progress.first_conversion_at = new Date();
        }
        // Update wizard progress
        if (wizard_started === true) {
            progress.wizard_started = true;
        }
        if (wizard_step !== undefined) {
            progress.wizard_last_step = Math.max(progress.wizard_last_step, wizard_step);
        }
        if (wizard_completed === true) {
            progress.wizard_completed = true;
        }
        // Update template usage
        if (template_used) {
            progress.sample_template_used = template_used;
        }
        await progress.save();
        // Check if onboarding is complete (all 4 milestones)
        const completionPercentage = progress.getCompletionPercentage();
        if (completionPercentage === 100 && progress.status !== OnboardingProgress_1.OnboardingStatus.COMPLETED) {
            progress.status = OnboardingProgress_1.OnboardingStatus.COMPLETED;
            progress.completed_at = new Date();
            await progress.save();
            // Update users table
            await User_1.User.update({
                onboarding_completed: true,
                onboarding_completed_at: new Date()
            }, { where: { id: userId } });
        }
        res.json({
            message: 'Onboarding progress updated',
            progress: {
                completion_percentage: completionPercentage,
                status: progress.status,
                tour_completed: progress.tour_completed,
                first_conversion_completed: progress.first_conversion_completed,
                wizard_completed: progress.wizard_completed,
                sample_template_used: progress.sample_template_used
            }
        });
    }
    catch (error) {
        console.error('Error updating onboarding progress:', error);
        res.status(500).json({ error: 'Failed to update onboarding progress' });
    }
};
exports.updateOnboardingProgress = updateOnboardingProgress;
/**
 * Mark onboarding as completed
 * POST /api/onboarding/complete
 */
const completeOnboarding = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Find or create progress
        let progress = await OnboardingProgress_1.default.findOne({
            where: { user_id: userId }
        });
        if (!progress) {
            progress = await OnboardingProgress_1.default.create({
                user_id: userId,
                status: OnboardingProgress_1.OnboardingStatus.COMPLETED,
                completed_at: new Date()
            });
        }
        else {
            progress.status = OnboardingProgress_1.OnboardingStatus.COMPLETED;
            progress.completed_at = new Date();
            await progress.save();
        }
        // Update users table
        await User_1.User.update({
            onboarding_completed: true,
            onboarding_completed_at: new Date()
        }, { where: { id: userId } });
        res.json({
            message: 'Onboarding completed',
            progress: {
                status: progress.status,
                completed_at: progress.completed_at
            }
        });
    }
    catch (error) {
        console.error('Error completing onboarding:', error);
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
};
exports.completeOnboarding = completeOnboarding;
/**
 * Skip onboarding
 * POST /api/onboarding/skip
 */
const skipOnboarding = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Find or create progress
        let progress = await OnboardingProgress_1.default.findOne({
            where: { user_id: userId }
        });
        if (!progress) {
            progress = await OnboardingProgress_1.default.create({
                user_id: userId,
                status: OnboardingProgress_1.OnboardingStatus.SKIPPED,
                skipped_at: new Date()
            });
        }
        else {
            progress.status = OnboardingProgress_1.OnboardingStatus.SKIPPED;
            progress.skipped_at = new Date();
            await progress.save();
        }
        // Update users table
        await User_1.User.update({
            onboarding_skipped: true
        }, { where: { id: userId } });
        res.json({
            message: 'Onboarding skipped',
            progress: {
                status: progress.status,
                skipped_at: progress.skipped_at
            }
        });
    }
    catch (error) {
        console.error('Error skipping onboarding:', error);
        res.status(500).json({ error: 'Failed to skip onboarding' });
    }
};
exports.skipOnboarding = skipOnboarding;
/**
 * Get all active onboarding templates
 * GET /api/onboarding/templates
 */
const getOnboardingTemplates = async (req, res) => {
    try {
        const templates = await OnboardingTemplate_1.default.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
        });
        const templatesWithDetails = templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            file_size: template.file_size,
            formatted_file_size: template.getFormattedFileSize(),
            recommended_format: template.recommended_format,
            category: template.category,
            category_display: template.getCategoryDisplayName(),
            preview_image: template.preview_image,
            usage_count: template.usage_count
        }));
        res.json({
            templates: templatesWithDetails
        });
    }
    catch (error) {
        console.error('Error fetching onboarding templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};
exports.getOnboardingTemplates = getOnboardingTemplates;
/**
 * Convert a sample template to specified format
 * POST /api/onboarding/templates/:id/convert
 * Body: { output_format: 'pptx' | 'docx' | 'xlsx' | 'png' }
 */
const convertSampleTemplate = async (req, res) => {
    try {
        const userId = req.user?.id;
        const templateId = req.params.id;
        const { output_format } = req.body;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Validate output format
        const validFormats = [
            ConversionJob_1.ConversionType.PDF_TO_PPTX,
            ConversionJob_1.ConversionType.PDF_TO_DOCX,
            ConversionJob_1.ConversionType.PDF_TO_XLSX,
            ConversionJob_1.ConversionType.PDF_TO_PNG
        ];
        const conversionType = `pdf_to_${output_format}`;
        if (!validFormats.includes(conversionType)) {
            res.status(400).json({ error: 'Invalid output format' });
            return;
        }
        // Find template
        const template = await OnboardingTemplate_1.default.findByPk(templateId);
        if (!template || !template.is_active) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        // Get user
        const user = await User_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Check conversion quota
        if (user.conversions_used >= user.conversions_limit) {
            res.status(403).json({
                error: 'Conversion quota exceeded',
                conversions_used: user.conversions_used,
                conversions_limit: user.conversions_limit
            });
            return;
        }
        // Check file size against plan limit
        const planLimits = {
            free: 10 * 1024 * 1024, // 10MB
            starter: 25 * 1024 * 1024, // 25MB
            pro: 100 * 1024 * 1024, // 100MB
            enterprise: 500 * 1024 * 1024 // 500MB
        };
        const maxFileSize = planLimits[user.plan] || planLimits.free;
        if (template.file_size > maxFileSize) {
            res.status(403).json({
                error: 'File size exceeds plan limit',
                file_size: template.file_size,
                plan_limit: maxFileSize,
                plan: user.plan
            });
            return;
        }
        // Resolve template file path
        // template.file_path is like "/templates/sample_invoice.pdf"
        // Resolve to actual path: "storage/templates/sample_invoice.pdf"
        const actualFilePath = path_1.default.join('storage', template.file_path);
        // Create conversion job
        const jobId = (0, uuid_1.v4)();
        const job = await ConversionJob_1.ConversionJob.create({
            id: jobId,
            user_id: userId,
            type: conversionType,
            status: ConversionJob_1.JobStatus.PENDING,
            progress: 0,
            file_name: `${template.name}.pdf`,
            file_size: template.file_size,
            input_file: actualFilePath
        });
        // Increment template usage count
        await template.incrementUsage();
        // Update onboarding progress - mark template used
        let progress = await OnboardingProgress_1.default.findOne({
            where: { user_id: userId }
        });
        if (!progress) {
            progress = await OnboardingProgress_1.default.create({
                user_id: userId,
                status: OnboardingProgress_1.OnboardingStatus.IN_PROGRESS,
                started_at: new Date(),
                sample_template_used: template.category
            });
        }
        else if (!progress.sample_template_used) {
            progress.sample_template_used = template.category;
            await progress.save();
        }
        // Increment user's conversion count
        user.conversions_used += 1;
        await user.save();
        res.status(201).json({
            message: 'Sample template conversion started',
            job: {
                id: job.id,
                type: job.type,
                status: job.status,
                progress: job.progress,
                file_name: job.file_name,
                template_name: template.name
            }
        });
    }
    catch (error) {
        console.error('Error converting sample template:', error);
        res.status(500).json({ error: 'Failed to start conversion' });
    }
};
exports.convertSampleTemplate = convertSampleTemplate;
/**
 * Get onboarding analytics (admin only)
 * GET /api/onboarding/analytics
 */
const getOnboardingAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Check if user is admin
        const user = await User_1.User.findByPk(userId);
        if (!user || user.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        // Get counts by status
        const totalUsers = await OnboardingProgress_1.default.count();
        const notStarted = await OnboardingProgress_1.default.count({
            where: { status: OnboardingProgress_1.OnboardingStatus.NOT_STARTED }
        });
        const inProgress = await OnboardingProgress_1.default.count({
            where: { status: OnboardingProgress_1.OnboardingStatus.IN_PROGRESS }
        });
        const completed = await OnboardingProgress_1.default.count({
            where: { status: OnboardingProgress_1.OnboardingStatus.COMPLETED }
        });
        const skipped = await OnboardingProgress_1.default.count({
            where: { status: OnboardingProgress_1.OnboardingStatus.SKIPPED }
        });
        // Get milestone completion rates
        const tourCompleted = await OnboardingProgress_1.default.count({
            where: { tour_completed: true }
        });
        const firstConversion = await OnboardingProgress_1.default.count({
            where: { first_conversion_completed: true }
        });
        const wizardCompleted = await OnboardingProgress_1.default.count({
            where: { wizard_completed: true }
        });
        const templateUsed = await OnboardingProgress_1.default.count({
            where: { sample_template_used: { [sequelize_1.Op.not]: null } }
        });
        // Get average completion percentage
        const allProgress = await OnboardingProgress_1.default.findAll();
        const avgCompletion = allProgress.length > 0
            ? allProgress.reduce((sum, p) => sum + p.getCompletionPercentage(), 0) / allProgress.length
            : 0;
        // Get template usage stats
        const templates = await OnboardingTemplate_1.default.findAll({
            order: [['usage_count', 'DESC']]
        });
        res.json({
            analytics: {
                total_users: totalUsers,
                status_breakdown: {
                    not_started: notStarted,
                    in_progress: inProgress,
                    completed: completed,
                    skipped: skipped
                },
                completion_rates: {
                    tour_completed: totalUsers > 0 ? (tourCompleted / totalUsers) * 100 : 0,
                    first_conversion: totalUsers > 0 ? (firstConversion / totalUsers) * 100 : 0,
                    wizard_completed: totalUsers > 0 ? (wizardCompleted / totalUsers) * 100 : 0,
                    template_used: totalUsers > 0 ? (templateUsed / totalUsers) * 100 : 0,
                    average_completion: avgCompletion
                },
                templates: templates.map((t) => ({
                    name: t.name,
                    category: t.category,
                    usage_count: t.usage_count
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching onboarding analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};
exports.getOnboardingAnalytics = getOnboardingAnalytics;
//# sourceMappingURL=onboarding.controller.js.map