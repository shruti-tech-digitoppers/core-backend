import { Device, License, Rollout, UpdateBundle, UpdateEvent } from "../models/mongo.model.js";
import { buildBundleResponse, resolvePendingBundles, verifyDownloadToken } from "../services/updates.service.js";
import { streamLocalFileWithRange, getPresignedGetUrl } from "../services/storage.service.js";

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

    // upsert device record
    await Device.findOneAndUpdate(
      { deviceId: device_id, licenseId: license._id },
      {
        deviceId: device_id,
        licenseId: license._id,
        platform,
        lastSeenAt: new Date()
      },
      { upsert: true }
    );

    const bundles = await resolvePendingBundles(license._id, { app_v, app_b, content_v });
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
    const deviceId = req.headers['x-device-id'];
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) return res.status(400).json({ message: "No events" });
    const docs = events.map(e => ({
      licenseId: license._id,
      deviceId,
      bundleId: e.bundleId,
      event: e.event,
      payload: e.payload,
      createdAt: e.createdAt ? new Date(e.createdAt) : new Date()
    }));
    await UpdateEvent.insertMany(docs, { ordered: false });
    // Update device state for key events
    for (const e of events) {
      if (e.event === 'install_success' && (e.payload?.versionCode || e.payload?.versionName)) {
        await Device.updateOne(
          { deviceId, licenseId: license._id },
          { $set: { currentApp: { versionName: e.payload?.versionName, versionCode: e.payload?.versionCode } } }
        );
      }
      if (e.event === 'content_applied' && e.payload?.version) {
        await Device.updateOne(
          { deviceId, licenseId: license._id },
          { $set: { currentContentVersion: e.payload.version } }
        );
      }
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
    if (String(licenseKey) !== String(req.query.license_id || '')) return res.status(403).end();
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
