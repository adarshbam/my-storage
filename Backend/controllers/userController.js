import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { GOOGLE_CLIENT_ID } from "../config.js";
import {
  createSessionAndSetCookies,
  createUserWithRootDir,
} from "../utils/authHelpers.js";

// ─── User Info ──────────────────────────────────────────────────────────────────

export const getUser = (req, res) => {
  const user = req.user;
  return res.status(200).json({
    name: user.name,
    email: user.email,
    profilepic: user.profilepic,
    rootDirectoryId: user.rootDirId,
  });
};

// ─── Email/Password Registration ────────────────────────────────────────────────

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    await createUserWithRootDir({
      name: "user",
      email,
      password,
      profilepicId: null,
      isVerified: true,
    });
    return res.status(201).json({ message: "Registered" });
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
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select(
      "password rootDirId name isVerified",
    );

    if (!user) {
      return res.status(404).json({ error: "Email not registered" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ error: "Please verify your account before logging in." });
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
      const rootDir = await Directory.findOne({ _id: existingUser.rootDirId })
        .select("_id")
        .lean();
      if (!rootDir) {
        return res.status(500).json({ error: "Internal Server Error" });
      }

      await createSessionAndSetCookies(
        existingUser._id,
        rootDir._id,
        req,
        res,
      );

      return res
        .status(200)
        .json({ message: `Login successful ${existingUser.name}` });
    }

    // ── New user → register + log them in ────────────────────────────────────

    // Create a File document for the Google profile pic (external URL)
    let profilepicId = null;
    if (picture) {
      const profilePicFile = await File.create({
        name: "google-profile-pic",
        userId: null, // will be updated after user creation
        parentDir: null,
        type: "file",
        extension: "",
        externalUrl: picture,
      });
      profilepicId = profilePicFile._id;
    }

    const randomPassword = crypto.randomBytes(16).toString("hex");

    const { userId, rootDirId } = await createUserWithRootDir({
      name: name || "User",
      email,
      password: randomPassword,
      profilepicId,
      isVerified: true, // Google already verified their email
    });

    // Link the profile pic File document to the newly created user
    if (profilepicId) {
      await File.updateOne({ _id: profilepicId }, { $set: { userId } });
    }

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

// ─── Logout ─────────────────────────────────────────────────────────────────────

export const logoutUser = async (req, res) => {
  const { sessionId } = req.signedCookies;

  await Session.deleteOne({ _id: sessionId });
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
    const userId = req.user._id;
    await Session.deleteMany({ userId });
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
};

// ─── Profile Pic ────────────────────────────────────────────────────────────────

export const uploadProfilePic = async (req, res) => {
  const user = await User.findOne({ _id: req.user.id })
    .select("rootDirId profilepic")
    .lean();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const fileName = req.headers.filename;
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

  const filePath = `./storage/${profilePicId.toString()}${ext}`;

  // Clean up old profile pic (local file or external URL doc)
  if (user.profilepic) {
    const oldProfilePic = await File.findOne({
      _id: user.profilepic,
    })
      .select("extension externalUrl")
      .lean();
    if (oldProfilePic) {
      await File.deleteOne({ _id: oldProfilePic._id });
      // Only remove local file if it's not an external URL
      if (!oldProfilePic.externalUrl) {
        await rm(
          `./storage/${oldProfilePic._id.toString()}${oldProfilePic.extension}`,
        ).catch(() => {});
      }
    }
  }

  const writeStream = createWriteStream(filePath);

  try {
    await User.updateOne(
      { _id: user._id },
      { $set: { profilepic: profilePicId } },
    );

    writeStream.on("finish", () => {
      return res.status(200).json({ message: "Profile pic updated" });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  req.pipe(writeStream);
};

export const getProfilePic = async (req, res) => {
  if (!req.user.profilepic) {
    return res.status(404).send("No profile pic set");
  }
  const profilePic = await File.findOne({ _id: req.user.profilepic })
    .select("extension externalUrl")
    .lean();

  if (!profilePic) {
    return res.status(404).send("Profile pic not found");
  }

  // If it's an external URL (e.g. Google avatar), redirect to it
  if (profilePic.externalUrl) {
    return res.redirect(profilePic.externalUrl);
  }

  const filePath = path.resolve(
    `./storage/${profilePic._id.toString()}${profilePic.extension}`,
  );
  return res.status(200).sendFile(filePath);
};

// ─── Search History ─────────────────────────────────────────────────────────────

export const getSearchedItems = (req, res) => {
  return res.status(200).json(req.user.recentlySearchedItems || []);
};

export const storeSearchedItem = async (req, res) => {
  const { searchItem } = req.body;

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
