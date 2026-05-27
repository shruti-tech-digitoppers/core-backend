import { Device, License, Rollout, UpdateBundle, UpdateEvent } from "../models/mongo.model.js";
import { buildBundleResponse, resolvePendingBundles, verifyDownloadToken } from "../services/updates.service.js";
import { streamLocalFileWithRange, getPresignedGetUrl } from "../services/storage.service.js";
import { arePlatformsCompatible, normalizeClientPlatform } from "../utils/update-platform.utils.js";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const eventTimestamp = (value, fallback) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const appVersionFromPayload = (payload) => {
  if (!payload || (payload.versionName === undefined && payload.versionCode === undefined)) return undefined;
  return {
    versionName: payload.versionName,
    versionCode: payload.versionCode
  };
};

const appVersionFromBundle = (bundle) => {
  const app = bundle?.version?.app;
  if (!app || (app.versionName === undefined && app.versionCode === undefined)) return undefined;
  return {
    versionName: app.versionName,
    versionCode: app.versionCode
  };
};

const buildLastUpdate = (event, bundle, timestamp) => {
  const payload = event.payload || {};
  return {
    bundleId: event.bundleId,
    type: bundle?.type,
    platform: bundle?.platform,
    status: event.event,
    event: event.event,
    updatedAt: timestamp,
    errorCode: payload.errorCode,
    errorMessage: payload.errorMessage
  };
};

export const checkForUpdates = async (req, res) => {
  try {
    const license = req.license; // set by auth middleware
    const { device_id, license_id, platform, app_v, app_b, content_v } = req.query;

    if (!device_id || !license_id || !platform) {
      return res.status(400).json({ message: "Missing required query params" });
    }

    if (String(license.licenseKey) !== String(license_id)) {
      return res.status(403).json({ message: "License mismatch" });
    }
    const normalizedPlatform = normalizeClientPlatform(platform);
    if (!arePlatformsCompatible(license.platform, normalizedPlatform)) {
      return res.status(403).json({ message: "License platform mismatch" });
    }

    // upsert device record
    await Device.findOneAndUpdate(
      { deviceId: device_id, licenseId: license._id },
      {
        deviceId: device_id,
        licenseId: license._id,
        platform: normalizedPlatform,
        lastSeenAt: new Date()
      },
      { upsert: true }
    );

    const bundles = await resolvePendingBundles(license._id, { app_v, app_b, content_v }, normalizedPlatform);
    if (!bundles.length) return res.json({ mandatory: false, bundles: [] });

    // Precedence: if any applicable bundle is mandatory, overall mandatory
    const mandatory = bundles.some(b => b._mandatory);
    const bundleResponses = await Promise.all(bundles.map(b => buildBundleResponse(b, license._id, device_id)));
    return res.json({ mandatory, bundles: bundleResponses });
  } catch (e) {
    return res.status(500).json({ message: "Failed to check updates", error: e.message });
  }
};

export const ingestEvents = async (req, res) => {
  try {
    const license = req.license;
    const deviceId = req.headers["x-device-id"];
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) return res.status(400).json({ message: "No events" });

    const normalizedEvents = events.map(e => ({ ...e, event: typeof e?.event === "string" ? e.event.trim() : e?.event }));
    if (normalizedEvents.some(e => !isNonEmptyString(e.event))) {
      return res.status(400).json({ message: "Invalid event name" });
    }

    const bundleIds = [...new Set(normalizedEvents.map(e => e.bundleId).filter(Boolean).map(String))];
    const bundles = bundleIds.length
      ? await UpdateBundle.find({ _id: { $in: bundleIds } }).lean()
      : [];
    const bundlesById = new Map(bundles.map(bundle => [String(bundle._id), bundle]));
    const now = new Date();
    const docs = normalizedEvents.map(e => ({
      licenseId: license._id,
      deviceId,
      bundleId: e.bundleId,
      event: e.event,
      payload: e.payload,
      createdAt: eventTimestamp(e.createdAt, now)
    }));
    await UpdateEvent.insertMany(docs, { ordered: false });

    const stateEvents = [...normalizedEvents].sort((a, b) => (
      eventTimestamp(a.createdAt, now).getTime() - eventTimestamp(b.createdAt, now).getTime()
    ));

    for (const e of stateEvents) {
      const bundle = e.bundleId ? bundlesById.get(String(e.bundleId)) : undefined;
      const timestamp = eventTimestamp(e.createdAt, now);
      const $set = {
        lastUpdate: buildLastUpdate(e, bundle, timestamp)
      };

      if (e.event === "install_success") {
        const appVersion = appVersionFromPayload(e.payload) || appVersionFromBundle(bundle);
        if (appVersion) {
          $set.currentApp = appVersion;
        }
      }

      if (e.event === "content_applied" && e.payload?.version) {
        $set.currentContentVersion = e.payload.version;
      }

      // Device is a compact support snapshot; UpdateEvent remains the audit trail.
      await Device.updateOne(
        { deviceId, licenseId: license._id },
        { $set }
      );
    }
    return res.status(202).json({ message: "accepted", count: docs.length });
  } catch (e) {
    return res.status(500).json({ message: "Failed to ingest events", error: e.message });
  }
};

export const proxyDownload = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).end();
    const payload = verifyDownloadToken(token);
    const bundle = await UpdateBundle.findById(req.params.bundleId).lean();
    if (!bundle) return res.status(404).end();
    if (String(payload.bundleId) !== String(bundle._id)) return res.status(403).end();
    const license = await License.findById(payload.licenseId).lean();
    if(!license) return res.status(404).end();
    const licenseKey = license.licenseKey;
    if (req.query.license_id && String(licenseKey) !== String(req.query.license_id)) return res.status(403).end();
    const keyOrPath = bundle.storage?.s3Key || bundle.storage?.filePath;
    const presigned = await getPresignedGetUrl(keyOrPath, 300);
    if (presigned.url) {
      return res.redirect(302, presigned.url);
    }
    return streamLocalFileWithRange(presigned.filePath, req, res);
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
