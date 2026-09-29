import mongoose from 'mongoose';
import { LICENSE_PLATFORMS, SOLUTIONS } from '../constants/platforms.constants.js';

export default new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    schoolId: { type: String, required: true },
    name: { type: String, required: true },
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
    numberOfStudents: { type: Number, default: 0 },
    numberOfTeachers: { type: Number, default: 0 },
    numberOfLicenses: { type: Number, default: 0 },
    // Mirrors digi-dashboard's School.platforms so saves from this service don't strip it.
    platforms: [
      {
        platform: { type: String, enum: LICENSE_PLATFORMS, required: true },
        solution: { type: String, enum: SOLUTIONS, default: null },
        licenseCount: { type: Number, required: true, min: 1 },
        licenseDays: { type: Number, required: true, min: 1, max: 10000 },
      },
    ],
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator' },
  },
  { timestamps: true }
);
