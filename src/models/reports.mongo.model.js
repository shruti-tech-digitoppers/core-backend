import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    contentId: { type: String, required: true },
    userId: { type: String, required: true },
    duration: { type: Number, required: true },
    accessedAt: { type: Date, required: true },
    licenseKey: { type: String, required: true },
    schoolId: { type: String, required: true },
    deviceId: { type: String, required: true },
  },
  { timestamps: true }
);
