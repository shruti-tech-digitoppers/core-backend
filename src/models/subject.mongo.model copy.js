import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    language: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Language' },
    l0category: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'L0Category' },
    // l1category: { type: [String]?, required: true },
    icon: { type: String },
    color: { type: String },
    index: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
