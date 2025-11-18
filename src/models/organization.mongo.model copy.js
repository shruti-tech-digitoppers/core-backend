import mongoose from "mongoose";

export default new mongoose.Schema(
  {
    orgId: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    settings: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
