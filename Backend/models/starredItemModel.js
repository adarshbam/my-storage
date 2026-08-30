import mongoose from "mongoose";

const starredItemSchema = new mongoose.Schema(
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
    starred: {
      type: Boolean,
      default: true,
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

starredItemSchema.index({ userId: 1, itemId: 1, provider: 1 }, { unique: true });
starredItemSchema.index({ userId: 1, starred: 1, provider: 1 });

const StarredItem = mongoose.model("StarredItem", starredItemSchema);

export default StarredItem;
