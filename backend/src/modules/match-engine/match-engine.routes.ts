import { Router } from 'express';
import { getMatchAnalysis } from './match-engine.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Protect all match-engine endpoints
router.use(authenticate);

/**
 * GET /api/v1/match-analysis/:applicationId
 * Returns full job description match score comparisons.
 */
router.get('/:applicationId', getMatchAnalysis);

export const matchEngineRoutes = router;
