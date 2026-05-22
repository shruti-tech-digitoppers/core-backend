import mongoose from "mongoose";

export default new mongoose.Schema({
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "UpdateBundle", required: true },
  platform: { type: String, enum: ["android", "windows", "linux", "all"], required: true, default: "android", index: true },
  targetLicenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "License", index: true }],
  mandatory: { type: Boolean, default: false },
  status: { type: String, enum: ["draft", "rolling_out", "paused", "completed", "withdrawn"], default: "draft", index: true },
  schedule: {
    startAt: { type: Date },
    expiresAt: { type: Date }
  }
}, { timestamps: true });


