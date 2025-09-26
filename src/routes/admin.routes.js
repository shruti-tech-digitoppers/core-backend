import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { initiateUpload, finalizeBundle, createRollout, updateRolloutStatus, listRollouts, uploadLocalBundle } from "../controllers/dashboard/updates.controller.js";
import { getLocalBundlesDir } from "../services/storage.service.js";
import { updatesMetrics } from "../controllers/dashboard/metrics.controller.js";

const router = Router();

// TODO: add admin auth middleware when available
router.post("/api/admin/bundles", initiateUpload);
router.post("/api/admin/bundles/:id/finalize", finalizeBundle);
// Local multipart upload support
const bundlesDir = path.join(process.cwd(), getLocalBundlesDir(), "bundles");
fs.mkdirSync(bundlesDir, { recursive: true });
const maxUploadMb = Number(process.env.BUNDLE_UPLOAD_MAX_MB || 2048); // default 2GB
const upload = multer({ dest: bundlesDir, limits: { fileSize: maxUploadMb * 1024 * 1024 } });
router.post("/api/admin/bundles/:id/upload", upload.single('file'), uploadLocalBundle);
router.post("/api/admin/rollouts", createRollout);
router.put("/api/admin/rollouts/:id", updateRolloutStatus);
router.get("/api/admin/rollouts", listRollouts);
router.get("/api/admin/metrics/updates", updatesMetrics);

export default router;
