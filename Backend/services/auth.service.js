import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import OTP from "../models/otpModel.js";
import { cacheDel, invalidateUserSessions } from "../databases/redis.js";

import { GOOGLE_CLIENT_ID, CLIENT_URL } from "../config/config.js";
import { sanitize } from "../utils/sanitize.js";
import { createSessionAndSetCookies, createUserWithRootDir } from "../utils/authHelpers.js";
import sendEmail from "../integrations/email/email.service.js";
import { z } from "zod";
import { loginSchema, registerSchema } from "../validators/authSchema.js";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const registerUserLogic = async ({ name, email, password, req, res }) => {
  const { success, data, error } = registerSchema.safeParse({ name, email, password });
  if (!success) {
    const err = new Error("Validation Error");
    err.status = 400;
    err.details = z.flattenError(error);
    throw err;
  }

  let { email: vEmail, name: vName, password: vPassword } = data;
  vName = sanitize(vName);

  try {
    const { userId, rootDirId } = await createUserWithRootDir({
      name: vName || "User",
      email: vEmail,
      password: vPassword,
      profilepicId: null,
      isVerified: true,
    });

    await OTP.deleteMany({ email: vEmail });

    await createSessionAndSetCookies(userId, rootDirId, req, res);

    return { message: `Welcome ${vName || "User"}` };
  } catch (err) {
    console.error(err);
    if (err.code === 121) {
      const e = new Error("Invalid Fields");
      e.status = 400;
      throw e;
    } else if (err.code === 11000 && err.keyValue?.email) {
      const e = new Error("Email already exists");
      e.status = 409;
      throw e;
    } else {
      throw err;
    }
  }
};

export const loginUserLogic = async ({ email, password, otp, req, res }) => {
  const { success, data, error } = loginSchema.safeParse({ email, password, otp });
  if (!success) {
    const err = new Error("Validation Error");
    err.status = 400;
    err.details = z.flattenError(error);
    throw err;
  }

  const { email: vEmail, password: vPassword } = data;
  try {
    const user = await User.findOne({ email: vEmail }).select(
      "password rootDirId name isVerified status"
    );

    if (!user) {
      const e = new Error("Email not registered");
      e.status = 404;
      throw e;
    }

    if (user.status === "Deleted") {
      const e = new Error("User is Deleted contact adarshsinghbam@gmail.com to recover your account");
      e.status = 404;
      throw e;
    }

    if (!user.isVerified) {
      const e = new Error("Please verify your account before logging in.");
      e.status = 403;
      throw e;
    }

    if (!user.password) {
      const e = new Error("This account was created with Google. Please sign in with Google or set a password in your profile settings.");
      e.status = 403;
      throw e;
    }

    const isMatch = await user.comparePassword(vPassword);

    if (!isMatch) {
      const e = new Error("Invalid password");
      e.status = 404;
      throw e;
    }

    const rootDir = await Directory.findOne({ _id: user.rootDirId })
      .select("_id")
      .lean();
    if (!rootDir) {
      const e = new Error("Internal Server Error");
      e.status = 500;
      throw e;
    }

    await createSessionAndSetCookies(user._id, rootDir._id, req, res);

    await OTP.deleteMany({ email: vEmail });

    return { message: `Login successful ${user.name}` };
  } catch (err) {
    console.error(err);
    if (!err.status) {
        const e = new Error("Internal Server Error");
        e.status = 500;
        throw e;
    }
    throw err;
  }
};

export const authGoogleLogic = async ({ credential, req, res }) => {
  if (!credential) {
    const e = new Error("Missing credential");
    e.status = 400;
    throw e;
  }

  try {
    const loginTicket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const { name, email, picture } = loginTicket.getPayload();

    const existingUser = await User.findOne({ email })
      .select("rootDirId name status")
      .lean();

    if (existingUser) {
      if (existingUser.status === "Deleted") {
        const e = new Error("User is Deleted contact adarshsinghbam@gmail.com to recover your account");
        e.status = 404;
        throw e;
      }
      const rootDir = await Directory.findOne({ _id: existingUser.rootDirId })
        .select("_id")
        .lean();
      if (!rootDir) {
        const e = new Error("Internal Server Error");
        e.status = 500;
        throw e;
      }

      await createSessionAndSetCookies(existingUser._id, rootDir._id, req, res);

      return { status: 200, message: `Login successful ${existingUser.name}` };
    }

    const newUserId = new mongoose.Types.ObjectId();

    let profilepicId = null;
    if (picture) {
      const profilePicFile = await File.create({
        name: "google-profile-pic",
        userId: newUserId,
        parentDir: null,
        type: "file",
        extension: "",
        externalUrl: picture,
      });
      profilepicId = profilePicFile._id;
    }

    const { userId, rootDirId } = await createUserWithRootDir({
      name: name || "User",
      email,
      password: null,
      profilepicId,
      isVerified: true,
      userId: newUserId,
    });

    await createSessionAndSetCookies(userId, rootDirId, req, res);

    return { status: 201, message: `Welcome ${name || "User"}` };
  } catch (err) {
    console.error("Google auth error:", err);
    if (err.status) throw err;
    if (err.code === 11000 && err.keyValue?.email) {
      const e = new Error("Email already exists");
      e.status = 409;
      throw e;
    }
    const e = new Error("Internal Server Error");
    e.status = 500;
    throw e;
  }
};

