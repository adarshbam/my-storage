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
      default: "local", // can be "local" or "google_drive"
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

const Directory = model("Directory", directorySchema);
export default Directory;
