import { Schema, model } from "mongoose";

const gitStashSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "GitWorkspace",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "WIP on branch",
      trim: true,
    },
    branch: {
      type: String,
      required: true,
    },
    baseSha: {
      type: String,
      required: true,
    },
    files: [
      {
        path: { type: String, required: true },
        status: { type: String, enum: ["added", "modified", "deleted"], required: true },
        content: { type: String, default: "" },
        size: { type: Number, default: 0 },
        extension: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

gitStashSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });
gitStashSchema.index({ userId: 1, createdAt: -1 });

export const GitStash = model("GitStash", gitStashSchema);

const gitWorkspaceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rootDirectoryId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
    },
    repoOwner: {
      type: String,
      required: true,
      trim: true,
    },
    repoName: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      required: true,
      default: "main",
    },
    baseSha: {
      type: String,
      required: true,
    },
    headSha: {
      type: String,
      default: null,
    },
    cloneUrl: {
      type: String,
      default: "",
    },
    htmlUrl: {
      type: String,
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    stagedFiles: [
      {
        path: { type: String, required: true },
        status: { type: String, enum: ["added", "modified", "deleted"], required: true },
        fileId: { type: Schema.Types.ObjectId, ref: "File", default: null },
        sha: { type: String, default: null },
      },
    ],
    conflictFiles: [
      {
        path: { type: String, required: true },
        localSha: { type: String, default: null },
        remoteSha: { type: String, default: null },
        baseSha: { type: String, default: null },
      },
    ],
    status: {
      type: String,
      enum: ["clean", "modified", "conflict", "syncing"],
      default: "clean",
    },
  },
  {
    timestamps: true,
  }
);

gitWorkspaceSchema.index({ userId: 1, rootDirectoryId: 1 }, { unique: true });
gitWorkspaceSchema.index({ userId: 1, repoOwner: 1, repoName: 1 });
gitWorkspaceSchema.index({ userId: 1, updatedAt: -1 });

const GitWorkspace = model("GitWorkspace", gitWorkspaceSchema);
export default GitWorkspace;
