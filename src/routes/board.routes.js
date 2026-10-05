import { Router } from 'express';
import { getBoards, getBoardById, createBoard, createBoardInBulk, updateBoard, deleteBoard } from '../controllers/board.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET routes protected by authMiddleware (for internal services & client auth)
router.get('/', authMiddleware, getBoards);
router.get('/:id', authMiddleware, getBoardById);

// Mutation routes
router.post('/', createBoard);
router.post('/bulk', createBoardInBulk);
router.put('/:id', updateBoard);
router.delete('/:id', deleteBoard);

export default router;
