import jwt from "jsonwebtoken";
import crypto from "crypto";
import unzipper from "unzipper";
import { UpdateBundle, Rollout } from "../models/mongo.model.js";
import { getPresignedGetUrl, openStorageReadStream } from "./storage.service.js";
import {
  normalizeBundlePlatform,
  normalizeClientPlatform,
  normalizeRolloutPlatform,
  validateBundlePlatformForType
} from "../utils/update-platform.utils.js";

const DOWNLOAD_TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET || "dev-secret";
const WINDOWS_INSTALLER_PATHS = ["app/windows/installer.exe", "app/installer.exe"];

export const createDownloadToken = (bundleId, licenseId, deviceId, expiresSeconds = 900) => {
  const payload = { bundleId, licenseId, deviceId };
  return jwt.sign(payload, DOWNLOAD_TOKEN_SECRET, { expiresIn: expiresSeconds });
};

export const verifyDownloadToken = (token) => {
  return jwt.verify(token, DOWNLOAD_TOKEN_SECRET);
};

const hasAppPayload = (type) => !type || type === "app" || type === "combined";
const hasContentPayload = (type) => !type || type === "content" || type === "combined";

const isBundleCompatibleWithClient = (bundle, clientPlatform) => {
  const bundlePlatform = normalizeBundlePlatform(bundle.platform);
  if (!bundlePlatform || !clientPlatform) return false;
  if (bundle.type === "content" && bundlePlatform === "all") return true;
  return bundlePlatform === clientPlatform;
};

const isRolloutCompatibleWithClient = (rollout, bundle, clientPlatform) => {
  const rolloutPlatform = normalizeRolloutPlatform(rollout.platform, bundle.platform);
  if (!rolloutPlatform || !clientPlatform) return false;
  if (bundle.type === "content" && rolloutPlatform === "all") return true;
  return rolloutPlatform === clientPlatform;
};

const appVersionCode = (bundle) => Number(bundle.version?.app?.versionCode || 0);

const hasAppUpdate = (bundle, versions) => {
  if (!hasAppPayload(bundle.type)) return false;
  const targetCode = appVersionCode(bundle);
  const currentCode = Number(versions.app_b);
  return targetCode > 0 && (!Number.isFinite(currentCode) || currentCode < targetCode);
};

const hasContentUpdate = (bundle, versions) => {
  if (!hasContentPayload(bundle.type)) return false;
  const targetContent = bundle.version?.content?.version;
  return !!targetContent && versions.content_v !== targetContent;
};

export const resolvePendingBundles = async (licenseId, versions = {}, platform) => {
  const clientPlatform = normalizeClientPlatform(platform);
  if (!clientPlatform) return [];
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
  const bundlesById = new Map(bundles.map(bundle => [String(bundle._id), bundle]));
  const compatibleRollouts = rollouts.filter((rollout) => {
    const bundle = bundlesById.get(String(rollout.bundleId));
    return bundle
      && isBundleCompatibleWithClient(bundle, clientPlatform)
      && isRolloutCompatibleWithClient(rollout, bundle, clientPlatform);
  });
  const compatibleBundleIds = new Set(compatibleRollouts.map(rollout => String(rollout.bundleId)));
  const compatibleBundles = bundles.filter(bundle => compatibleBundleIds.has(String(bundle._id)));

  const latestAppCode = compatibleBundles.reduce((max, bundle) => (
    hasAppUpdate(bundle, versions) ? Math.max(max, appVersionCode(bundle)) : max
  ), 0);
  const applicable = compatibleBundles.filter((bundle) => {
    if (hasAppPayload(bundle.type)) {
      return latestAppCode > 0 && hasAppUpdate(bundle, versions) && appVersionCode(bundle) === latestAppCode;
    }
    return hasContentUpdate(bundle, versions);
  });

  // Mandatory precedence: if any rollout for a bundle is mandatory, mark overall mandatory
  const bundleIdToMandatory = new Map();
  for (const r of compatibleRollouts) {
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
    const app = bundle.version?.app || {};
    metadata.versionName = app.versionName;
    metadata.versionCode = app.versionCode;
    metadata.releaseNotes = app.releaseNotes;
    metadata.artifactKind = app.artifactKind;
    metadata.artifactPath = app.artifactPath;
    metadata.artifactSHA256 = app.sha256;
    metadata.artifactSizeBytes = app.sizeBytes;
    if (normalizeBundlePlatform(bundle.platform) === "windows") {
      metadata.installerPath = app.installerPath || app.artifactPath;
      metadata.installerSha256 = app.installerSha256 || app.sha256;
      metadata.installerSizeBytes = app.installerSizeBytes || app.sizeBytes;
      metadata.silentArgs = app.silentArgs || [];
      metadata.relaunchArgs = app.relaunchArgs || [];
    } else {
      metadata.apkSHA256 = app.apkSHA256 || app.sha256;
      metadata.apkSizeBytes = app.apkSizeBytes || app.sizeBytes;
    }
  }
  if (bundle.type === "content" || bundle.type === "combined") {
    metadata.version = bundle.version?.content?.version;
    metadata.baseVersion = bundle.version?.content?.baseVersion;
    metadata.fileCount = (bundle.files || []).length;
  }

  return {
    id: String(bundle._id),
    type: bundle.type,
    platform: normalizeBundlePlatform(bundle.platform),
    metadata,
    sizeBytes: bundle.sizeBytes,
    sha256: bundle.sha256,
    downloadUrl: presigned.url || `${process.env.BASE_URL_FORWARDED}/api/updates/download/${bundle._id}?token=${token}`
  };
};

