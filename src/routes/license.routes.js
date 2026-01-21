import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { funActivateLicense, funGetPassphrase, funGetSecurityParams, getLicenses, validateLicense } from '../controllers/license.controller.js';
const router = Router();

router.post('/activate', funActivateLicense);
router.post('/security-params', funGetSecurityParams);
router.post('/validate', validateLicense);
router.get('/passphrase', authMiddleware, funGetPassphrase);
//router.post('/deactivate', funDeactivateLicense);

router.get('/all/:schoolId', getLicenses);

export default router;