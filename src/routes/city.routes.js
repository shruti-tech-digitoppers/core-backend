import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
	name: { type: String, required: true },
	isActive: { type: Boolean, default: true },
	cityId: { type: String, required: true },
	stateId: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
	countryId: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
	zip: { type: String },
});

export default mongoose.model("City", citySchema);