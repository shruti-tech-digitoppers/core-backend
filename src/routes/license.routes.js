import { Router } from 'express';
import { funActivateLicense, funGetSecurityParams } from '../controllers/license.controller.js';

const router = Router();

router.post('/activate', funActivateLicense);
router.post('/security-params', funGetSecurityParams);
//router.post('/deactivate', funDeactivateLicense);

export default router;