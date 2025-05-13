import { Router } from 'express';
import { storeBatchReports } from '../controllers/reports.controller';

const router = Router();

router.post('/', storeBatchReports);

export default router;