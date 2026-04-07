import { Schema, Types, model } from "mongoose";

const userSchema = new Schema(
  {
    userId: { type: Types.ObjectId, require: true },
    devices: {
      type: Array,
      defualt: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7 * 24 * 60 * 60,
    },
  },
  { strict: "throw" },
);

const Session = model("Session", userSchema);
export default Session;
