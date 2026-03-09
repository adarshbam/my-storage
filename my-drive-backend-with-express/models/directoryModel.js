import { Schema, model } from "mongoose";

const directorySchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    parentDir: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      default: "directory",
    },
  },
  {
    strict: "throw",
  },
);

const Directory = model("Directory", directorySchema);
export default Directory;
