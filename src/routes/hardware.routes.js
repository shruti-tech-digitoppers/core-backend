import { Router } from 'express';
import {
  getHardwares,
  getHardwareById,
  createHardware,
  createHardwareInBulk,
  updateHardware,
  deleteHardware,
} from '../controllers/hardware.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (internal services & client auth)
router.get('/', authMiddleware, getHardwares);
router.get('/:id', authMiddleware, getHardwareById);

// Mutation routes
router.post('/', authMiddleware, createHardware);
router.post('/bulk', authMiddleware, createHardwareInBulk);
router.put('/:id', authMiddleware, updateHardware);
router.delete('/:id', authMiddleware, deleteHardware);

export default router;
