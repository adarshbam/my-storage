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

const githubSchema = new Schema(
  {
    connected: { type: Boolean, default: false },
    accessToken: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordTokenExpires: { type: Date, default: Date.now },
    profilepic: { type: Schema.Types.ObjectId, default: null, ref: "File" },
    rootDirId: { type: Schema.Types.ObjectId, required: true },
    maxStorage: { type: Number, default: 1024 * 1024 * 1024 },
    recentlySearchedItems: { type: Array, default: [] },
    role: {
      type: String,
      enum: ["Owner", "Admin", "Manager", "User"],
      default: "User",
    },
    status: {
      type: String,
      enum: ["Active", "Deleted"],
      default: "Active",
    },
    integrations: {
      googleDrive: {
        type: googleDriveSchema,
        default: () => ({}),
      },
      github: {
        type: githubSchema,
        default: () => ({}),
      },
    },
    isVerified: { type: Boolean, default: false },
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
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
