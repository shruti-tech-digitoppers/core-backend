import express from "express";
import authRoutes from "./auth.routes.js";
import boardRoutes from "./board.routes.js";
import gradeRoutes from "./grade.routes.js";
import languageRoutes from "./language.routes.js";
const router = express.Router();

router.get('/', async (req, res) => {
    // begin logger journey here
    return res.send({ message: 'Welcome to Home Route' });
});

router.use("/api/auth", authRoutes);
router.use("/api/boards", boardRoutes);
router.use("/api/grades", gradeRoutes);
router.use("/api/languages", languageRoutes);

export default router;
