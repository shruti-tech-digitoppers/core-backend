import jwt from "jsonwebtoken";
import crypto from "crypto";
import unzipper from "unzipper";
import { UpdateBundle, Rollout } from "../models/mongo.model.js";
import { getPresignedGetUrl, openStorageReadStream } from "./storage.service.js";

const DOWNLOAD_TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET || "dev-secret";

export const createDownloadToken = (bundleId, licenseId, deviceId, expiresSeconds = 900) => {
  const payload = { bundleId, licenseId, deviceId };
  return jwt.sign(payload, DOWNLOAD_TOKEN_SECRET, { expiresIn: expiresSeconds });
};

export const verifyDownloadToken = (token) => {
  return jwt.verify(token, DOWNLOAD_TOKEN_SECRET);
};

export const resolvePendingBundles = async (licenseId, versions) => {
  const now = new Date();
  const rollouts = await Rollout.find({
    status: "rolling_out",
    targetLicenses: licenseId,
    $and: [
      { $or: [
        { "schedule.startAt": { $exists: false } },
        { "schedule.startAt": { $lte: now } }
      ]},
      { $or: [
        { "schedule.expiresAt": { $exists: false } },
        { "schedule.expiresAt": { $gte: now } }
      ]}
    ]
  }).lean();

  if (!rollouts.length) return [];
  const bundleIds = rollouts.map(r => r.bundleId);
  const bundles = await UpdateBundle.find({ _id: { $in: bundleIds } }).lean();
  const applicable = bundles.filter(b => {
    if (b.type === "app" || b.type === "combined") {
      const targetCode = b.version?.app?.versionCode || 0;
      if (versions.app_b && Number(versions.app_b) >= targetCode) {
        // ignore app part
      } else {
        return true;
      }
    }
    if (b.type === "content" || b.type === "combined") {
      const targetContent = b.version?.content?.version;
      if (versions.content_v && versions.content_v === targetContent) {
        // ignore content part
      } else {
        return true;
      }
    }
    return false;
  });
  
  // Mandatory precedence: if any rollout for a bundle is mandatory, mark overall mandatory
  const bundleIdToMandatory = new Map();
  for (const r of rollouts) {
    const cur = bundleIdToMandatory.get(String(r.bundleId)) || false;
    bundleIdToMandatory.set(String(r.bundleId), cur || !!r.mandatory);
  }
  return applicable.map(b => ({ ...b, _mandatory: bundleIdToMandatory.get(String(b._id)) || false }));
};

export const buildBundleResponse = async (bundle, licenseId, deviceId) => {
  const key = bundle.storage?.s3Key || bundle.storage?.filePath;
  const presigned = await getPresignedGetUrl(key, 900);
  const token = createDownloadToken(String(bundle._id), String(licenseId), deviceId, 900);

  const metadata = {};
  if (bundle.type === "app" || bundle.type === "combined") {
    metadata.versionName = bundle.version?.app?.versionName;
    metadata.versionCode = bundle.version?.app?.versionCode;
    metadata.releaseNotes = bundle.version?.app?.releaseNotes;
  }
  if (bundle.type === "content" || bundle.type === "combined") {
    metadata.version = bundle.version?.content?.version;
    metadata.baseVersion = bundle.version?.content?.baseVersion;
    metadata.fileCount = (bundle.files || []).length;
  }

  return {
    id: String(bundle._id),
    type: bundle.type,
    metadata,
    sizeBytes: bundle.sizeBytes,
    sha256: bundle.sha256,
    downloadUrl: presigned.url || `${process.env.BASE_URL_FORWARDED}/api/updates/download/${bundle._id}?token=${token}`
  };
};

