import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  getApplicationTrends,
  getHiringFunnel,
  getJobPerformance,
  getRecentApplications,
  getSummary,
  getTopJobs,
} from './analytics.controller';

const router = Router();

router.get('/summary', authenticate, requireRole('ADMIN'), getSummary);
router.get(
  '/application-trends',
  authenticate,
  requireRole('ADMIN'),
  getApplicationTrends
);
router.get(
  '/hiring-funnel',
  authenticate,
  requireRole('ADMIN'),
  getHiringFunnel
);
router.get('/top-jobs', authenticate, requireRole('ADMIN'), getTopJobs);
router.get(
  '/job-performance/:jobId',
  authenticate,
  requireRole('ADMIN'),
  getJobPerformance
);
router.get(
  '/recent-applications',
  authenticate,
  requireRole('ADMIN'),
  getRecentApplications
);

export default router;
