import { Schema, model } from "mongoose";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    parentDir: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    type: {
      type: String,
      default: "directory",
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  {
    strict: "throw",
  },
);

const Directory = model("Directory", directorySchema);
export default Directory;
