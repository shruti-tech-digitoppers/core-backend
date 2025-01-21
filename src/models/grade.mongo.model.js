import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['LKG', 'UKG', 'Nursery', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    },
    id: {
      type: String,
      required: true,
      unique: true,
      enum: ['lkg', 'ukg', 'nursery', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'],
    },
    color: {
      type: String,
    },
    icon: {
      type: String,
    },
    index: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    streams: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'GradeStream',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);
