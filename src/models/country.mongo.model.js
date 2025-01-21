import mongoose from "mongoose";

export default new mongoose.Schema({
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  countryId: { type: String, required: true },
});