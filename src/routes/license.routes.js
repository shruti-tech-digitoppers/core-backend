import { Router } from 'express';
import { funActivateLicense, funGetSecurityParams, getLicenses, validateLicense } from '../controllers/license.controller.js';
const router = Router();

router.post('/activate', funActivateLicense);
router.post('/security-params', funGetSecurityParams);
router.post('/validate', validateLicense);
//router.post('/deactivate', funDeactivateLicense);

router.get('/all/:schoolId', getLicenses);

export default router;