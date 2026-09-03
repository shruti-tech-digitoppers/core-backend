import { Router } from 'express';
import { getSchools, getSchool, createSchool, deleteSchool, updateSchool } from '../controllers/school.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, getSchools);
router.get('/:schoolId', authMiddleware, getSchool);
router.post('/create', authMiddleware, createSchool);
router.delete('/:schoolId', authMiddleware, deleteSchool);
router.put('/:schoolId', authMiddleware, updateSchool);

export default router;
