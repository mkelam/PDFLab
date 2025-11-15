"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const partnerApplication_controller_1 = require("../controllers/partnerApplication.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = express_1.default.Router();
// Public routes
router.post('/submit', partnerApplication_controller_1.submitApplication);
// Admin routes (protected)
router.get('/', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partnerApplication_controller_1.getApplications);
router.get('/:id', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partnerApplication_controller_1.getApplication);
router.post('/:id/approve', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partnerApplication_controller_1.approveApplication);
router.post('/:id/reject', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partnerApplication_controller_1.rejectApplication);
router.post('/:id/flag', auth_middleware_1.requireAuth, admin_middleware_1.requireAdmin, partnerApplication_controller_1.flagApplication);
exports.default = router;
//# sourceMappingURL=partnerApplication.routes.js.map