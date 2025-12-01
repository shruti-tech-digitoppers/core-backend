
import { AppUser } from "../models/mongo.model.js";

export const storeBulkAppUsers = async (req, res) => {
  try {
    const license = req.license;
    const profiles = req.body;

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        message: "Body must be a non-empty array of user profiles",
      });
    }

    const operations = [];

    for (const profile of profiles) {
      const mapped = mapProfileToAppUser(profile);

      mapped.projectId = license.projectId;
      mapped.schoolId = license.schoolId;

      // minimal required fields to store
      if (
        !mapped.name ||
        !mapped.type ||
        !['student', 'teacher'].includes(mapped.type) ||
        !mapped.gradeId ||
        !mapped.boardId ||
        !mapped.languageId ||
        !mapped.roll_number
      ) {
        return res.status(400).json({
          message: "Missing required fields in profile",
          profile,
        });
      }

      const filter = buildFilter(mapped);

      const update = {
        $set: mapped,
      };

      // only set createdAt on insert; timestamps will handle the rest
      if (profile.createdAt) {
        update.$setOnInsert = { createdAt: new Date(profile.createdAt) };
      }

      operations.push({
        updateOne: {
          filter,
          update,
          upsert: true,
        },
      });
    }

    if (operations.length === 0) {
      return res.status(400).json({ message: "No valid profiles to process" });
    }

    const result = await AppUser.bulkWrite(operations, { ordered: false });

    return res.status(200).json({
      message: "App users synced successfully",
      data: {
        matched: result.matchedCount ?? result.nMatched,
        modified: result.modifiedCount ?? result.nModified,
        upserted: result.upsertedCount ?? result.nUpserted,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Unexpected error", error: err.message });
  }
};

function mapProfileToAppUser(p) {
  return {
    name: p?.name,
    type: p?.userType,
    roll_number: p?.rollNumber,
    phone_number: p?.mobileNumber,
    gradeId: p?.classId,
    boardId: p?.boardId,
    languageId: p?.languageId,
    // address/city/state/zip_code/email/password are not provided by app profile, so omitted
  };
}

function buildFilter(mapped) {
  const filter = {
    type: mapped.type,
    roll_number: mapped.roll_number,
    gradeId: mapped.gradeId,
  };
  if (mapped.boardId) filter.boardId = mapped.boardId;
  if (mapped.languageId) filter.languageId = mapped.languageId;
  return filter;
}

