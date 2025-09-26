import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  path: { type: String },
  sha256: { type: String },
  size: { type: Number },
  type: { type: String },
  encryption: { type: String }
}, { _id: false });

export default new mongoose.Schema({
  type: { type: String, enum: ["app", "content", "combined"], required: true },
  version: {
    app: {
      versionName: { type: String },
      versionCode: { type: Number },
      releaseNotes: { type: String },
      // Persist computed integrity for the primary app artifact (app/app.apk)
      sha256: { type: String },
      sizeBytes: { type: Number }
    },
    content: {
      version: { type: String },
      baseVersion: { type: String }
    }
  },
  files: [FileSchema],
  storage: { s3Key: { type: String }, filePath: { type: String } },
  sizeBytes: { type: Number },
  sha256: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: { type: String },
  ingestedAt: { type: Date },
  finalizedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


