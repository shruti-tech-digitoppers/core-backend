import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    language: { type: String, required: true },
    l0category: { type: String, required: true },
    l1category: { type: String, required: true },
    icon: { type: String },
    color: { type: String },
    index: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
