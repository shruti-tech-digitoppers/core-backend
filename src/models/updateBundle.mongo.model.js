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
  platform: { type: String, enum: ["android", "windows", "linux", "all"], required: true, default: "android", index: true },
  version: {
    app: {
      platform: { type: String, enum: ["android", "windows", "linux"] },
      versionName: { type: String },
      versionCode: { type: Number },
      releaseNotes: { type: String },
      // Keep canonical artifact fields platform-neutral so Android APKs and Windows installers share integrity handling.
      artifactPath: { type: String },
      artifactKind: { type: String, enum: ["android_apk", "windows_installer"] },
      sha256: { type: String },
      sizeBytes: { type: Number },
      apkSHA256: { type: String },
      apkSizeBytes: { type: Number },
      installerPath: { type: String },
      installerSha256: { type: String },
      installerSizeBytes: { type: Number },
      silentArgs: [{ type: String }],
      relaunchArgs: [{ type: String }]
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


