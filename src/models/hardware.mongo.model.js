import mongoose from 'mongoose';

const hardwareSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // e.g. 'IFP_75', 'OPS_I5', 'TABLET'
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    spec: {
      type: String,
      trim: true,
      default: '',
    },
    specs: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    specification: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    desc: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'GENERAL',
    },
    icon: {
      type: String,
      default: '🖥️',
    },
    unit: {
      type: String,
      default: 'Units',
      trim: true,
    },
    solutions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Solution',
      },
    ],
    departmentCode: {
      type: String,
      default: 'OPS',
      index: true,
    },
    index: {
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
        if (!ret.spec && ret.specification) ret.spec = ret.specification;
        if (!ret.specification && ret.spec) ret.specification = ret.spec;
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
        if (!ret.spec && ret.specification) ret.spec = ret.specification;
        if (!ret.specification && ret.spec) ret.specification = ret.spec;
        return ret;
      },
    },
  }
);

hardwareSchema.pre('save', function (next) {
  if (this.label && !this.name) this.name = this.label;
  if (this.name && !this.label) this.label = this.name;
  if (this.desc && !this.description) this.description = this.desc;
  if (this.description && !this.desc) this.desc = this.description;
  if (this.specification && !this.spec) this.spec = this.specification;
  if (this.spec && !this.specification) this.specification = this.spec;
  next();
});

export default hardwareSchema;
