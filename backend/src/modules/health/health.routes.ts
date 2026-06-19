import { Router } from 'express';
import { liveCheck, readyCheck, healthCheck } from './health.controller';

const router = Router();

router.get('/live', liveCheck);
router.get('/ready', readyCheck);
router.get('/health', healthCheck);

export default router;
