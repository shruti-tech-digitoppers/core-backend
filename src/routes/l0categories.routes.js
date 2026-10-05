import { Router } from 'express';
import { getL0Categories, getL0CategoryById, createL0Categories, createL0CategoriesInBulk } from '../controllers/l0categories.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (for internal services & client auth)
router.get('/', authMiddleware, getL0Categories);
router.get('/:id', authMiddleware, getL0CategoryById);

// Mutation routes
router.post('/', createL0Categories);
router.post('/bulk', createL0CategoriesInBulk);

export default router;
