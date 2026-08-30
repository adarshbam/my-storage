import { Schema, model } from "mongoose";

const OTPSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String },
    otpHash: { type: String },
    attempts: { type: Number, default: 0 },
    resendAfter: { type: Date },
    isVerified: { type: Boolean, default: false },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 10 * 60, // 10 minutes TTL
    },
  },
  { strict: "throw" },
);

OTPSchema.index({ email: 1 });

const OTP = model("OTP", OTPSchema);
export default OTP;

