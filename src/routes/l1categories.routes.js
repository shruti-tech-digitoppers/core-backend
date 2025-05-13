import { Router } from 'express';
import { getL1Categories, createL1Categories, createL1CategoriesInBulk } from '../controllers/l1categories.controller.js';

const router = Router();

router.get('/', getL1Categories);
router.post('/', createL1Categories);
router.post('/bulk', createL1CategoriesInBulk);

export default router;
