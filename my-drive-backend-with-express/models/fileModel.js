import { Schema, model } from "mongoose";

const fileSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    userId: { type: String, required: true },
    parentDir: { type: String, default: null },
    type: { type: String, default: "file" },
    extension: { type: String, default: "" },
    size: { type: Number, default: 0 },
    hasThumbnail: { type: Boolean, default: false },
  },
  { strict: "throw" },
);

const File = model("File", fileSchema);
export default File;
