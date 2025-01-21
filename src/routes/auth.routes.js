import express from "express";
import AuthController from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/activate_license", new AuthController().activateLicense);

export default router;
