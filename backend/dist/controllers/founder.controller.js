"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpotsRemaining = exports.getFounderStats = exports.checkAndExpireFounders = exports.incrementConversionCount = exports.submitFeedback = exports.getProgress = void 0;
const models_1 = require("../models");
const User_1 = require("../models/User");
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("../config/logger"));
// Constants
const FOUNDER_EDITION_CAP = 100;
const FOUNDER_CONVERSIONS_REQUIRED = 10;
/**
 * Get founder challenge progress for authenticated user
 */
const getProgress = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check if user is enrolled in Founder's Edition
        if (user.founder_status === User_1.FounderStatus.NONE) {
            res.status(400).json({
                error: 'Not enrolled',
                message: 'You are not enrolled in the Founder\'s Edition program'
            });
            return;
        }
        const progress = user.getFounderProgress();
        res.status(200).json({
            founder_status: user.founder_status,
            progress: {
                conversions: progress.conversions,
                conversions_required: progress.conversionsRequired,
                conversions_remaining: Math.max(0, progress.conversionsRequired - progress.conversions),
                feedback_submitted: progress.feedbackSubmitted,
                days_remaining: progress.daysRemaining,
                deadline: user.founder_deadline,
                is_complete: progress.isComplete,
                percentage: Math.min(100, Math.round((progress.conversions / progress.conversionsRequired) * 100))
            },
            message: getProgressMessage(user.founder_status, progress)
        });
    }
    catch (error) {
        logger_1.default.error('Get founder progress error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to get progress',
            message: 'An error occurred while fetching your founder challenge progress'
        });
    }
};
exports.getProgress = getProgress;
/**
 * Submit founder feedback form
 */
const submitFeedback = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Check if user is enrolled in Founder's Edition
        if (user.founder_status !== User_1.FounderStatus.ACTIVE) {
            res.status(400).json({
                error: 'Cannot submit feedback',
                message: user.founder_status === User_1.FounderStatus.NONE
                    ? 'You are not enrolled in the Founder\'s Edition program'
                    : user.founder_status === User_1.FounderStatus.EARNED
                        ? 'You have already earned your lifetime license!'
                        : 'Your Founder\'s Edition challenge has expired'
            });
            return;
        }
        const { use_case, friction_points, would_pay } = req.body;
        // Validate feedback (minimum 50 chars per field as per GTM strategy)
        if (!use_case || use_case.length < 50) {
            res.status(400).json({
                error: 'Invalid feedback',
                message: 'Please describe your use case in at least 50 characters'
            });
            return;
        }
        if (!friction_points || friction_points.length < 50) {
            res.status(400).json({
                error: 'Invalid feedback',
                message: 'Please describe friction points in at least 50 characters'
            });
            return;
        }
        if (would_pay === undefined || would_pay === null) {
            res.status(400).json({
                error: 'Invalid feedback',
                message: 'Please indicate whether you would pay for Pro access'
            });
            return;
        }
        // Store feedback (you might want to create a separate FounderFeedback model for this)
        // For now, we'll log it and mark as submitted
        logger_1.default.info('[Founder] Feedback submitted', {
            user_id: user.id,
            email: user.email,
            use_case: use_case.substring(0, 100), // Log first 100 chars
            friction_points: friction_points.substring(0, 100),
            would_pay
        });
        // Mark feedback as submitted
        user.founder_feedback_submitted = true;
        await user.save();
        // Check if challenge is now complete
        const isNowComplete = user.hasCompletedFounderChallenge();
        if (isNowComplete) {
            user.founder_status = User_1.FounderStatus.EARNED;
            await user.save();
            logger_1.default.info(`[Founder] User ${user.email} has EARNED lifetime Pro access!`);
            res.status(200).json({
                success: true,
                message: 'Congratulations! You have earned lifetime Pro access!',
                founder_status: User_1.FounderStatus.EARNED,
                lifetime_access: true
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Feedback submitted successfully. Keep converting to complete the challenge!',
            founder_status: user.founder_status,
            progress: user.getFounderProgress()
        });
    }
    catch (error) {
        logger_1.default.error('Submit founder feedback error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to submit feedback',
            message: 'An error occurred while submitting your feedback'
        });
    }
};
exports.submitFeedback = submitFeedback;
/**
 * Increment founder conversion count (called internally after successful conversion)
 */
const incrementConversionCount = async (userId) => {
    try {
        const user = await models_1.User.findByPk(userId);
        if (!user || user.founder_status !== User_1.FounderStatus.ACTIVE) {
            return { earned: false, count: 0 };
        }
        user.founder_conversions_count += 1;
        await user.save();
        logger_1.default.info(`[Founder] User ${user.email} conversion count: ${user.founder_conversions_count}/${FOUNDER_CONVERSIONS_REQUIRED}`);
        // Check if challenge is now complete
        if (user.hasCompletedFounderChallenge()) {
            user.founder_status = User_1.FounderStatus.EARNED;
            await user.save();
            logger_1.default.info(`[Founder] User ${user.email} has EARNED lifetime Pro access!`);
            return { earned: true, count: user.founder_conversions_count };
        }
        return { earned: false, count: user.founder_conversions_count };
    }
    catch (error) {
        logger_1.default.error('Increment founder conversion error:', { error: error instanceof Error ? error.message : String(error) });
        return { earned: false, count: 0 };
    }
};
exports.incrementConversionCount = incrementConversionCount;
/**
 * Check and expire founders whose deadline has passed (cron job)
 */
