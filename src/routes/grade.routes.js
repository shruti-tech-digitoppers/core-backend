import { Router } from 'express';
import { getGrades, getGradeById, createGrade, createGradeInBulk, updateGrade, deleteGrade } from '../controllers/grade.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (for internal services & client auth)
router.get('/', authMiddleware, getGrades);
router.get('/:id', authMiddleware, getGradeById);

// Mutation routes
router.post('/', createGrade);
router.post('/bulk', createGradeInBulk);
router.put('/:id', updateGrade);
router.delete('/:id', deleteGrade);

export default router;
