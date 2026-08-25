import { Schema, model } from "mongoose";

const fileSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    parentDir: { type: Schema.Types.ObjectId, default: null, ref: "Directory" },
    type: { type: String, default: "file" },
    extension: { type: String, default: "" },
    size: { type: Number, default: 0 },
    path: {
      type: Schema.Types.Array,
      default: [],
    },
    starred: {
      type: Boolean,
      default: false,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    hasThumbnail: { type: Boolean, default: false },
    externalUrl: { type: String, default: null },
    contentVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    uploadStatus: {
      type: String,
      enum: ["completed", "uploading", "failed"],
      default: "completed",
    },
    uploadId: {
      type: String,
      default: null,
    },
    gitStatus: {
      status: {
        type: String,
        enum: ["unmodified", "added", "modified", "deleted", null],
        default: null,
      },
      staged: {
        type: Boolean,
        default: false,
      },
      originalSha: {
        type: String,
        default: null,
      },
      remoteSha: {
        type: String,
        default: null,
      },
    },
  },
  { strict: "throw", timestamps: true },
);

fileSchema.index({ userId: 1 });
fileSchema.index({ parentDir: 1 });
fileSchema.index({ parentDir: 1, userId: 1 });
fileSchema.index({ userId: 1, starred: 1 });
fileSchema.index({ userId: 1, createdAt: -1 });
fileSchema.index({ userId: 1, openedAt: -1 });
fileSchema.index({ parentDir: 1, name: 1 });

const File = model("File", fileSchema);
export default File;
