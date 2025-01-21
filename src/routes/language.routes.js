import express from "express";
import { createLanguageInBulk } from "../controllers/language.controller.js";

const router = express.Router();

router.post("/bulk", createLanguageInBulk);

export default router;