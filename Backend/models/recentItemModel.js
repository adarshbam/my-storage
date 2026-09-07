import mongoose from "mongoose";

const recentItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemId: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["google_drive", "github", "dropbox", "local"],
      required: true,
      default: "local",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["file", "directory"],
      default: "file",
    },
    size: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "",
    },
    metaUrl: {
      type: String,
      default: "",
    },
    githubPath: {
      type: String,
      default: "",
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

recentItemSchema.index({ userId: 1, itemId: 1, provider: 1 }, { unique: true });
recentItemSchema.index({ userId: 1, openedAt: -1 });

const RecentItem = mongoose.model("RecentItem", recentItemSchema);

export default RecentItem;
