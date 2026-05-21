import { model, Schema } from "mongoose";

const shareLinkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    token: { type: String, required: true, unique: true },
    permission: [{ type: String, enum: ["read", "write", "owner"], default: ["read"] }],
    expiresAt: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000,
      index: {
        expires: 0,
      },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { strict: "throw" },
);

const ShareLink = model("ShareLink", shareLinkSchema);
export default ShareLink;
