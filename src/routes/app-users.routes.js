import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { storeBulkAppUsers } from '../controllers/app-user.controller.js';

const router = Router();

router.post('/bulk', authMiddleware, storeBulkAppUsers);

export default router;

