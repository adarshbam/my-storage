import { Schema, model } from "mongoose";

const systemConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    maxDevicesLimit: { type: Number, default: 3 },
    maxFileSizeValue: { type: Number, default: 500 },
    maxFileSizeUnit: {
      type: String,
      enum: ["KB", "MB", "GB"],
      default: "MB",
    },
    sessionTimeoutValue: { type: Number, default: 24 },
    sessionTimeoutUnit: {
      type: String,
      enum: ["Minutes", "Hours", "Days"],
      default: "Hours",
    },
    defaultStorageUnit: {
      type: String,
      enum: ["MB", "GB", "TB"],
      default: "GB",
    },
    freeTrialInheritedTier: {
      type: String,
      default: "ultimate",
    },
  },
  { timestamps: true },
);

const SystemConfig = model("SystemConfig", systemConfigSchema);
export default SystemConfig;
