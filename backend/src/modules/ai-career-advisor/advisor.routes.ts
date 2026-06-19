import { Router } from 'express';
import { getCareerAdvice } from './advisor.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Protect all career advisor endpoints
router.use(authenticate);

/**
 * GET /api/v1/career-advice/:applicationId
 * Returns personalized career advice for the given application.
 */
router.get('/:applicationId', getCareerAdvice);

export const careerAdvisorRoutes = router;
