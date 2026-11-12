import { Router } from 'express';
import {
  getProjects,
  getProject,
  getProjectSchools,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/project.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Project Routes (Protected by authMiddleware supporting internal service signatures & dev bypass)
router.get('/', authMiddleware, getProjects);
router.get('/:id', authMiddleware, getProject);
router.get('/:id/schools', authMiddleware, getProjectSchools);
router.post('/create', authMiddleware, createProject);
router.put('/:id', authMiddleware, updateProject);
router.delete('/:id', authMiddleware, deleteProject);

export default router;
