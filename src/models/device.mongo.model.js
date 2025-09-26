import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  licenseId: { type: mongoose.Schema.Types.ObjectId, ref: "License", required: true, index: true },
  platform: { type: String, required: true, enum: ["android", "windows", "linux", "ifp", "tablet"] },
  currentApp: {
    versionName: { type: String },
    versionCode: { type: Number }
  },
  currentContentVersion: { type: String },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

deviceSchema.index({ licenseId: 1, deviceId: 1 }, { unique: true });

export default deviceSchema;


