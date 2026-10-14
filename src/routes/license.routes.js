import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { funActivateLicense, funGetPassphrase, funGetSecurityParams, getLicenses, validateLicense, funMigrateDeviceId, funRefreshLicense } from '../controllers/license.controller.js';
const router = Router();

router.post('/activate', funActivateLicense);
router.post('/security-params', funGetSecurityParams);
router.post('/validate', validateLicense);
router.get('/passphrase', authMiddleware, funGetPassphrase);
//router.post('/deactivate', funDeactivateLicense);

router.post('/migrate-device-id', authMiddleware, funMigrateDeviceId);
// App reset. Clears isRegistered only when the license's school, project, or org is demo or testing.
router.post('/:licenseId/refresh', funRefreshLicense);

router.get('/all/:schoolId', getLicenses);

export default router;