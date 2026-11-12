import { Router } from 'express';
import { getGradeStreams, getGradeStreamById, createGradeStream, createGradeStreamInBulk } from '../controllers/grade-stream.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (for internal services & client auth)
router.get('/', authMiddleware, getGradeStreams);
router.get('/:id', authMiddleware, getGradeStreamById);

// Mutation routes
router.post('/', createGradeStream);
router.post('/bulk', createGradeStreamInBulk);

export default router;
