// model for l0categories which is a collection of categories at the topmost level
import mongoose from 'mongoose';
//import Language from './language.mongo.model.js';

export default new mongoose.Schema(
  {
    name: { type: String, required: true },
    language: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Language' },
    icon: { type: String, default: '' },
    section: { type: String, required: true, enum: ['academic', 'non-academic'] },
    blg: [{ type: String }], // combination of board, language, grade in format "board_%D%_language_%D%_grade" (grade can be grade_stream)
    id: { type: String, required: true, unique: true }, // id of the category
    isActive: { type: Boolean, default: true },
    layout: { type: String, required: true, default: 'subject', enum: ['activity', 'book', 'simulation', 'subject', 'testprep'] },
  },
  { timestamps: true }
).index({ language: 1, id: 1 });
