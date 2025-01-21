import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
	name: { type: String, required: true },
	isActive: { type: Boolean, default: true },
	countryId: { type: String, required: true },
});

export default mongoose.model("Country", countrySchema);