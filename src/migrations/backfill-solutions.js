import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { License, School } from "../models/mongo.model.js";
import { defaultSolutionForPlatform } from "../constants/platforms.constants.js";

const missingSolution = { $or: [{ solution: { $exists: false } }, { solution: null }] };

/**
 * Sets License.solution and School.platforms[].solution where the platform maps to exactly one
 * solution (ifp -> smartshala, tablet/android_laptop -> epathshala_lab). Windows/Linux are left
 * null on purpose: they can be OPS (SmartShala) or Lab desktops and must be assigned manually.
 * Reruns are safe: only documents with a missing solution are touched, so manual choices survive.
 */
export const backfillSolutions = async ({
  dryRun = false,
  logger = console,
  models = {}
} = {}) => {
  const LicenseModel = models.License || License;
  const SchoolModel = models.School || School;

  const stats = { dryRun, licenses: {}, schools: { scanned: 0, matchedCount: 0, modifiedCount: 0 } };

  for (const platform of ["ifp", "tablet", "android_laptop"]) {
    const solution = defaultSolutionForPlatform(platform);
    const filter = { platform, ...missingSolution };
    if (dryRun) {
      stats.licenses[platform] = { solution, matchedCount: await LicenseModel.countDocuments(filter), modifiedCount: 0 };
    } else {
      const res = await LicenseModel.updateMany(filter, { $set: { solution } });
      stats.licenses[platform] = { solution, matchedCount: res.matchedCount ?? 0, modifiedCount: res.modifiedCount ?? 0 };
    }
  }

  const schools = await SchoolModel.find({ "platforms.0": { $exists: true } })
    .select("_id platforms")
    .lean();
  stats.schools.scanned = schools.length;

  const schoolUpdates = schools.flatMap((school) => {
    const $set = {};
    (school.platforms || []).forEach((entry, idx) => {
      if (entry.solution) return;
      const solution = defaultSolutionForPlatform(entry.platform);
      if (solution) $set[`platforms.${idx}.solution`] = solution;
    });
    if (!Object.keys($set).length) return [];
    return [{ updateOne: { filter: { _id: school._id }, update: { $set } } }];
  });

  stats.schools.matchedCount = schoolUpdates.length;
  if (schoolUpdates.length && !dryRun) {
    const res = await SchoolModel.bulkWrite(schoolUpdates, { ordered: false });
    stats.schools.modifiedCount = res.modifiedCount ?? res.nModified ?? 0;
  }

  logger.log(JSON.stringify(stats, null, 2));
  return stats;
};

export const runBackfillSolutions = async ({ dryRun = process.argv.includes("--dry-run") } = {}) => {
  dotenv.config();
  const uri = process.env.NODE_ENV === "production" ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
  if (!uri) {
    throw new Error("Missing MongoDB URI for solution backfill");
  }

  // await mongoose.connect(uri);
  await mongoose.connect(uri, { autoIndex: false });
  try {
    return await backfillSolutions({ dryRun });
  } finally {
    await mongoose.disconnect();
  }
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runBackfillSolutions().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
