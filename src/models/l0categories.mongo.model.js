// model for l0categories which is a collection of categories at the topmost level
const mongoose = require('mongoose');

export default new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true },
    type: { type: String, required: true, enum: ['academic', 'non-academic'] },
    blg: [{ type: String }], // combination of board, language, grade in format "board_%D%_language_%D%_grade" (grade can be grade_stream)
    id: { type: String, required: true, unique: true }, // id of the category
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
