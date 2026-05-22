import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { Rollout, UpdateBundle } from "../models/mongo.model.js";
import { normalizeBundlePlatform } from "../utils/update-platform.utils.js";

const missingField = (field) => ({
  $or: [
    { [field]: { $exists: false } },
    { [field]: null },
    { [field]: "" }
  ]
});

const normalizeWriteResult = (result = {}) => ({
  matchedCount: result.matchedCount ?? result.nMatched ?? 0,
  modifiedCount: result.modifiedCount ?? result.nModified ?? 0
});

const runUpdateMany = async (model, filter, update, dryRun) => {
  if (dryRun) {
    return {
      matchedCount: await model.countDocuments(filter),
      modifiedCount: 0
    };
  }

  return normalizeWriteResult(await model.updateMany(filter, update));
};

export const ensureUpdatePlatformIndexes = async ({
  UpdateBundleModel = UpdateBundle,
  RolloutModel = Rollout
} = {}) => {
  await Promise.all([
    UpdateBundleModel.collection.createIndex({ platform: 1 }, { name: "platform_1" }),
    RolloutModel.collection.createIndex({ platform: 1 }, { name: "platform_1" }),
    RolloutModel.collection.createIndex(
      { status: 1, platform: 1, targetLicenses: 1 },
      { name: "status_1_platform_1_targetLicenses_1" }
    )
  ]);
};

/**
 * Backfills Phase 7 platform fields without changing rollout status or targets.
 * Reruns are safe because writes only touch missing Android bundle metadata and
 * rollout platform snapshots that differ from their bundle platform.
 */
export const backfillUpdatePlatforms = async ({
  dryRun = false,
  ensureIndexes = true,
  logger = console,
  models = {}
} = {}) => {
  const UpdateBundleModel = models.UpdateBundle || UpdateBundle;
  const RolloutModel = models.Rollout || Rollout;

  const stats = {
    dryRun,
    indexesEnsured: false,
    bundles: {},
    rollouts: {
      scanned: 0,
      matchedCount: 0,
      modifiedCount: 0
    }
  };

  if (ensureIndexes && !dryRun) {
    await ensureUpdatePlatformIndexes({ UpdateBundleModel, RolloutModel });
    stats.indexesEnsured = true;
  }

  stats.bundles.platform = await runUpdateMany(
    UpdateBundleModel,
    missingField("platform"),
    { $set: { platform: "android" } },
    dryRun
  );

  const androidAppBundleFilter = {
    type: { $in: ["app", "combined"] },
    platform: "android",
    $or: [
      { "version.app.sha256": { $exists: true } },
      { "version.app.apkSHA256": { $exists: true } },
      { "version.app.apkSizeBytes": { $exists: true } },
      { "version.app.versionCode": { $exists: true } }
    ]
  };

  stats.bundles.appPlatform = await runUpdateMany(
    UpdateBundleModel,
    { $and: [androidAppBundleFilter, missingField("version.app.platform")] },
    { $set: { "version.app.platform": "android" } },
    dryRun
  );

  stats.bundles.appArtifactKind = await runUpdateMany(
    UpdateBundleModel,
    { $and: [androidAppBundleFilter, missingField("version.app.artifactKind")] },
    { $set: { "version.app.artifactKind": "android_apk" } },
    dryRun
  );

  stats.bundles.appArtifactPath = await runUpdateMany(
    UpdateBundleModel,
    { $and: [androidAppBundleFilter, missingField("version.app.artifactPath")] },
    { $set: { "version.app.artifactPath": "app/app.apk" } },
    dryRun
  );

  const rollouts = await RolloutModel.find({ bundleId: { $exists: true, $ne: null } })
    .select("_id bundleId platform")
    .lean();
  stats.rollouts.scanned = rollouts.length;

  const bundleIds = [...new Set(rollouts.map(rollout => String(rollout.bundleId)))];
  const bundles = bundleIds.length
    ? await UpdateBundleModel.find({ _id: { $in: bundleIds } }).select("_id platform").lean()
    : [];
  const bundlesById = new Map(bundles.map(bundle => [String(bundle._id), bundle]));

  const rolloutPlatformUpdates = rollouts.flatMap((rollout) => {
    const bundle = bundlesById.get(String(rollout.bundleId));
    const bundlePlatform = normalizeBundlePlatform(bundle?.platform);
    if (!bundlePlatform || rollout.platform === bundlePlatform) return [];

    return [{
      updateOne: {
        filter: { _id: rollout._id },
        update: { $set: { platform: bundlePlatform } }
      }
    }];
  });

  stats.rollouts.matchedCount = rolloutPlatformUpdates.length;
  if (rolloutPlatformUpdates.length && !dryRun) {
    const result = normalizeWriteResult(await RolloutModel.bulkWrite(rolloutPlatformUpdates, { ordered: false }));
    stats.rollouts.modifiedCount = result.modifiedCount;
  }

  logger.log(JSON.stringify(stats, null, 2));
  return stats;
};

export const runBackfillUpdatePlatforms = async ({ dryRun = process.argv.includes("--dry-run") } = {}) => {
  dotenv.config();
  const uri = process.env.NODE_ENV === "production" ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
  if (!uri) {
    throw new Error("Missing MongoDB URI for update platform backfill");
  }

  await mongoose.connect(uri);
  try {
    return await backfillUpdatePlatforms({ dryRun });
  } finally {
    await mongoose.disconnect();
  }
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runBackfillUpdatePlatforms().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
