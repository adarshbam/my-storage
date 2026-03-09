import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilepic: { type: String, default: "" },
    rootDirId: { type: String, required: true },
    recentlySearchedItems: { type: [String], default: [] },
  },
  { strict: "throw" },
);

const User = model("User", userSchema);
export default User;