export const authGithubLogic = async ({ code, action, req, res }) => {
  try {
    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=NoCodeProvided`);
    }

    const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
      }),
    });

    const { access_token } = await response.json();

    if (!access_token) {
      return res.redirect(`${CLIENT_URL}/login?error=InvalidToken`);
    }

    const responseUserData = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    const userData = await responseUserData.json();
    console.log(userData);

    let email = userData.email;

    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      });

      const emails = await emailRes.json();
      email =
        emails.find((e) => e.primary && e.verified)?.email ||
        emails.find((e) => e.primary)?.email;
    }

    if (!email) {
      return res.redirect(`${CLIENT_URL}/login?error=NoEmailFound`);
    }

    if (action === "connect") {
      console.log("connecting...");
      console.log(access_token);

      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            "integrations.github": {
              connected: true,
              accessToken: access_token,
              connectedAt: new Date(),
            },
          },
        },
        { new: true }
      );

      const existingDir = await Directory.findOne({
        userId: user._id,
        provider: "github",
      });
      if (!existingDir) {
        const newDirId = new mongoose.Types.ObjectId();
        await Directory.create({
          _id: newDirId,
          name: "Github",
          userId: user._id,
          type: "directory",
          parentDir: user.rootDirId,
          path: [user.rootDirId, newDirId],
          provider: "github",
        });
      }
      user.save();
      await invalidateUserSessions(user._id.toString());

      console.log(user);
      return res.redirect(`${CLIENT_URL}/dashboard`);
    }

    const existingUser = await User.findOne({ email })
      .select("rootDirId name status")
      .lean();

    if (existingUser) {
      const rootDir = await Directory.findOne({ _id: existingUser.rootDirId })
        .select("_id")
        .lean();

      if (existingUser.status === "Deleted") {
        const e = new Error("User is Deleted contact adarshsinghbam@gmail.com to recover your account");
        e.status = 404;
        throw e;
      }

      if (!rootDir) {
        const e = new Error("Internal Server Error");
        e.status = 500;
        throw e;
      }

      await createSessionAndSetCookies(existingUser._id, rootDir._id, req, res);
      return res.redirect(`${CLIENT_URL}/dashboard`);
    }

    const newUserId = new mongoose.Types.ObjectId();

    let profilepicId = null;
    if (userData.avatar_url) {
      const profilePicFile = await File.create({
        name: "github-profile-pic",
        userId: newUserId,
        parentDir: null,
        type: "file",
        extension: "",
        externalUrl: userData.avatar_url,
      });
      profilepicId = profilePicFile._id;
    }

    const { userId, rootDirId } = await createUserWithRootDir({
      name: userData.name || userData.login || "User",
      email,
      password: null,
      profilepicId,
      isVerified: true,
      userId: newUserId,
    });

    await createSessionAndSetCookies(userId, rootDirId, req, res);
    return res.redirect(`${CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error("GitHub auth error:", err);
    return res.redirect(`${CLIENT_URL}/login?error=AuthFailed`);
  }
};

export const logoutLogic = async ({ sessionId, res }) => {
  await Session.deleteOne({ _id: sessionId });
  await cacheDel("session:" + sessionId);
  res.clearCookie("rootDirId", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("sessionId", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    signed: true,
  });

  return { message: "Logout successful" };
};

export const logoutAllDevicesLogic = async ({ userId, res }) => {
  try {
    await Session.deleteMany({ userId });
    await invalidateUserSessions(userId.toString());
    res.clearCookie("rootDirId", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.clearCookie("sessionId", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
    });
    return { message: "Logged out of all devices" };
  } catch (err) {
    console.error(err);
    const e = new Error("Internal Server Error");
    e.status = 500;
    throw e;
  }
};

export const forgotPasswordLogic = async ({ email }) => {
  console.log(email);

  const user = await User.findOne({ email });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      from: `"Vault" <no-reply@vault.com>`,
      to: email,
      subject: "Reset Your Vault Password",
      text: `
      We received a request to reset your Vault account password.
      
      Reset your password using the link below:
      ${resetUrl}
      
      This link will expire in 15 minutes.
      
      If you did not request a password reset, you can safely ignore this email.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 40px 20px; color: #333;">
          <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #e5e5e5; text-align: center;">
            <h1 style="margin-bottom: 10px; font-size: 28px; color: #111827;">Vault</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-top: 20px;">We received a request to reset your password.</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Click the button below to set a new password.</p>
            <a href="${resetUrl}" style="display: inline-block; margin-top: 25px; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280; line-height: 1.6;">This link will expire in 15 minutes.</p>
            <p style="margin-top: 10px; font-size: 13px; color: #9ca3af; line-height: 1.6;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });
  }

  return {
    message: "If an account exists with this email, a reset link has been sent.",
  };
};

export const resetPasswordLogic = async ({ token, newPassword }) => {
  if (!token) {
    const e = new Error("Invalid or missing token");
    e.status = 400;
    throw e;
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  console.log(hashedToken);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    const e = new Error("Reset Token Invalid or Expired");
    e.status = 401;
    throw e;
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();

  return { message: "Password updated successfully" };
};
