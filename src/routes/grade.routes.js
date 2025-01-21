import { Router } from "express";
import { createGradeInBulk } from "../controllers/grade.controller.js";

const router = Router();

//router.get("/", getGrades);
//router.get("/:id", getGradeById);
//router.post("/", createGrade);
//router.put("/:id", updateGrade);
//router.delete("/:id", deleteGrade);
router.post("/bulk", createGradeInBulk);

export default router;