export const parseBundleZip = async (storageOrPath) => {
  // Open outer ZIP stream and get total size
  const { stream, sizeBytes } = await openStorageReadStream(storageOrPath);
  // Tee the stream through a hash while parsing to compute overall sha256 without a second read
  const overallHash = crypto.createHash("sha256");

  let appApkSha = null;
  let appApkSize = 0;
  let appMeta = null;
  let contentManifest = null;
  const computedContentFiles = new Map(); // entryPath -> { sha256, size }

  const readEntryToHash = async (entry) => new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    let total = 0;
    entry.on("data", chunk => { total += chunk.length; hash.update(chunk); });
    entry.on("end", () => resolve({ sha256: hash.digest("hex"), size: total }));
    entry.on("error", reject);
  });

  const readEntryToString = async (entry) => new Promise((resolve, reject) => {
    const chunks = [];
    entry.on("data", c => chunks.push(c));
    entry.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    entry.on("error", reject);
  });

  // Parse the ZIP stream
  await new Promise((resolve, reject) => {
    stream
      .on("data", chunk => overallHash.update(chunk))
      .pipe(unzipper.Parse())
      .on("entry", async (entry) => {
        try {
          const entryPath = entry.path;
          if (entry.type === "Directory") {
            entry.autodrain();
            return;
          }
          if (entryPath === "app/app.apk") {
            const r = await readEntryToHash(entry);
            appApkSha = r.sha256;
            appApkSize = r.size;
            return;
          }
          if (entryPath === "app/metadata.json") {
            const text = await readEntryToString(entry);
            try { appMeta = JSON.parse(text); } catch { appMeta = null; }
            return;
          }
          if (entryPath === "content/manifest.json") {
            const text = await readEntryToString(entry);
            try { contentManifest = JSON.parse(text); } catch { contentManifest = null; }
            return;
          }
          if (entryPath.startsWith("content/files/")) {
            const r = await readEntryToHash(entry);
            computedContentFiles.set(entryPath, { sha256: r.sha256, size: r.size });
            return;
          }
          // Unused file: drain
          entry.autodrain();
        } catch (e) {
          entry.autodrain();
        }
      })
      .on("close", resolve)
      .on("error", reject);
  });

  // Build version info
  const version = {};
  if (appMeta && (appMeta.versionName || appMeta.versionCode || appMeta.releaseNotes)) {
    version.app = {
      versionName: appMeta.versionName,
      versionCode: typeof appMeta.versionCode === "number" ? appMeta.versionCode : Number(appMeta.versionCode) || undefined,
      releaseNotes: appMeta.releaseNotes
    };
  }
  if (contentManifest && (contentManifest.version || contentManifest.baseVersion)) {
    version.content = {
      version: contentManifest.version,
      baseVersion: contentManifest.baseVersion
    };
  }

  // Build files list from computed entries, merging type/encryption from manifest if present
  let files = [];
  const manifestFiles = Array.isArray(contentManifest?.files) ? contentManifest.files : [];
  // Preserve manifest path verbatim when present; else use the actual zip entry path
  const manifestIndex = new Map(manifestFiles.map(f => [f.path, f]));
  // Build a reverse index from entryPath -> manifestPath when both refer to the same file
  const entryToManifestPath = new Map();
  for (const mf of manifestFiles) {
    // Try to match common variants
    const variants = [mf.path];
    if (mf.path && !mf.path.startsWith("content/")) variants.push(`content/${mf.path}`);
    if (mf.path && !mf.path.startsWith("content/files/")) variants.push(`content/files/${mf.path.replace(/^files\//, "")}`);
    for (const v of variants) {
      entryToManifestPath.set(v, mf.path);
    }
  }
  for (const [entryPath, info] of computedContentFiles.entries()) {
    const manifestPath = entryToManifestPath.get(entryPath);
    const mf = manifestPath ? manifestIndex.get(manifestPath) || {} : {};
    const outPath = manifestPath || entryPath;
    // Validate manifest-provided integrity if present; prefer computed values
    if (mf.sha256 && mf.sha256 !== info.sha256) {
      console.warn(`Manifest sha256 mismatch for ${outPath}: manifest=${mf.sha256} computed=${info.sha256}`);
    }
    if (typeof mf.size === "number" && mf.size !== info.size) {
      console.warn(`Manifest size mismatch for ${outPath}: manifest=${mf.size} computed=${info.size}`);
    }
    files.push({
      path: outPath,
      sha256: info.sha256,
      size: info.size,
      type: mf.type,
      encryption: mf.encryption
    });
  }

  // If manifest is absent or marked autoGenerate, we keep files as built. Otherwise, ensure every manifest file is present (even if missing in zip)
  if (manifestFiles.length && !contentManifest?.autoGenerate) {
    for (const mf of manifestFiles) {
      const manifestPath = mf.path || "";
      // Try to find a computed counterpart
      const candidates = [manifestPath, `content/${manifestPath}`, `content/files/${manifestPath.replace(/^files\//, "")}`];
      const found = candidates.find(c => computedContentFiles.has(c));
      if (!found) {
        files.push({
          path: manifestPath,
          sha256: mf.sha256,
          size: mf.size,
          type: mf.type,
          encryption: mf.encryption
        });
      }
    }
  }

  // Override app size/hash with computed values
  if (appApkSha != null && appApkSize > 0) {
    if (!version.app) version.app = {};
    // Attach computed integrity to app version fields for downstream usage
    version.app.sizeBytes = appApkSize;
    version.app.sha256 = appApkSha;
  }

  const sha256 = overallHash.digest("hex");
  return { sizeBytes, sha256, version, files };
};


