import mongoose from "mongoose";

export default new mongoose.Schema({
	partnerName: { type: String, required: true },
	partnerDescription: { type: String, required: true },
	email: { type: String, required: true },
	phone: { type: String, required: true },
	address: { type: String },
	city: { type: String, required: true },
	state: { type: String, required: true },
	zip: { type: String },
	country: { type: String, required: true },
	status: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	isActive: { type: Boolean, default: true },
});