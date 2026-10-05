import { Router } from 'express';
import { getSubjects, getSubject, createSubject, createSubjectsInBulk } from '../controllers/subject.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (for internal services & client auth)
router.get('/', authMiddleware, getSubjects);
router.get('/:id', authMiddleware, getSubject);

// Mutation routes
router.post('/', createSubject);
router.post('/bulk', createSubjectsInBulk);

export default router;
