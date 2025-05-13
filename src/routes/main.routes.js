import { Router } from 'express';
import authRoutes from './auth.routes.js';
import boardRoutes from './board.routes.js';
import gradeRoutes from './grade.routes.js';
import languageRoutes from './language.routes.js';
import l0categoriesRoutes from './l0categories.routes.js';
import l1categoriesRoutes from './l1categories.routes.js';
import schoolRoutes from './school.routes.js';
import licenseRoutes from './license.routes.js';
const router = Router();

router.get('/', async (req, res) => {
  // begin logger journey here
  return res.send({ message: 'Welcome to Home Route' });
});

router.use('/api/auth', authRoutes);
router.use('/api/boards', boardRoutes);
router.use('/api/grades', gradeRoutes);
router.use('/api/languages', languageRoutes);

router.use('/api/l0categories', l0categoriesRoutes);
router.use('/api/l1categories', l1categoriesRoutes);

router.use('/api/school/', schoolRoutes);
router.use('/api/license/', licenseRoutes);

export default router;
