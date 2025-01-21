import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    licenseKey: { type: String, required: true },
    status: { type: String, required: true },
    isRegistered: { type: Boolean, default: false },
    registeredAt: { type: Date, default: null },
    registeredTo: { type: String, default: null },
    //renewStatus: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  },
  { timestamps: true }
);
