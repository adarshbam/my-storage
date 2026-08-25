import { Schema, model } from "mongoose";

const gitSyncJobSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    directoryId: {
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
    targetBranch: {
      type: String,
      default: "vault-backup",
      trim: true,
    },
    targetPath: {
      type: String,
      default: "", // optional prefix in repo
      trim: true,
    },
    frequency: {
      type: String,
      enum: ["manual", "on_change", "daily", "weekly"],
      default: "manual",
    },
    commitMessageTemplate: {
      type: String,
      default: "Vault Backup: {timestamp}",
      trim: true,
    },
    lastSyncStatus: {
      type: String,
      enum: ["never", "success", "failed", "in_progress"],
      default: "never",
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastCommitSha: {
      type: String,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    filesCount: {
      type: Number,
      default: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

gitSyncJobSchema.index({ userId: 1, directoryId: 1 }, { unique: true });
gitSyncJobSchema.index({ userId: 1, enabled: 1 });

const GitSyncJob = model("GitSyncJob", gitSyncJobSchema);
export default GitSyncJob;
