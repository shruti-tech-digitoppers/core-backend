import mongoose from "mongoose";

export default new mongoose.Schema({
	orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
	projectName: { type: String, required: true },
	projectId: { type: String, required: true },
	email: { type: String, required: true },
	phone: { type: String, required: true },
	address: { type: String },
	numberOfSchools: { type: Number, default: 0 },
	numberOfLicenses: { type: Number, default: 0 },
	country: { type: mongoose.Schema.Types.ObjectId, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	isActive: { type: Boolean, default: true },
});