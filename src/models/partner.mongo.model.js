import mongoose from "mongoose";

export default new mongoose.Schema({
	partnerName: { type: String, required: true },
	email: { type: String, required: true },
	phone: { type: String, required: true },
	address: { type: String, required: true },
	country: { type: mongoose.Schema.Types.ObjectId, required: true },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	isActive: { type: Boolean, default: true },
});