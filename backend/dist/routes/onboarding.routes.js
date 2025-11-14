"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const onboarding_controller_1 = require("../controllers/onboarding.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// All onboarding routes require authentication
router.use(auth_middleware_1.authMiddleware);
/**
 * @route   GET /api/onboarding/progress
 * @desc    Get user's onboarding progress
 * @access  Private
 */
router.get('/progress', onboarding_controller_1.getOnboardingProgress);
/**
 * @route   POST /api/onboarding/update
 * @desc    Update onboarding progress
 * @access  Private
 * @body    { tour_step?, first_conversion?, wizard_step?, template_used? }
 */
router.post('/update', onboarding_controller_1.updateOnboardingProgress);
/**
 * @route   POST /api/onboarding/complete
 * @desc    Mark onboarding as completed
 * @access  Private
 */
router.post('/complete', onboarding_controller_1.completeOnboarding);
/**
 * @route   POST /api/onboarding/skip
 * @desc    Skip onboarding
 * @access  Private
 */
router.post('/skip', onboarding_controller_1.skipOnboarding);
/**
 * @route   GET /api/onboarding/templates
 * @desc    Get all active onboarding templates
 * @access  Private
 */
router.get('/templates', onboarding_controller_1.getOnboardingTemplates);
/**
 * @route   POST /api/onboarding/templates/:id/convert
 * @desc    Convert a sample template to specified format
 * @access  Private
 * @body    { output_format: 'pptx' | 'docx' | 'xlsx' | 'png' }
 */
router.post('/templates/:id/convert', onboarding_controller_1.convertSampleTemplate);
/**
 * @route   GET /api/onboarding/analytics
 * @desc    Get onboarding analytics (admin only)
 * @access  Private (Admin)
 */
router.get('/analytics', onboarding_controller_1.getOnboardingAnalytics);
exports.default = router;
//# sourceMappingURL=onboarding.routes.js.map