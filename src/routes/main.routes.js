import { Router } from 'express';
import licenseRoutes from './license.routes.js';
import reportsRoutes from './reports.routes.js';
import updatesRoutes from './updates.routes.js';
import adminRoutes from './admin.routes.js';
const router = Router();

router.get('/', async (req, res) => {
  // begin logger journey here
  return res.send({ message: 'Welcome to Home Route of DG Backend' });
});

router.use('/api/license', licenseRoutes);
router.use(updatesRoutes);
router.use(adminRoutes);

router.use('/api/reports', reportsRoutes);

export default router;
