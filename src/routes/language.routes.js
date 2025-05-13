import { Router } from 'express';
import { createLanguageInBulk } from '../controllers/language.controller.js';

const router = Router();

router.post('/bulk', createLanguageInBulk);

export default router;
