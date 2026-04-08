// OTP Controller — stub functions (implement logic manually)
import nodemailer from "nodemailer";

import OTP from "../models/otpModel.js";
import User from "../models/userModel.js";

export const sendOtp = async (req, res) => {
  // TODO: Implement OTP sending logic
  // Expected body: { email }
  const { email } = req.body;

  // 1. Generate OTP
  const generatedOTP = Math.floor(Math.random() * 900000 + 100000);
  console.log(generatedOTP);
  // 2. Store OTP with expiry (e.g., in DB or cache)
  await OTP.deleteMany({ email });
  await OTP.create({ email, otp: generatedOTP });
  // 3. Send OTP via email/SMS
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
    auth: {
      user: "adarshsingh800515@gmail.com",
      pass: "ukui pftm aeos sgza",
    },
  });

  try {
    const info = await transporter.sendMail({
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

    console.log("Message sent: %s", info.messageId);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error while sending mail:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  // TODO: Implement OTP verification logic
  // Expected body: { email, otp }
  const { email, otp } = req.body;

  // 1. Look up stored OTP for this email
  const otpData = await OTP.findOne({ email });

  // 2. Check if OTP matches and hasn't expired
  if (!otpData) return res.status(403).json({ message: "OTP expired!" });
  if (otpData.otp != otp)
    return res.status(403).json({ message: "Wrong OTP!" });

  // 3. Mark user as verified if they exist
  const user = await User.findOneAndUpdate(
    { email },
    { isVerified: true },
    { new: true },
  );

  // Clean up the used OTP
  await OTP.deleteOne({ _id: otpData._id });

  // 4. Return success
  return res.status(200).json({ message: "OTP verified successfully" });
};
