import mongoose from "mongoose";

const stateSchema = new mongoose.Schema({
	name: { type: String, required: true },
	isActive: { type: Boolean, default: true },
	stateId: { type: String, required: true },
	countryId: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
});

export default mongoose.model("State", stateSchema);