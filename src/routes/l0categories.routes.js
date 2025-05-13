import { Router } from 'express';
import { getL0Categories, createL0Categories, createL0CategoriesInBulk } from '../controllers/l0categories.controller.js';

const router = Router();

router.get('/', getL0Categories);
router.post('/', createL0Categories);
router.post('/bulk', createL0CategoriesInBulk);

export default router;
