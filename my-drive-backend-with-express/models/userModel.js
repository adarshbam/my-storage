import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilepic: { type: Schema.Types.ObjectId, default: null },
    rootDirId: { type: Schema.Types.ObjectId, required: true },
    recentlySearchedItems: { type: Array, default: [] },
  },
  { strict: "throw" },
);

const User = model("User", userSchema);
export default User;
