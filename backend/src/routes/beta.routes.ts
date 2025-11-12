import { Router } from 'express';
import {
  submitBetaApplication,
  getAllBetaApplications,
  approveBetaApplication,
  rejectBetaApplication,
  getBetaApplicationStatus,
} from '../controllers/beta.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// Public Routes
router.post('/apply', submitBetaApplication);
router.get('/status/:email', getBetaApplicationStatus);

// Admin Routes
router.get('/applications', authMiddleware, requireAdmin, getAllBetaApplications);
router.post('/applications/:id/approve', authMiddleware, requireAdmin, approveBetaApplication);
router.post('/applications/:id/reject', authMiddleware, requireAdmin, rejectBetaApplication);

export default router;
