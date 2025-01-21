// model for l1categories which is a collection of categories at the second level
const mongoose = require('mongoose');

export default new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // id of the category
    name: { type: String, required: true, enum: ['video_lessons', 'pdf_lessons', 'audio_lessons', 'text_lessons', 'practice_questions', 'mock_tests', 'study_material', 'other'] },
    icon: { type: String, required: true, validate: { validator: function(v) { return /^https?:\/\//.test(v); } } },
    type: { type: String, required: true, enum: ['academic', 'non-academic'] },
    blg: { type: String }, // combination of board, language, grade in format "board_%D%_language_%D%_grade" (grade can be grade_stream)
    isActive: { type: Boolean, default: true },
    l0category: { type: String, required: true }, // id of the l0category
  },
  { timestamps: true }
);
