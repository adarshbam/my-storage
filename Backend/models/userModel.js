import { Schema, model } from "mongoose";
import argon2 from "argon2";

const googleDriveSchema = new Schema(
  {
    connected: { type: Boolean, default: false },
    refreshToken: { type: String, default: null },
    scope: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    profilepic: { type: Schema.Types.ObjectId, default: null },
    rootDirId: { type: Schema.Types.ObjectId, required: true },
    recentlySearchedItems: { type: Array, default: [] },
    integrations: {
      googleDrive: {
        type: googleDriveSchema,
        default: () => ({}),
      },
    },
    isVerified: { type: Boolean, default: false },
  },
  { strict: "throw" },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await argon2.hash(this.password);
});

userSchema.methods.comparePassword = async function (enteredPassowrd) {
  const isValid = await argon2.verify(this.password, enteredPassowrd);
  return isValid;
};

const User = model("User", userSchema);
export default User;
