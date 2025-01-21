import mongoose from "mongoose";

export default new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  id: {
    type: String,
    required: true,
    unique: true,
  },
  icon: {
    type: String,
  },
  color: {
    type: String,
  },
  index: {
    type: Number,
    default: 0,
  },
  short_name: {
    type: String,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
},
{
	timestamps: true,
});
