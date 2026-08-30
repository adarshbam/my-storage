import { Schema, model } from "mongoose";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    parentDir: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Directory",
    },
    type: {
      type: String,
      default: "directory",
    },
    starred: {
      type: Boolean,
      default: false,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    size: {
      type: Number,
      default: 0,
    },
    path: {
      type: Schema.Types.Array,
      default: [],
    },
    provider: {
      type: String,
      default: "local", // can be "local", "google_drive", or "git_workspace"
    },
    gitWorkspace: {
      workspaceId: { type: Schema.Types.ObjectId, ref: "GitWorkspace", default: null },
      repoOwner: { type: String, default: null },
      repoName: { type: String, default: null },
      branch: { type: String, default: null },
      baseSha: { type: String, default: null },
      headSha: { type: String, default: null },
    },
    gitSync: {
      jobId: { type: Schema.Types.ObjectId, ref: "GitSyncJob", default: null },
      enabled: { type: Boolean, default: false },
      repoOwner: { type: String, default: null },
      repoName: { type: String, default: null },
      targetBranch: { type: String, default: null },
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

directorySchema.index({ userId: 1 });
directorySchema.index({ parentDir: 1 });
directorySchema.index({ parentDir: 1, userId: 1 });
directorySchema.index({ userId: 1, starred: 1 });
directorySchema.index({ parentDir: 1, name: 1 });
directorySchema.index({ userId: 1, createdAt: -1 });
directorySchema.index({ userId: 1, openedAt: -1 });

const Directory = model("Directory", directorySchema);
export default Directory;