const checkAndExpireFounders = async (_req, res) => {
    try {
        const now = new Date();
        // Find all active founders whose deadline has passed
        const expiredFounders = await models_1.User.findAll({
            where: {
                founder_status: User_1.FounderStatus.ACTIVE,
                founder_deadline: {
                    [sequelize_1.Op.lt]: now
                }
            }
        });
        let expiredCount = 0;
        for (const user of expiredFounders) {
            // Check if they completed the challenge
            if (user.hasCompletedFounderChallenge()) {
                user.founder_status = User_1.FounderStatus.EARNED;
                logger_1.default.info(`[Founder] Late completion: User ${user.email} earned lifetime access`);
            }
            else {
                // Downgrade to free
                user.founder_status = User_1.FounderStatus.EXPIRED;
                user.plan = models_1.UserPlan.FREE;
                user.conversions_limit = parseInt(process.env['CONVERSIONS_LIMIT_FREE'] || '3');
                expiredCount++;
                logger_1.default.info(`[Founder] Expired: User ${user.email} downgraded to free (${user.founder_conversions_count} conversions, feedback: ${user.founder_feedback_submitted})`);
            }
            await user.save();
        }
        const message = `Founder expiry check complete. ${expiredCount} users expired, ${expiredFounders.length - expiredCount} earned.`;
        logger_1.default.info(`[Founder] ${message}`);
        if (res) {
            res.status(200).json({
                success: true,
                message,
                expired_count: expiredCount,
                earned_count: expiredFounders.length - expiredCount
            });
        }
    }
    catch (error) {
        logger_1.default.error('Check founder expiry error:', { error: error instanceof Error ? error.message : String(error) });
        if (res) {
            res.status(500).json({
                error: 'Expiry check failed',
                message: 'An error occurred while checking founder expiry'
            });
        }
    }
};
exports.checkAndExpireFounders = checkAndExpireFounders;
/**
 * Get founder edition stats (admin only)
 */
const getFounderStats = async (req, res) => {
    try {
        const activeCount = await models_1.User.count({ where: { founder_status: User_1.FounderStatus.ACTIVE } });
        const earnedCount = await models_1.User.count({ where: { founder_status: User_1.FounderStatus.EARNED } });
        const expiredCount = await models_1.User.count({ where: { founder_status: User_1.FounderStatus.EXPIRED } });
        const spotsRemaining = FOUNDER_EDITION_CAP - activeCount - earnedCount;
        res.status(200).json({
            total_cap: FOUNDER_EDITION_CAP,
            spots_remaining: Math.max(0, spotsRemaining),
            spots_taken: activeCount + earnedCount,
            breakdown: {
                active: activeCount,
                earned: earnedCount,
                expired: expiredCount
            },
            is_sold_out: spotsRemaining <= 0
        });
    }
    catch (error) {
        logger_1.default.error('Get founder stats error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to get stats',
            message: 'An error occurred while fetching founder stats'
        });
    }
};
exports.getFounderStats = getFounderStats;
/**
 * Get remaining founder spots (public endpoint for landing page counter)
 */
const getSpotsRemaining = async (_req, res) => {
    try {
        const takenCount = await models_1.User.count({
            where: {
                founder_status: [User_1.FounderStatus.ACTIVE, User_1.FounderStatus.EARNED]
            }
        });
        const spotsRemaining = Math.max(0, FOUNDER_EDITION_CAP - takenCount);
        res.status(200).json({
            spots_remaining: spotsRemaining,
            total_spots: FOUNDER_EDITION_CAP,
            is_available: spotsRemaining > 0
        });
    }
    catch (error) {
        logger_1.default.error('Get spots remaining error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to get spots',
            message: 'An error occurred while fetching available spots'
        });
    }
};
exports.getSpotsRemaining = getSpotsRemaining;
// Helper function to generate progress message
function getProgressMessage(status, progress) {
    if (status === User_1.FounderStatus.EARNED) {
        return 'Congratulations! You have earned lifetime Pro access!';
    }
    if (status === User_1.FounderStatus.EXPIRED) {
        return 'Your Founder\'s Edition challenge has expired. You have been downgraded to the free tier.';
    }
    if (progress.isComplete) {
        return 'Challenge complete! Your lifetime access is being activated...';
    }
    const parts = [];
    if (progress.conversions < progress.conversionsRequired) {
        const remaining = progress.conversionsRequired - progress.conversions;
        parts.push(`Convert ${remaining} more file${remaining > 1 ? 's' : ''}`);
    }
    if (!progress.feedbackSubmitted) {
        parts.push('submit your feedback form');
    }
    if (parts.length === 0) {
        return 'Almost there! Complete your remaining tasks to earn lifetime access.';
    }
    return `${parts.join(' and ')} within ${progress.daysRemaining} day${progress.daysRemaining !== 1 ? 's' : ''} to earn lifetime Pro access.`;
}
//# sourceMappingURL=founder.controller.js.map