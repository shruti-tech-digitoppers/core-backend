import mongoose from "mongoose";

export default new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail: { type: String },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    delta: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


