import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // e.g. 'SMART_SHALA', 'EPATHSHALA_LAB', 'STEM_LAB', 'ROBOTICS'
    },
    label: {
      type: String,
      required: true,
      trim: true, // e.g. 'Smart Shaala', 'STEM Lab'
    },
    name: {
      type: String,
      trim: true,
    },
    desc: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: '🔬',
    },
    index: {
      type: Number,
      default: 0,
    },
    licenseRequired: {
      type: Boolean,
      default: false,
    },
    isLicenseRequired: {
      type: Boolean,
      default: false,
    },
    platform: {
      type: String,
      default: null,
    },
    platforms: {
      type: [String],
      default: [],
    },
    licenseCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        if (!ret.name) ret.name = ret.label;
        if (!ret.label) ret.label = ret.name;
        if (!ret.description) ret.description = ret.desc;
        if (!ret.desc) ret.desc = ret.description;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        if (!ret.name) ret.name = ret.label;
        if (!ret.label) ret.label = ret.name;
        if (!ret.description) ret.description = ret.desc;
        if (!ret.desc) ret.desc = ret.description;
        return ret;
      },
    },
  }
);

// Synchronize name & label, desc & description before save
solutionSchema.pre('save', function (next) {
  if (this.label && !this.name) this.name = this.label;
  if (this.name && !this.label) this.label = this.name;
  if (this.desc && !this.description) this.description = this.desc;
  if (this.description && !this.desc) this.desc = this.description;
  if (this.isLicenseRequired !== undefined && this.licenseRequired === undefined) {
    this.licenseRequired = this.isLicenseRequired;
  }
  if (this.licenseRequired !== undefined && this.isLicenseRequired === undefined) {
    this.isLicenseRequired = this.licenseRequired;
  }
  next();
});

export default solutionSchema;

