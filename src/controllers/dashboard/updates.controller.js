import fs from "fs";
import { UpdateBundle, Rollout } from "../../models/mongo.model.js";
import { getPresignedPutUrl, getStorageLocator } from "../../services/storage.service.js";
import { parseBundleZip } from "../../services/updates.service.js";
import { normalizeRolloutPlatform, validateBundlePlatformForType } from "../../utils/update-platform.utils.js";

const buildBundlePayload = ({ id, platform, meta, files }) => ({
  id,
  platform,
  sizeBytes: meta.sizeBytes,
  sha256: meta.sha256,
  version: meta.version,
  filesCount: files?.length || 0
});

const isBundleClientError = (error) => {
  const message = error?.message || "";
  return message === "Invalid bundle platform"
    || message === "Invalid bundle type"
    || message.includes("Bundle platform")
    || message.includes("metadata")
    || message.includes("installer");
};

export const initiateUpload = async (req, res) => {
  try {
    const { type, platform, key } = req.body; // type: app|content|combined, key: storage key (for s3/local)
    if (!type || !["app", "content", "combined"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }
    const normalizedPlatform = validateBundlePlatformForType(type, platform);
    const storageKey = key || `bundles/${Date.now()}-${Math.random().toString(36).slice(2)}.zip`;
    const presigned = await getPresignedPutUrl(storageKey, "application/zip", 900);
    const bundle = await UpdateBundle.create({ type, platform: normalizedPlatform, storage: getStorageLocator(storageKey) });
    // For local driver, return a multipart endpoint target path hint
    const localHint = presigned.driver === 'local' ? { multipart: { url: `/api/admin/bundles/${bundle._id}/upload`, field: 'file' } } : {};
    return res.status(201).json({ id: bundle._id, platform: normalizedPlatform, upload: presigned, ...localHint });
  } catch (e) {
    if (isBundleClientError(e)) {
      return res.status(400).json({ message: e.message });
    }
    return res.status(500).json({ message: "Failed to initiate upload", error: e.message });
  }
};

export const finalizeBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await UpdateBundle.findById(id);
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });

    // If already ingested via local upload, avoid re-parsing and just mark finalized
    const platform = validateBundlePlatformForType(bundle.type, bundle.platform);
    if (bundle.ingestedAt && bundle.sizeBytes && bundle.sha256 && bundle.version) {
      await UpdateBundle.updateOne({ _id: id }, { $set: { platform, finalizedAt: new Date() } });
      return res.json(buildBundlePayload({
        id,
        platform,
        meta: bundle,
        files: bundle.files || []
      }));
    }

    const meta = await parseBundleZip(bundle.storage, { type: bundle.type, platform });
    await UpdateBundle.updateOne({ _id: id }, { $set: { platform, sizeBytes: meta.sizeBytes, sha256: meta.sha256, version: meta.version, files: meta.files, finalizedAt: new Date() } });
    return res.json(buildBundlePayload({ id, platform, meta, files: meta.files }));
  } catch (e) {
    if (isBundleClientError(e)) {
      return res.status(400).json({ message: e.message });
    }
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
    const platform = validateBundlePlatformForType(bundle.type, bundle.platform);
    // Move uploaded temp file to target filePath
    fs.renameSync(req.file.path, bundle.storage.filePath);
    const meta = await parseBundleZip(bundle.storage, { type: bundle.type, platform });
    await UpdateBundle.updateOne({ _id: id }, { $set: { platform, sizeBytes: meta.sizeBytes, sha256: meta.sha256, version: meta.version, files: meta.files, ingestedAt: new Date() } });
    return res.status(201).json(buildBundlePayload({ id, platform, meta, files: meta.files }));
  } catch (e) {
    if (isBundleClientError(e)) {
      return res.status(400).json({ message: e.message });
    }
    return res.status(500).json({ message: "Failed to upload bundle", error: e.message });
  }
};

export const createRollout = async (req, res) => {
  try {
    const { bundleId, targetLicenses, mandatory, schedule } = req.body;
    if (!bundleId || !Array.isArray(targetLicenses) || !targetLicenses.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    const bundle = await UpdateBundle.findById(bundleId).select("platform").lean();
    if (!bundle) return res.status(404).json({ message: "Bundle not found" });

    const platform = normalizeRolloutPlatform(undefined, bundle.platform);
    if (!platform) return res.status(400).json({ message: "Invalid bundle platform" });

    const rollout = await Rollout.create({ bundleId, platform, targetLicenses, mandatory: !!mandatory, status: "rolling_out", schedule });
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

export const getRolloutById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = { _id: id };

    // Keep org scoping if your backend uses orgId on rollouts.
    if (req.user?.orgId) {
      query.orgId = req.user.orgId;
    }

    const rollout = await Rollout.findOne(query)
      .populate({
        path: "bundleId",
        select: "type platform version finalizedAt ingestedAt notes",
      })
      .populate({
        path: "targetLicenses",
        select: "licenseKey platform isRegistered registeredTo registeredAt",
      })
      .lean();

    if (!rollout) {
      return res.status(404).json({ message: "Rollout not found" });
    }

    return res.json({ rollout });
  } catch (e) {
    return res.status(500).json({
      message: "Failed to fetch rollout",
      error: e.message,
    });
  }
};

// export const listRollouts = async (_req, res) => {
//   try {
//     const rollouts = await Rollout.find({}).sort({ createdAt: -1 }).lean();
//     return res.json({ rollouts });
//   } catch (e) {
//     return res.status(500).json({ message: "Failed to list rollouts", error: e.message });
//   }
// };

export const listRollouts = async (_req, res) => {
  try {
    const rollouts = await Rollout.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "bundleId",
        select: "type platform version notes finalizedAt ingestedAt sizeBytes sha256",
      })
      .populate({
        path: "targetLicenses",
        select: "licenseKey platform isRegistered registeredAt registeredTo",
      })
      .lean();

    const normalized = (rollouts || []).map((r) => ({
      ...r,
      targetLicensesCount: Array.isArray(r.targetLicenses) ? r.targetLicenses.length : 0,
    }));

    return res.json({ rollouts: normalized });
  } catch (e) {
    return res.status(500).json({ message: "Failed to list rollouts", error: e.message });
  }
};
