import { Router } from 'express';
import licenseRoutes from './license.routes.js';
import reportsRoutes from './reports.routes.js';
import updatesRoutes from './updates.routes.js';
import adminRoutes from './admin.routes.js';
import appUsersRoutes from './app-users.routes.js';
import projectRoutes from './project.routes.js';
import schoolRoutes from './school.routes.js';
import boardRoutes from './board.routes.js';
import gradeRoutes from './grade.routes.js';
import gradeStreamRoutes from './grade-stream.routes.js';
import l0categoriesRoutes from './l0categories.routes.js';
import languageRoutes from './language.routes.js';
import subjectRoutes from './subject.routes.js';
const router = Router();

router.get('/', async (req, res) => {
  // begin logger journey here
  return res.send({ message: 'Welcome to Home Route of DG Backend' });
});

router.use('/api/license', licenseRoutes);
router.use(updatesRoutes);
router.use(adminRoutes);

router.use('/api/projects', projectRoutes);
router.use('/api/schools', schoolRoutes);
router.use('/api/reports', reportsRoutes);
router.use('/api/app-users', appUsersRoutes);

// Master Data routes (GET routes protected by authMiddleware for internal services & LMS)
router.use('/api/boards', boardRoutes);
router.use('/api/grades', gradeRoutes);
router.use('/api/grade-streams', gradeStreamRoutes);
router.use('/api/l0categories', l0categoriesRoutes);
router.use('/api/languages', languageRoutes);
router.use('/api/subjects', subjectRoutes);

// return 200 with Date header
router.head('/api/health', (req, res) => {
  res.setHeader('Date', new Date().toISOString());
  return res.status(200).send({ message: 'OK' });
});

export default router;
