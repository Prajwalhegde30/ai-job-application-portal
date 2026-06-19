import { Router } from 'express';
import { getMetrics } from './metrics.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN'), getMetrics);

export default router;
