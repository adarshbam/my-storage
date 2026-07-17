import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_ID, CLIENT_URL } from "../config.js";

import crypto from "crypto";

import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import { cacheDel, invalidateUserSessions } from "../utils/redis.js";

import { sanitize } from "../utils/sanitize.js";
import { uploadToB2, deleteFromB2, getObjectFromB2 } from "../utils/s3.js";

import {
  createSessionAndSetCookies,
  createUserWithRootDir,
} from "../utils/authHelpers.js";
import sendEmail from "../utils/email.js";
import OTP from "../models/otpModel.js";
import { z } from "zod";
import { loginSchema, registerSchema } from "../validators/authSchema.js";

const STORAGE_DIR = path.join(import.meta.dirname, "../storage");

// ─── User Info ──────────────────────────────────────────────────────────────────

export const getUser = async (req, res) => {
  try {
    const user = req.user;
    const rootDir = await Directory.findOne({ _id: user.rootDirId })
      .select("-_id size")
      .lean();
    const usedStorage = rootDir ? rootDir.size : 0;

    return res.status(200).json({
      name: user.name,
      email: user.email,
      role: user.role || "User",
      profilepic: user.profilepic,
      maxStorage: user.maxStorage,
      rootDirectoryId: user.rootDirId,
      usedStorage,
      theme: user.theme || "dark",
      integrations: {
        googleDrive: { connected: !!user.integrations?.googleDrive?.connected },
        github: { connected: !!user.integrations?.github?.connected },
      },
    });
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── Email/Password Registration ────────────────────────────────────────────────

export const registerUser = async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  if (!success) return res.status(400).json({ error: z.flattenError(error) });

  let { email, name, password } = data;

  name = sanitize(name);

  try {
    // Check that the email was verified via OTP (BYPASSED)
    // const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

    // if (!otpRecord || !otpRecord.isVerified) {
    //   return res
    //     .status(403)
    //     .json({ error: "Email not verified. Please verify OTP first." });
    // }

    const { userId, rootDirId } = await createUserWithRootDir({
      name: name || "User",
      email,
      password,
      profilepicId: null,
      isVerified: true,
    });

    // Clean up all OTP records for this email after successful registration
    await OTP.deleteMany({ email });

    // Auto-login: create session and set cookies
    await createSessionAndSetCookies(userId, rootDirId, req, res);

    return res.status(201).json({ message: `Welcome ${name || "User"}` });
  } catch (err) {
    console.error(err);
    if (err.code === 121) {
      return res.status(400).json({ error: "Invalid Fields" });
    } else if (err.code === 11000 && err.keyValue?.email) {
      return res.status(409).json({ error: "Email already exists" });
    } else {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// ─── Email/Password Login ───────────────────────────────────────────────────────

export const loginUser = async (req, res) => {
  const { success, data, error } = loginSchema.safeParse(req.body);
  if (!success) return res.status(400).json({ error: z.flattenError(error) });

  const { email, password, otp } = data;
  try {
    // ── OTP verification ──────────────────────────────────────────────────────
    // BYPASSED OTP for development
    // if (!otp) {
    //   return res.status(401).json({ error: "OTP is required" });
    // }

    // const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

    // if (!otpRecord) {
    //   return res
    //     .status(401)
    //     .json({ error: "OTP expired or not found. Please request a new one." });
    // }

    // if (String(otpRecord.otp) !== String(otp)) {
    //   return res.status(401).json({ error: "Invalid OTP" });
    // }

    // ── Credential verification ───────────────────────────────────────────────
    const user = await User.findOne({ email }).select(
      "password rootDirId name isVerified",
    );

    if (!user) {
      return res.status(404).json({ error: "Email not registered" });
    }

    if (user.status === "Deleted") {
      return res.status(404).json({
        message:
          "User is Deleted contact adarshsinghbam@gmail.com to recover your account",
      });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ error: "Please verify your account before logging in." });
    }

    if (!user.password) {
      return res.status(403).json({
        error:
          "This account was created with Google. Please sign in with Google or set a password in your profile settings.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(404).json({ error: "Invalid password" });
    }

    const rootDir = await Directory.findOne({ _id: user.rootDirId })
      .select("_id")
      .lean();
    if (!rootDir) {
      return res.status(500).json({ message: "Internal Server Error" });
    }

    await createSessionAndSetCookies(user._id, rootDir._id, req, res);

    // Clean up OTP records after successful login
    await OTP.deleteMany({ email });

    return res.status(200).json({ message: `Login successful ${user.name}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── Google OAuth ───────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const authGoogle = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: "Missing credential" });
  }

  try {
    // Verify the Google ID token
    const loginTicket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const { name, email, picture } = loginTicket.getPayload();

    // ── Existing user → log them in ──────────────────────────────────────────
    const existingUser = await User.findOne({ email })
      .select("rootDirId name")
      .lean();

    if (existingUser) {
      if (existingUser.status === "Deleted") {
        return res.status(404).json({
          message:
            "User is Deleted contact adarshsinghbam@gmail.com to recover your account",
        });
      }
      const rootDir = await Directory.findOne({ _id: existingUser.rootDirId })
        .select("_id")
        .lean();
      if (!rootDir) {
        return res.status(500).json({ error: "Internal Server Error" });
      }

      await createSessionAndSetCookies(existingUser._id, rootDir._id, req, res);

      return res
        .status(200)
        .json({ message: `Login successful ${existingUser.name}` });
    }

    // ── New user → register + log them in ────────────────────────────────────

    const newUserId = new mongoose.Types.ObjectId();

    // Create a File document for the Google profile pic (external URL)
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
      isVerified: true, // Google already verified their email
      userId: newUserId,
    });

    await createSessionAndSetCookies(userId, rootDirId, req, res);

    return res.status(201).json({ message: `Welcome ${name || "User"}` });
  } catch (err) {
    console.error("Google auth error:", err);
    if (err.code === 11000 && err.keyValue?.email) {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── GitHub OAuth ───────────────────────────────────────────────────────────────

export const authGithub = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=NoCodeProvided`);
    }

    const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

    // 2. Exchange the 'code' for an access token via POST https://github.com/login/oauth/access_token
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
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
      },
    );

    const { access_token } = await response.json();

    if (!access_token) {
      return res.redirect(`${CLIENT_URL}/login?error=InvalidToken`);
    }

    // 3. Fetch user data using the access token from GET https://api.github.com/user
    const responseUserData = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    const userData = await responseUserData.json();

    console.log(userData);

    // 4. Fetch user email using the access token from GET https://api.github.com/user/emails
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

    // 5. To Connect Github
    if (state === "connect") {
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
      );

      // Create a Special Directory to act as the Google Drive mount point
      // Using provider: "github" will teach the frontend to intercept it

      // Check if the directory already exists so we don't duplicate it
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
          provider: "github", // This links it to the frontend specialView
        });
      }
      user.save();
      await invalidateUserSessions(user._id.toString());

      console.log(user);
      return res.redirect(`${CLIENT_URL}/dashboard`);
    }

    // 6. Check if user exists in the database
    const existingUser = await User.findOne({ email })
      .select("rootDirId name")
      .lean();

    if (existingUser) {
      const rootDir = await Directory.findOne({ _id: existingUser.rootDirId })
        .select("_id")
        .lean();
      ``;
      if (existingUser.status === "Deleted") {
        return res.status(404).json({
          message:
            "User is Deleted contact adarshsinghbam@gmail.com to recover your account",
        });
      }

      if (!rootDir) {
        return res.status(500).json({ error: "Internal Server Error" });
      }

      await createSessionAndSetCookies(existingUser._id, rootDir._id, req, res);
      return res.redirect(`${CLIENT_URL}/dashboard`);
    }

    // ── New user → register + log them in ────────────────────────────────────

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

