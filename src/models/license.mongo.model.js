import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    licenseKey: { type: String, required: true }, // format: lic{partOfSchId}1, lic{partOfSchId}2
    //status: { type: String, required: true, enum: ['active', 'registered', 'renewed', 'expired'] },
    isRegistered: { type: Boolean, default: false },
    registeredAt: { type: Date, default: null },
    reusedAt: { type: Date, default: null },
    registeredTo: { type: String, default: null }, // device identifier
    //renewStatus: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    //expiresAt: { type: Date, required: true },
    licenseDays: { type: Number, required: true, min: 1, max: 10000 },
    isFreeze: { type: Boolean, default: false },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    platform: { type: String, required: true, enum: ['tablet', 'windows', 'linux', 'ifp'] },
    apiKey: { type: String, required: true },
    securityParams: {
      iv: { type: String },
      encrypted: { type: String },
      authTag: { type: String }
    }
  },
  { timestamps: true }
);
