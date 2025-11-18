import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['video', 'pdf', 'epub', 'audio', 'image', 'text', 'simulation', 'other'] },
    url: { type: String, required: true },
    duration: { type: Number },
    thumbnail: {
      type: String,
      required: true,
      default: 'https://i.vimeocdn.com/video/1912202188-e385c1c3ffceffd54014ccda863ec2493a493088d3b4d37526b10db954c4f902-d_295x166',
    },
    description: { type: String },
    tags: { type: [String] },
    l0categoryId: { type: String, required: true },
    l1categoryId: { type: String, required: true },
    subjectId: { type: String, required: true },
    language: { type: String, required: true },
    level: { type: String },
    rating: { type: Number },
  },
  { timestamps: true }
);