// ─── Logout ─────────────────────────────────────────────────────────────────────

export const logoutUser = async (req, res) => {
  const { sessionId } = req.signedCookies;

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

  return res.status(200).json({ message: "Logout successful" });
};

export const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
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
    return res.status(200).json({ message: "Logged out of all devices" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
  ``;
};

// ─── Profile Pic ────────────────────────────────────────────────────────────────

export const uploadProfilePic = async (req, res) => {
  const user = await User.findOne({ _id: req.user.id })
    .select("rootDirId profilepic")
    .lean();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const fileName = sanitize(req.headers.filename);
  const ext = path.extname(fileName);

  const profilePicId = new mongoose.Types.ObjectId();

  const newProfilePic = {
    _id: profilePicId,
    extension: ext,
    type: "file",
    userId: req.user.id,
    name: fileName,
    parentDir: null,
  };

  await File.create(newProfilePic);

  // Clean up old profile pic (B2 object or external URL doc)
  if (user.profilepic) {
    const oldProfilePic = await File.findOne({
      _id: user.profilepic,
    })
      .select("extension externalUrl")
      .lean();
    if (oldProfilePic) {
      await File.deleteOne({ _id: oldProfilePic._id });
      if (!oldProfilePic.externalUrl) {
        await deleteFromB2({
          key: `${oldProfilePic._id.toString()}${oldProfilePic.extension}`,
        });
      }
    }
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers["content-type"] || "image/png";

    await uploadToB2({
      key: `${profilePicId.toString()}${ext}`,
      body: buffer,
      contentType,
    });

    await User.updateOne(
      { _id: user._id },
      { $set: { profilepic: profilePicId } },
    );

    await invalidateUserSessions(req.user.id);
    return res.status(200).json({ message: "Profile pic updated" });
  } catch (err) {
    console.error("Profile pic upload error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProfilePic = async (req, res) => {
  const { id } = req.query;
  const profilePicId = id || req.user.profilepic;

  if (!profilePicId) {
    return res.status(404).send("No profile pic set");
  }
  const profilePic = await File.findOne({ _id: profilePicId })
    .select("extension externalUrl userId")
    .lean();

  if (!profilePic) {
    return res.status(404).send("Profile pic not found");
  }

  // If requesting someone else's profile pic, check if user has access
  if (id && id !== req.user.profilepic?.toString()) {
    const hierarchy = ["User", "Manager", "Admin", "Owner"];
    const userRoleIndex = hierarchy.indexOf(req.user.role || "User");

    const hasAccess =
      (await SharedAccess.findOne({
        userId: profilePic.userId,
        targetUserId: req.user.id,
      })) ||
      (await ShareLink.findOne({
        userId: profilePic.userId,
        targetUserId: req.user.id,
      }));

    if (!hasAccess && userRoleIndex <= 0) {
      return res.status(403).send("Unauthorized");
    }
  }

  // If it's an external URL (e.g. Google avatar), redirect to it
  if (profilePic.externalUrl) {
    return res.redirect(profilePic.externalUrl);
  }

  try {
    const s3Response = await getObjectFromB2({
      key: `${profilePic._id.toString()}${profilePic.extension}`,
    });
    res.setHeader(
      "Content-Type",
      s3Response.ContentType || "image/png",
    );
    return s3Response.Body.pipe(res);
  } catch (s3Err) {
    console.error("Failed to fetch profile pic from B2:", s3Err);
    return res.status(404).send("Profile pic file not found");
  }
};

// ─── Search History ─────────────────────────────────────────────────────────────

export const getSearchedItems = (req, res) => {
  return res.status(200).json(req.user.recentlySearchedItems || []);
};

export const storeSearchedItem = async (req, res) => {
  const rawSearchItem = req.body.searchItem;
  const searchItem =
    typeof rawSearchItem === "string" ? sanitize(rawSearchItem) : rawSearchItem;

  try {
    const user = await User.findOne({ _id: req.user.id })
      .select("recentlySearchedItems")
      .lean();

    if (!user) return res.status(404).send("User not found");

    let recentlySearchedItems = user.recentlySearchedItems || [];

    if (!searchItem || searchItem.trim() === "") {
      recentlySearchedItems = [];
      await User.updateOne(
        { _id: user._id },
        { $set: { recentlySearchedItems } },
      );
      return res.status(200).json({ msg: "Search history cleared" });
    }

    const existingIndex = recentlySearchedItems.indexOf(searchItem);
    if (existingIndex !== -1) {
      recentlySearchedItems.splice(existingIndex, 1);
    }

    recentlySearchedItems.push(searchItem);

    if (recentlySearchedItems.length > 5) {
      recentlySearchedItems = recentlySearchedItems.slice(-5);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { recentlySearchedItems } },
    );
    res.status(201).json({ msg: "Succesfully Stored Searched Item" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// ─── Theme Preference ──────────────────────────────────────────────────────────

export const updateTheme = async (req, res) => {
  const { theme } = req.body;
  if (!["light", "dark"].includes(theme)) {
    return res.status(400).json({ error: "Invalid theme" });
  }

  try {
    await User.updateOne({ _id: req.user.id }, { $set: { theme } });
    await invalidateUserSessions(req.user.id);
    return res.status(200).json({ message: "Theme updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── Profile Settings ──────────────────────────────────────────────────────────

export const updateName = async (req, res) => {
  const { name } = req.body;

  const user = await User.findOne({ _id: req.user.id });
  user.name = sanitize(name);
  await user.save();
  await invalidateUserSessions(req.user.id);
  return res.status(200).json({ message: "Name update logged" });
};

export const updatePassword = async (req, res) => {
  const { currentPassword, password } = req.body;
  console.log(`Password update request received`, {
    currentPassword,
    password,
  });

  const user = await User.findOne({ _id: req.user.id });

  if (!user.password) {
    user.password = password;
    await user.save();
    return res.status(200).json({ message: "Password created successfully" });
  }

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(404).json({ error: "Invalid current password" });
  }

  user.password = password;
  await user.save();

  return res.status(200).json({ message: "Password updated successfully" });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

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
          <div style="
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            padding: 40px 20px;
            color: #333;
          ">
            <div style="
              max-width: 500px;
              margin: auto;
              background: #ffffff;
              padding: 40px 30px;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              text-align: center;
            ">
              <h1 style="
                margin-bottom: 10px;
                font-size: 28px;
                color: #111827;
              ">
                Vault
              </h1>
      
              <p style="
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
                margin-top: 20px;
              ">
                We received a request to reset your password.
              </p>
      
              <p style="
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
              ">
                Click the button below to set a new password.
              </p>
      
              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  margin-top: 25px;
                  padding: 14px 28px;
                  background-color: #111827;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: bold;
                "
              >
                Reset Password
              </a>
      
              <p style="
                margin-top: 30px;
                font-size: 14px;
                color: #6b7280;
                line-height: 1.6;
              ">
                This link will expire in 15 minutes.
              </p>
      
              <p style="
                margin-top: 10px;
                font-size: 13px;
                color: #9ca3af;
                line-height: 1.6;
              ">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
    });
  }

  return res.status(200).json({
    message:
      "If an account exists with this email, a reset link has been sent.",
  });
};

export const resetPassword = async (req, res) => {
  const { token, newPassword: password } = req.body;

  if (!token)
    return res.status(400).json({ message: "Invalid or missing token" });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  console.log(hashedToken);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(401).json({ message: "Reset Token Invalid or Expired" });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();

  return res.status(200).json({ message: "Password updated successfully" });
};
