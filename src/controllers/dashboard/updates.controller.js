import path from "path";
import fs from "fs";
import { UpdateBundle, Rollout } from "../../models/mongo.model.js";
import { getPresignedPutUrl, getStorageLocator } from "../../services/storage.service.js";
import { parseBundleZip } from "../../services/updates.service.js";

export const initiateUpload = async (req, res) => {
  try {
    const { type, key } = req.body; // type: app|content|combined, key: storage key (for s3/local)
    if (!type || !["app","content","combined"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }
    const storageKey = key || `bundles/${Date.now()}-${Math.random().toString(36).slice(2)}.zip`;
    const presigned = await getPresignedPutUrl(storageKey, "application/zip", 900);
    const bundle = await UpdateBundle.create({ type, storage: getStorageLocator(storageKey) });
    // For local driver, return a multipart endpoint target path hint
    const localHint = presigned.driver === 'local' ? { multipart: { url: `/api/admin/bundles/${bundle._id}/upload`, field: 'file' } } : {};
    return res.status(201).json({ id: bundle._id, upload: presigned, ...localHint });
  } catch (e) {
    return res.status(500).json({ message: "Failed to initiate upload", error: e.message });
  }
};

export const finalizeBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await UpdateBundle.findById(id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });

    // If already ingested via local upload, avoid re-parsing and just mark finalized
    if (bundle.ingestedAt && bundle.sizeBytes && bundle.sha256 && bundle.version) {
      await UpdateBundle.updateOne({ _id: id }, { $set: { finalizedAt: new Date() } });
      return res.json({ id, sizeBytes: bundle.sizeBytes, sha256: bundle.sha256, version: bundle.version, filesCount: (bundle.files||[]).length });
    }

    const meta = await parseBundleZip(bundle.storage);
    await UpdateBundle.updateOne({ _id: id }, { $set: { sizeBytes: meta.sizeBytes, sha256: meta.sha256, version: meta.version, files: meta.files, finalizedAt: new Date() } });
    return res.json({ id, sizeBytes: meta.sizeBytes, sha256: meta.sha256, version: meta.version, filesCount: meta.files?.length || 0 });
  } catch (e) {
    return res.status(500).json({ message: "Failed to finalize bundle", error: e.message });
  }
};

export const uploadLocalBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await UpdateBundle.findById(id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });
    if (!bundle.storage?.filePath) return res.status(400).json({ message: "Bundle is not configured for local storage" });
    if (!req.file) return res.status(400).json({ message: "File missing" });
    // Move uploaded temp file to target filePath
    fs.renameSync(req.file.path, bundle.storage.filePath);
    const meta = await parseBundleZip(bundle.storage);
    await UpdateBundle.updateOne({ _id: id }, { $set: { sizeBytes: meta.sizeBytes, sha256: meta.sha256, version: meta.version, files: meta.files, ingestedAt: new Date() } });
    return res.status(201).json({ id, sizeBytes: meta.sizeBytes, sha256: meta.sha256, version: meta.version, filesCount: meta.files?.length || 0 });
  } catch (e) {
    return res.status(500).json({ message: "Failed to upload bundle", error: e.message });
  }
};

export const createRollout = async (req, res) => {
  try {
    const { bundleId, targetLicenses, mandatory, schedule } = req.body;
    if (!bundleId || !Array.isArray(targetLicenses) || !targetLicenses.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    const rollout = await Rollout.create({ bundleId, targetLicenses, mandatory: !!mandatory, status: "rolling_out", schedule });
    return res.status(201).json({ id: rollout._id });
  } catch (e) {
    return res.status(500).json({ message: "Failed to create rollout", error: e.message });
  }
};

export const updateRolloutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // pause|resume|withdraw
    const statusMap = { pause: "paused", resume: "rolling_out", withdraw: "withdrawn" };
    const status = statusMap[action];
    if (!status) return res.status(400).json({ message: "Invalid action" });
    await Rollout.updateOne({ _id: id }, { $set: { status } });
    return res.json({ id, status });
  } catch (e) {
    return res.status(500).json({ message: "Failed to update rollout", error: e.message });
  }
};

export const listRollouts = async (_req, res) => {
  try {
    const rollouts = await Rollout.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ rollouts });
  } catch (e) {
    return res.status(500).json({ message: "Failed to list rollouts", error: e.message });
  }
};
