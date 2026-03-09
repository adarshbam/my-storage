import { Schema, model } from "mongoose";

const trashSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    userId: { type: String, required: true },
    parentDir: { type: String, default: null },
    type: { type: String, required: true }, // "file" or "directory"

    // File specific fields (optional)
    extension: { type: String },
    size: { type: Number },
    hasThumbnail: { type: Boolean },
  },
  { strict: false }, // Allows flexibility if other fields exist since it's a mixed collection
);

const Trash = model("Trash", trashSchema);
export default Trash;
