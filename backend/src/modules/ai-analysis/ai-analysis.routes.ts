import { Router } from 'express';
import { analyzeResume, getAnalysis } from './ai-analysis.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Enforce auth and user role restrictions on all AI analysis endpoints
router.use(authenticate);
router.use(requireRole('USER'));

/**
 * POST /api/v1/ai-analysis/:resumeId/analyze
 * Forces re-analysis of a resume.
 */
router.post('/:resumeId/analyze', analyzeResume);

/**
 * GET /api/v1/ai-analysis/:resumeId
 * Fetches analysis, or runs it automatically if missing.
 */
router.get('/:resumeId', getAnalysis);

export const aiAnalysisRoutes = router;
