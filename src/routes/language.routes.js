import { Router } from 'express';
import { getLanguages, getLanguageById, createLanguage, createLanguageInBulk } from '../controllers/language.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (for internal services & client auth)
router.get('/', authMiddleware, getLanguages);
router.get('/:id', authMiddleware, getLanguageById);

// Mutation routes
router.post('/', createLanguage);
router.post('/bulk', createLanguageInBulk);

export default router;
