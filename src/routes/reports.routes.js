import { Router } from 'express';
import { storeBatchReports } from '../controllers/reports.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateReports } from '../middleware/reports.middleware.js';

const router = Router();

router.post('/bulk', authMiddleware, validateReports, storeBatchReports);
router.post('/batch', authMiddleware, storeBatchReports);

export default router;