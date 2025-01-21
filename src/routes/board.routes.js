import express from "express";
import { getBoards, getBoardById, createBoard, createBoardInBulk, updateBoard, deleteBoard } from "../controllers/board.controller.js";
const router = express.Router();

router.get("/", getBoards);
router.get("/:id", getBoardById);
router.post("/", createBoard);
router.post("/bulk", createBoardInBulk);
router.put("/:id", updateBoard);
router.delete("/:id", deleteBoard);

export default router;