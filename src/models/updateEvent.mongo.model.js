import mongoose from "mongoose";

export default new mongoose.Schema({
  licenseId: { type: mongoose.Schema.Types.ObjectId, ref: "License", index: true },
  deviceId: { type: String, index: true },
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "UpdateBundle" },
  event: { type: String, enum: [
    "check",
    "available",
    "download_started",
    "download_progress",
    "download_completed",
    "verify_failed",
    "install_started",
    "install_success",
    "install_failed",
    "content_applied",
    "update_done"
  ], index: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });


