import { UpdateEvent, Rollout } from "../../models/mongo.model.js";

export const updatesMetrics = async (req, res) => {
  try {
    const { rolloutId } = req.query;

    if(!rolloutId) {
      return res.status(400).json({ message: "Missing required query params" });
    }

    // fetch bundleId from Rollout collection
    const rollout = await Rollout.findOne({ _id: rolloutId }, { bundleId: 1 }).lean();
    if(!rollout || !rollout.bundleId) {
      return res.status(404).json({ message: "Rollout not found" });
    }

    const match = { bundleId: rollout.bundleId };
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
