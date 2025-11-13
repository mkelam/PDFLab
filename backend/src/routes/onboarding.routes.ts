import express from 'express'
import {
  getOnboardingProgress,
  updateOnboardingProgress,
  completeOnboarding,
  skipOnboarding,
  getOnboardingTemplates,
  convertSampleTemplate,
  getOnboardingAnalytics
} from '../controllers/onboarding.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = express.Router()

// All onboarding routes require authentication
router.use(authMiddleware)

/**
 * @route   GET /api/onboarding/progress
 * @desc    Get user's onboarding progress
 * @access  Private
 */
router.get('/progress', getOnboardingProgress)

/**
 * @route   POST /api/onboarding/update
 * @desc    Update onboarding progress
 * @access  Private
 * @body    { tour_step?, first_conversion?, wizard_step?, template_used? }
 */
router.post('/update', updateOnboardingProgress)

/**
 * @route   POST /api/onboarding/complete
 * @desc    Mark onboarding as completed
 * @access  Private
 */
router.post('/complete', completeOnboarding)

/**
 * @route   POST /api/onboarding/skip
 * @desc    Skip onboarding
 * @access  Private
 */
router.post('/skip', skipOnboarding)

/**
 * @route   GET /api/onboarding/templates
 * @desc    Get all active onboarding templates
 * @access  Private
 */
router.get('/templates', getOnboardingTemplates)

/**
 * @route   POST /api/onboarding/templates/:id/convert
 * @desc    Convert a sample template to specified format
 * @access  Private
 * @body    { output_format: 'pptx' | 'docx' | 'xlsx' | 'png' }
 */
router.post('/templates/:id/convert', convertSampleTemplate)

/**
 * @route   GET /api/onboarding/analytics
 * @desc    Get onboarding analytics (admin only)
 * @access  Private (Admin)
 */
router.get('/analytics', getOnboardingAnalytics)

export default router
