import { Router } from 'express';
import { getSchools, getSchool, createSchool, deleteSchool, updateSchool } from '../controllers/school.controller.js';

const router = Router();

router.get('/', getSchools);
router.get('/:schoolId', getSchool);
router.post('/create', createSchool);
router.delete('/:schoolId', deleteSchool);
router.put('/:schoolId', updateSchool);

export default router;
