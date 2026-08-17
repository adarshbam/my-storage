import { model, Schema } from "mongoose";

const shareLinkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    token: { type: String, required: true, unique: true },
    permission: [{ type: String, enum: ["read", "write", "owner"], default: ["read"] }],
    expiresAt: {
      type: Date,
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    hasPassword: { type: Boolean, default: false },
    password: { type: String, default: null },
    accessType: { type: String, enum: ["restricted", "public"], default: "restricted" },
    title: { type: String, default: "" },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    maxDownloads: { type: Number, default: null },
    items: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, enum: ["file", "directory"], required: true },
          provider: { type: String, default: "local" },
          name: { type: String, required: true },
          size: { type: Number, default: 0 },
          extension: { type: String, default: "" },
          mimeType: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { strict: "throw" },
);

const ShareLink = model("ShareLink", shareLinkSchema);
export default ShareLink;
