import { Schema, Types, model } from "mongoose";

const userSchema = new Schema(
  {
    userId: { type: Types.ObjectId, required: true },
    devices: {
      type: Array,
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7 * 24 * 60 * 60,
    },
  },
  { strict: "throw" },
);

userSchema.index({ userId: 1 });

const Session = model("Session", userSchema);
export default Session;
