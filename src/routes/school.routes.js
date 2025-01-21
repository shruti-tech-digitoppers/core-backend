import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  block: { type: String },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  zip: { type: String },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  numberOfStudents: { type: Number, required: true },
  numberOfTeachers: { type: Number },
  numberOfLicenses: { type: Number, required: true },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
  coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Coordinator" },
}, { timestamps: true });

export default mongoose.model("School", schoolSchema);