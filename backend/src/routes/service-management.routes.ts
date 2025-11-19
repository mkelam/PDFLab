import express from 'express';
import serviceManagementController from '../controllers/service-management.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(isAdmin);

// Service management
router.get('/services/status', serviceManagementController.getServicesStatus);
router.post('/services/restart', serviceManagementController.restartService);

// Cache management
router.post('/cache/clear', serviceManagementController.clearRedisCache);

// Disk management
router.post('/disk/cleanup', serviceManagementController.runDiskCleanup);

// Database management
router.post('/database/optimize', serviceManagementController.optimizeDatabase);
router.get('/database/connections', serviceManagementController.getDatabaseConnections);

export default router;
