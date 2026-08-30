import { model, Schema } from "mongoose";

const sharedItemSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["file", "directory"], required: true },
    provider: { type: String, default: "local" },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    extension: { type: String, default: "" },
    mimeType: { type: String, default: "" },
  },
  { _id: false }
);

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
    items: {
      type: [sharedItemSchema],
      default: [],
    },
  },
  { strict: true }
);

shareAccessSchema.index({ targetUserId: 1, expiresAt: 1 });
shareAccessSchema.index({ targetUserId: 1, "items.id": 1 });
shareAccessSchema.index({ grantedBy: 1 });
shareAccessSchema.index({ userId: 1, targetUserId: 1, grantedBy: 1 });

const ShareAccess = model("SharedAccess", shareAccessSchema);
export default ShareAccess;
