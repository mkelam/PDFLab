"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const beta_controller_1 = require("../controllers/beta.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = (0, express_1.Router)();
// Public Routes
router.post('/apply', beta_controller_1.submitBetaApplication);
router.get('/status/:email', beta_controller_1.getBetaApplicationStatus);
// Admin Routes
router.get('/applications', auth_middleware_1.authMiddleware, admin_middleware_1.requireAdmin, beta_controller_1.getAllBetaApplications);
router.post('/applications/:id/approve', auth_middleware_1.authMiddleware, admin_middleware_1.requireAdmin, beta_controller_1.approveBetaApplication);
router.post('/applications/:id/reject', auth_middleware_1.authMiddleware, admin_middleware_1.requireAdmin, beta_controller_1.rejectBetaApplication);
exports.default = router;
//# sourceMappingURL=beta.routes.js.map