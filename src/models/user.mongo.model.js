import mongoose from "mongoose";

export default new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    // no longer required; acts as optional default/legacy field
  },
  accessibleOrgIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Organization",
    default: [],
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  permissions_extra: {
    type: [String],
    default: [],
  },
  permissions_denied: {
    type: [String],
    default: [],
  },
  projectIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Project",
    default: [],
  },
  schoolIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "School",
    default: [],
  },
}, { timestamps: true });
