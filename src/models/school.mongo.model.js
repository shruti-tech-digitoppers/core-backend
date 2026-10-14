import mongoose from 'mongoose';
import { LICENSE_PLATFORMS, SOLUTIONS } from '../constants/platforms.constants.js';
import { registerSearchSync } from '../search/search-sync.hooks.js';

const schema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    schoolId: { type: String, required: true },
    schoolIdLower: { type: String, index: true },
    name: { type: String, required: true },
    nameLower: { type: String, index: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    block: { type: String },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    numberOfStudents: { type: Number, default: 0 },
    numberOfTeachers: { type: Number, default: 0 },
    numberOfLicenses: { type: Number, default: 0 },
    platforms: [
      {
        platform: { type: String, enum: LICENSE_PLATFORMS, required: true },
        // Deployment context of this platform's licenses. Mirrored onto each License.solution,
        // which is the source of truth for report filtering. null = not yet assigned.
        solution: { type: String, enum: SOLUTIONS, default: null },
        licenseCount: { type: Number, required: true, min: 1 },
        licenseDays: { type: Number, required: true, min: 1, max: 10000 },
      },
    ],
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator' },
    settings: {
      purpose: { type: String },
    },
  },
  { timestamps: true }
);

function normalize(doc) {
  if (!doc) return;
  if (typeof doc.name === 'string') doc.nameLower = doc.name.toLowerCase();
  if (typeof doc.schoolId === 'string') doc.schoolIdLower = doc.schoolId.toLowerCase();
}

schema.pre('save', function (next) {
  normalize(this);
  next();
});

// Ensure normalization also applies to bulk inserts (insertMany does not trigger `save`)
schema.pre('insertMany', function (next, docs) {
  try {
    if (Array.isArray(docs)) docs.forEach((d) => normalize(d));
  } catch (_) { }
  next();
});

schema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || {};
  if (typeof $set.name === 'string') $set.nameLower = $set.name.toLowerCase();
  if (typeof $set.schoolId === 'string') $set.schoolIdLower = $set.schoolId.toLowerCase();
  update.$set = $set;
  this.setUpdate(update);
  next();
});

schema.index({ orgId: 1, nameLower: 1 });
schema.index({ orgId: 1, schoolIdLower: 1 });
schema.index({ orgId: 1, projectId: 1, nameLower: 1 });

registerSearchSync(schema, 'school');

export default schema;
