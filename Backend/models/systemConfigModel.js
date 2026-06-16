import { Schema, model } from "mongoose";

const systemConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    maxDevicesLimit: { type: Number, default: 3 },
    maxFileSizeLimit: { type: Number, default: 50 * 1024 * 1024 }, // 50 MB
  },
  { timestamps: true }
);

const SystemConfig = model("SystemConfig", systemConfigSchema);
export default SystemConfig;
