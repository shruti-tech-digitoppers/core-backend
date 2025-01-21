import mongoose from "mongoose";

export default new mongoose.Schema({
  name: {
    type: String,
    required: true,
	enum: ["Arts and Humanities", "Commerce", "Science"],
  },
  id: {
    type: String,
    required: true,
	enum: ["arts", "commerce", "science"],
  },
  icon: {
    type: String,
  },
  index: {
    type: Number,
    default: 0,
  },
  //grade_ids: {
  //  type: [mongoose.Schema.Types.ObjectId],
  //  ref: "Grade",
  //  default: [],
  //},
});
