import { Schema, model } from "mongoose";

const trashSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    parentDir: { type: Schema.Types.ObjectId, default: null },
    type: { type: String, required: true }, // "file" or "directory"
    extension: { type: String, default: "" },
    size: { type: Number, default: 0 },
    hasThumbnail: { type: Boolean, default: false },
    deleted_at: { type: Date, default: Date.now },
  },
  { strict: false }, // Allows flexibility if other fields exist since it's a mixed collection
);

trashSchema.index({ userId: 1, deleted_at: -1 });
trashSchema.index({ deleted_at: 1 });
trashSchema.index({ parentDir: 1 });

const Trash = model("Trash", trashSchema);
export default Trash;
