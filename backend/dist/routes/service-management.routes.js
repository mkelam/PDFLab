"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_management_controller_1 = __importDefault(require("../controllers/service-management.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_middleware_1.authMiddleware);
router.use(admin_middleware_1.isAdmin);
// Service management
router.get('/services/status', service_management_controller_1.default.getServicesStatus);
router.post('/services/restart', service_management_controller_1.default.restartService);
// Cache management
router.post('/cache/clear', service_management_controller_1.default.clearRedisCache);
// Disk management
router.post('/disk/cleanup', service_management_controller_1.default.runDiskCleanup);
// Database management
router.post('/database/optimize', service_management_controller_1.default.optimizeDatabase);
router.get('/database/connections', service_management_controller_1.default.getDatabaseConnections);
exports.default = router;
//# sourceMappingURL=service-management.routes.js.map