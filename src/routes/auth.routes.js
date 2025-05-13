import { Router } from 'express';
import AuthController from '../controllers/auth.controller.js';

const router = Router();

router.get("/activate_license", new AuthController().activateLicense);

export default router;
