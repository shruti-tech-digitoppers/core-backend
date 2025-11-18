import mongoose from 'mongoose';

const DistributionOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    passphrase: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default DistributionOptionSchema;
