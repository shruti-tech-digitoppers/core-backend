// model for l1categories which is a collection of categories at the second level
import mongoose from 'mongoose';
//import Language from './language.mongo.model.js';
//import L0Category from './l0categories.mongo.model.js';

export default new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // id of the l1category
    language: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Language' },
    name: { type: String, required: true, enum: ['video_lessons', 'pdf_lessons', 'audio_lessons', 'text_lessons', 'practice_questions', 'mock_tests', 'study_material', 'other'] },
    icon: { type: String, required: true, validate: { validator: function(v) { return /^https?:\/\//.test(v); } } },
    section: { type: String, required: true, enum: ['academic', 'non-academic'] },
    blg: { type: String }, // combination of board, language, grade in format "board_%D%_language_%D%_grade" (grade can be grade_stream)
    isActive: { type: Boolean, default: true },
    l0category: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'L0Category' }, // id of the l0category
  },
  { timestamps: true }
).index({ language: 1, id: 1 });
