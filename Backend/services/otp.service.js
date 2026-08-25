import OTP from "../models/otpModel.js";
import User from "../models/userModel.js";
import sendEmail from "../integrations/email/email.service.js";
import { OTPSchema } from "../validators/authSchema.js";
import { z } from "zod";
import { withTransaction } from "../utils/transaction.js";
import { generateOtp, hashOtp } from "../utils/crypto.utils.js";

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown
const MAX_VERIFY_ATTEMPTS = 5; // 5 attempts per OTP

export const sendOtpLogic = async ({ email }) => {
  if (!email) {
    const err = new Error("Email is required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.toLowerCase().trim();

  // 1. Enforce resend cooldown
  const existingOtp = await OTP.findOne({ email: cleanEmail });
  if (existingOtp && existingOtp.resendAfter && Date.now() < existingOtp.resendAfter.getTime()) {
    const remainingSeconds = Math.ceil((existingOtp.resendAfter.getTime() - Date.now()) / 1000);
    const err = new Error(`Please wait ${remainingSeconds}s before requesting a new code.`);
    err.status = 429;
    err.retryAfter = remainingSeconds;
    throw err;
  }

  // 2. Generate secure 6-digit OTP
  const generatedOTP = generateOtp(6);
  const otpHash = hashOtp(generatedOTP);
  const resendAfter = new Date(Date.now() + RESEND_COOLDOWN_MS);

  await withTransaction(async (session) => {
    await OTP.deleteMany({ email: cleanEmail }).session(session);
    await OTP.create(
      [
        {
          email: cleanEmail,
          otp: generatedOTP,
          otpHash,
          attempts: 0,
          resendAfter,
        },
      ],
      { session }
    );
  });

  try {
    await sendEmail({
      from: `"Storiffy" <no-reply@storiffy.com>`,
      to: cleanEmail,
      subject: "Your Storiffy OTP Code",
      text: `Your OTP is ${generatedOTP}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #333;">Storiffy Verification</h2>
        <p style="font-size: 16px; color: #555;">
            Use the OTP below to complete your verification:
        </p>

        <div style="
            display: inline-block;
            margin: 20px 0;
            padding: 15px 30px;
            font-size: 28px;
            letter-spacing: 5px;
            font-weight: bold;
            background-color: #f4f4f4;
            border-radius: 8px;
            border: 1px solid #ddd;
            user-select: all;
        ">
            ${generatedOTP}
        </div>

        <p style="color: #888; font-size: 14px;">
            This OTP is valid for 10 minutes.
        </p>

        <p style="color: #aaa; font-size: 12px;">
            If you didn’t request this, you can ignore this email.
        </p>
        </div>
    `,
    });
    return {
      message: "OTP sent successfully",
      resendCooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    };
  } catch (err) {
    console.error("Error while sending mail:", err);
    const e = new Error("Failed to send verification email. Please check the address and try again.");
    e.status = 500;
    throw e;
  }
};

export const verifyOtpLogic = async ({ email, otp }) => {
  const { success, data, error } = OTPSchema.safeParse({ email, otp });
  if (!success) {
    const err = new Error("Validation Error");
    err.status = 400;
    err.details = z.flattenError(error);
    throw err;
  }

  const { email: vEmail, otp: vOtp } = data;
  const cleanEmail = vEmail.toLowerCase().trim();

  const otpData = await OTP.findOne({ email: cleanEmail });

  if (!otpData) {
    const e = new Error("Verification code has expired or was not requested. Please request a new code.");
    e.status = 400;
    throw e;
  }

  // Check attempt limit
  if (otpData.attempts >= MAX_VERIFY_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpData._id });
    const e = new Error("Too many incorrect attempts. Please request a new verification code.");
    e.status = 429;
    throw e;
  }

  // Check matching code (hash or plaintext backward-compatibility)
  const isMatch = otpData.otpHash
    ? hashOtp(vOtp) === otpData.otpHash
    : String(otpData.otp) === String(vOtp);

  if (!isMatch) {
    const newAttempts = (otpData.attempts || 0) + 1;
    const remaining = MAX_VERIFY_ATTEMPTS - newAttempts;

    if (remaining <= 0) {
      await OTP.deleteOne({ _id: otpData._id });
      const e = new Error("Too many incorrect attempts. Please request a new verification code.");
      e.status = 429;
      throw e;
    }

    await OTP.updateOne({ _id: otpData._id }, { $set: { attempts: newAttempts } });

    const e = new Error(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    e.status = 400;
    throw e;
  }

  await withTransaction(async (session) => {
    await User.findOneAndUpdate(
      { email: cleanEmail },
      { isVerified: true },
      { returnDocument: "after", session }
    );

    await OTP.deleteOne({ _id: otpData._id }).session(session);
  });

  return { message: "OTP verified successfully" };
};
