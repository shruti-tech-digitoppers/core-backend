import { Router } from 'express';
import {
  getSolutions,
  getSolutionById,
  createSolution,
  createSolutionInBulk,
  updateSolution,
  deleteSolution,
} from '../controllers/solution.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (internal services & client auth)
router.get('/', authMiddleware, getSolutions);
router.get('/:id', authMiddleware, getSolutionById);

// Mutation routes
router.post('/', authMiddleware, createSolution);
router.post('/bulk', authMiddleware, createSolutionInBulk);
router.put('/:id', authMiddleware, updateSolution);
router.delete('/:id', authMiddleware, deleteSolution);

export default router;

