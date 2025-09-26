import { UpdateEvent } from "../../models/mongo.model.js";

export const updatesMetrics = async (req, res) => {
  try {
    const { licenseId } = req.query;
    const match = licenseId ? { licenseId } : {};
    const pipeline = [
      { $match: match },
      { $group: {
        _id: { licenseId: "$licenseId", bundleId: "$bundleId", event: "$event" },
        count: { $sum: 1 }
      }},
      { $group: {
        _id: { licenseId: "$_id.licenseId", bundleId: "$_id.bundleId" },
        events: { $push: { k: "$_id.event", v: "$count" } }
      }},
      { $project: {
        _id: 0,
        licenseId: "$_id.licenseId",
        bundleId: "$_id.bundleId",
        metrics: { $arrayToObject: "$events" }
      }}
    ];
    const data = await UpdateEvent.aggregate(pipeline);
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch metrics", error: e.message });
  }
};
