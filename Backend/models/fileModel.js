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
    publicAccess: {
      enabled: { type: Boolean, default: false },
      token: { type: String, default: null },
      allowedOrigins: { type: [String], default: ["*"] },
      playerSettings: {
        accentColor: { type: String, default: "#00f0ff" },
        hideBranding: { type: Boolean, default: false },
        customWatermark: {
          url: { type: String, default: "" },
          position: {
            type: String,
            enum: ["top-left", "top-right", "bottom-left", "bottom-right"],
            default: "top-right",
          },
          clickUrl: { type: String, default: "" },
          opacity: { type: Number, default: 0.8, min: 0, max: 1 },
        },
        autoPlay: { type: Boolean, default: false },
        loop: { type: Boolean, default: false },
        muted: { type: Boolean, default: false },
        controls: { type: Boolean, default: true },
        aspectRatio: { type: String, default: "16:9" },
        borderRadius: { type: String, default: "12px" },
      },
      views: { type: Number, default: 0 },
      updatedAt: { type: Date, default: null },
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
fileSchema.index({ "publicAccess.token": 1 }, { sparse: true });
fileSchema.index({ "publicAccess.enabled": 1 });

const File = model("File", fileSchema);
export default File;