const parseJson = (text, path) => {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON in ${path}`);
  }
};

const normalizeExpectedBundle = (options = {}) => {
  const type = options.type;
  if (!type) {
    return { type: undefined, platform: normalizeBundlePlatform(options.platform) };
  }

  return {
    type,
    platform: validateBundlePlatformForType(type, options.platform)
  };
};

const toPositiveNumber = (value) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

const assertStringArray = (value, fieldName) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(`Windows metadata ${fieldName} must be an array of strings`);
  }
  return value;
};

const buildWindowsAppVersion = (appMeta, installerEntries) => {
  const presentInstallerPaths = WINDOWS_INSTALLER_PATHS.filter(path => installerEntries.has(path));
  if (presentInstallerPaths.length > 1) {
    throw new Error("Windows app bundle must contain only one supported installer path");
  }
  if (!presentInstallerPaths.length) {
    throw new Error("Windows app bundle requires app/windows/installer.exe or app/installer.exe");
  }
  if (!appMeta) {
    throw new Error("Windows app bundle requires app/metadata.json");
  }
  if (appMeta.platform !== "windows") {
    throw new Error('Windows metadata requires platform "windows"');
  }
  if (typeof appMeta.versionName !== "string" || !appMeta.versionName.trim()) {
    throw new Error("Windows metadata requires versionName");
  }

  const versionCode = toPositiveNumber(appMeta.versionCode);
  if (!versionCode) {
    throw new Error("Windows metadata requires a positive numeric versionCode");
  }
  if (typeof appMeta.installerSha256 !== "string" || !appMeta.installerSha256.trim()) {
    throw new Error("Windows metadata requires installerSha256");
  }

  const installerSizeBytes = toPositiveNumber(appMeta.installerSizeBytes);
  if (!installerSizeBytes) {
    throw new Error("Windows metadata requires installerSizeBytes");
  }

  const installerPath = presentInstallerPaths[0];
  const installer = installerEntries.get(installerPath);
  if (appMeta.installerSha256.toLowerCase() !== installer.sha256) {
    throw new Error("installerSha256 does not match computed installer hash");
  }
  if (installerSizeBytes !== installer.size) {
    throw new Error("installerSizeBytes does not match computed installer size");
  }

  return {
    platform: "windows",
    versionName: appMeta.versionName,
    versionCode,
    releaseNotes: appMeta.releaseNotes,
    artifactKind: "windows_installer",
    artifactPath: installerPath,
    sha256: installer.sha256,
    sizeBytes: installer.size,
    installerPath,
    installerSha256: installer.sha256,
    installerSizeBytes: installer.size,
    silentArgs: assertStringArray(appMeta.silentArgs, "silentArgs"),
    relaunchArgs: assertStringArray(appMeta.relaunchArgs, "relaunchArgs")
  };
};

const buildAndroidAppVersion = (appMeta, appApk) => {
  if (!appMeta && !appApk) return undefined;

  const appVersion = {
    platform: "android",
    versionName: appMeta?.versionName,
    versionCode: appMeta?.versionCode !== undefined ? Number(appMeta.versionCode) || undefined : undefined,
    releaseNotes: appMeta?.releaseNotes
  };

  if (appApk) {
    appVersion.artifactKind = "android_apk";
    appVersion.artifactPath = "app/app.apk";
    appVersion.sizeBytes = appApk.size;
    appVersion.sha256 = appApk.sha256;
  }

  return appVersion;
};

export const parseBundleZip = async (storageOrPath, options = {}) => {
  const expected = normalizeExpectedBundle(options);
  // Open outer ZIP stream and get total size
  const { stream, sizeBytes } = await openStorageReadStream(storageOrPath);
  // Tee the stream through a hash while parsing to compute overall sha256 without a second read
  const overallHash = crypto.createHash("sha256");

  let appApk = null;
  const windowsInstallers = new Map();
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
            appApk = await readEntryToHash(entry);
            return;
          }
          if (WINDOWS_INSTALLER_PATHS.includes(entryPath)) {
            windowsInstallers.set(entryPath, await readEntryToHash(entry));
            return;
          }
          if (entryPath === "app/metadata.json") {
            const text = await readEntryToString(entry);
            appMeta = parseJson(text, entryPath);
            return;
          }
          if (entryPath === "content/manifest.json") {
            const text = await readEntryToString(entry);
            contentManifest = parseJson(text, entryPath);
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
          reject(e);
        }
      })
      .on("close", resolve)
      .on("error", reject);
  });

  const version = {};

  if (hasAppPayload(expected.type)) {
    const appPlatform = expected.platform || normalizeBundlePlatform(appMeta?.platform) || (windowsInstallers.size ? "windows" : "android");
    if (appPlatform === "windows") {
      version.app = buildWindowsAppVersion(appMeta, windowsInstallers);
    } else if (appPlatform === "android") {
      version.app = buildAndroidAppVersion(appMeta, appApk);
    } else if (appPlatform) {
      throw new Error(`App bundle platform "${appPlatform}" is not supported by the ZIP parser`);
    }
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

  const sha256 = overallHash.digest("hex");
  return { sizeBytes, sha256, version, files };
};


