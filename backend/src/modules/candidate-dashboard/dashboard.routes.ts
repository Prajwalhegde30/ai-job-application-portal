import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  getSummary,
  getApplicationStatus,
  getRecentApplications,
  getRecentNotifications,
  getResumeSummary,
} from './dashboard.controller';

const router = Router();

// All candidate dashboard endpoints require authenticated USER role
router.use(authenticate);
router.use(requireRole('USER'));

// Dashboard API endpoints
router.get('/summary', getSummary);
router.get('/application-status', getApplicationStatus);
router.get('/recent-applications', getRecentApplications);
router.get('/recent-notifications', getRecentNotifications);
router.get('/resume-summary', getResumeSummary);

export { router as candidateDashboardRoutes };
