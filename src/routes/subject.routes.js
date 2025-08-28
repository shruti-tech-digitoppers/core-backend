import { Router } from 'express';
import { getSubjects, createSubject, createSubjectsInBulk } from '../controllers/subject.controller.js';

const router = Router();

router.get('/', getSubjects);
router.post('/', createSubject);
router.post('/bulk', createSubjectsInBulk);

export default router;


