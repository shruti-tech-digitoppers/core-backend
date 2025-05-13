import { Router } from 'express';
import { funActivateLicense } from '../controllers/license.controller.js';

const router = Router();

router.post('/activate', funActivateLicense);
//router.post('/deactivate', funDeactivateLicense);

export default router;