import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { checkForUpdates, ingestEvents, proxyDownload } from "../controllers/updates.controller.js";

const router = Router();

router.get("/api/updates/check", authMiddleware, checkForUpdates);
router.post("/api/updates/events", authMiddleware, ingestEvents);
router.get("/api/updates/download/:bundleId", proxyDownload);

export default router;


