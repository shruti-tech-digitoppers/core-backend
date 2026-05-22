import mongoose from "mongoose";

export default new mongoose.Schema({
  licenseId: { type: mongoose.Schema.Types.ObjectId, ref: "License", index: true },
  deviceId: { type: String, index: true },
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "UpdateBundle" },
  event: { type: String, required: true, trim: true, maxlength: 100, index: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });


