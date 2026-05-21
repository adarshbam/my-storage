import { model, Schema } from "mongoose";

const shareAccessSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    permission: [{ type: String, enum: ["read", "write", "owner"], default: ["read"] }],
    grantedBy: { type: Schema.Types.ObjectId, ref: "ShareLink", default: null },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000,
      index: {
        expires: 0,
      },
    },
  },
  { strict: "throw" },
);

const ShareAccess = model("SharedAccess", shareAccessSchema);
export default ShareAccess;
