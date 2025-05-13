import { Router } from 'express';
import { createSchool } from '../controllers/school.controller.js';

const router = Router();

router.post('/', createSchool);

export default router;
