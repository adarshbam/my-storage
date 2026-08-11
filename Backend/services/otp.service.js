import OTP from "../models/otpModel.js";
import User from "../models/userModel.js";
import sendEmail from "../integrations/email/email.service.js";
import { OTPSchema } from "../validators/authSchema.js";
import { z } from "zod";

export const sendOtpLogic = async ({ email }) => {
  const generatedOTP = Math.floor(Math.random() * 900000 + 100000);
  console.log(generatedOTP);
  
  await OTP.deleteMany({ email });
  await OTP.create({ email, otp: generatedOTP });

  try {
    await sendEmail({
      from: `"Storiffy" <no-reply@storiffy.com>`,
      to: email,
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
    return { message: "OTP sent successfully" };
  } catch (err) {
    console.error("Error while sending mail:", err);
    const e = new Error("Internal Server Error");
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

  const otpData = await OTP.findOne({ email: vEmail });

  if (!otpData) {
    const e = new Error("OTP expired!");
    e.status = 403;
    throw e;
  }
  if (otpData.otp != vOtp) {
    const e = new Error("Wrong OTP!");
    e.status = 403;
    throw e;
  }

  const user = await User.findOneAndUpdate(
    { email: vEmail },
    { isVerified: true },
    { returnDocument: "after" }
  );

  await OTP.updateOne({ _id: otpData._id }, { $set: { isVerified: true } });

  return { message: "OTP verified successfully" };
};
