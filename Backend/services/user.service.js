import mongoose from "mongoose";
import path from "node:path";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { sanitize } from "../utils/sanitize.js";
import {
  uploadToB2,
  deleteFromB2,
  getObjectFromB2,
} from "../integrations/storage/s3.client.js";

export const getUserProfile = async ({ userId, user }) => {
  try {
    const rootDir = await Directory.findOne({ _id: user.rootDirId })
      .select("-_id size")
      .lean();
    const usedStorage = rootDir ? rootDir.size : 0;

    return {
      name: user.name,
      email: user.email,
      role: user.role || "User",
      profilepic: user.profilepic,
      maxStorage: user.maxStorage,
      rootDirId: user.rootDirId,
      rootDirectoryId: user.rootDirId,
      usedStorage,
      theme: user.theme || "dark",
      integrations: {
        googleDrive: { connected: !!user.integrations?.googleDrive?.connected },
        github: { connected: !!user.integrations?.github?.connected },
      },
    };
  } catch (err) {
    console.error("getUser error:", err);
    const e = new Error("Internal Server Error");
    e.status = 500;
    throw e;
  }
};

export const uploadProfilePicLogic = async ({ userId, req }) => {
  const user = await User.findOne({ _id: userId })
    .select("rootDirId profilepic")
    .lean();

  if (!user) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }

  const fileName = sanitize(req.headers.filename);
  const ext = path.extname(fileName);

  const profilePicId = new mongoose.Types.ObjectId();

  const newProfilePic = {
    _id: profilePicId,
    extension: ext,
    type: "file",
    userId,
    name: fileName,
    parentDir: null,
  };

  await File.create(newProfilePic);

  if (user.profilepic) {
    const oldProfilePic = await File.findOne({ _id: user.profilepic })
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
    await invalidateUserSessions(userId);

    return { message: "Profile pic updated" };
  } catch (err) {
    console.error("Profile pic upload error:", err);
    const e = new Error("Internal Server Error");
    e.status = 500;
    throw e;
  }
};

export const getProfilePicLogic = async ({
  userId,
  targetUserId,
  userRole,
  res,
}) => {
  const profilePicId = targetUserId || userId;

  if (!profilePicId) {
    const e = new Error("No profile pic set");
    e.status = 404;
    throw e;
  }

  const profilePic = await File.findOne({ _id: profilePicId })
    .select("extension externalUrl userId")
    .lean();

  if (!profilePic) {
    const e = new Error("Profile pic not found");
    e.status = 404;
    throw e;
  }

  if (targetUserId && targetUserId !== userId?.toString()) {
    const hierarchy = ["User", "Manager", "Admin", "Owner"];
    const userRoleIndex = hierarchy.indexOf(userRole || "User");

    const hasAccess =
      (await SharedAccess.findOne({
        userId: profilePic.userId,
        targetUserId: userId,
      })) ||
      (await ShareLink.findOne({
        userId: profilePic.userId,
        targetUserId: userId,
      }));

    if (!hasAccess && userRoleIndex <= 0) {
      const e = new Error("Unauthorized");
      e.status = 403;
      throw e;
    }
  }

  if (profilePic.externalUrl) {
    return res.redirect(profilePic.externalUrl);
  }

  try {
    const s3Response = await getObjectFromB2({
      key: `${profilePic._id.toString()}${profilePic.extension}`,
    });
    res.setHeader("Content-Type", s3Response.ContentType || "image/png");
    return s3Response.Body.pipe(res);
  } catch (s3Err) {
    console.error("Failed to fetch profile pic from B2:", s3Err);
    const e = new Error("Profile pic file not found");
    e.status = 404;
    throw e;
  }
};

export const getSearchedItems = ({ user }) => {
  return user.recentlySearchedItems || [];
};

export const storeSearchedItem = async ({ userId, item }) => {
  const searchItem = typeof item === "string" ? sanitize(item) : item;

  try {
    const user = await User.findOne({ _id: userId })
      .select("recentlySearchedItems")
      .lean();

    if (!user) {
      const e = new Error("User not found");
      e.status = 404;
      throw e;
    }

    let recentlySearchedItems = user.recentlySearchedItems || [];

    if (!searchItem || searchItem.trim() === "") {
      recentlySearchedItems = [];
      await User.updateOne(
        { _id: user._id },
        { $set: { recentlySearchedItems } },
      );
      return { msg: "Search history cleared", status: 200 };
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
    return { msg: "Succesfully Stored Searched Item", status: 201 };
  } catch (err) {
    console.error(err);
    const e = new Error("Internal Server Error");
    e.status = 500;
    throw e;
  }
};

export const updateThemeLogic = async ({ userId, theme }) => {
  if (!["light", "dark"].includes(theme)) {
    const e = new Error("Invalid theme");
    e.status = 400;
    throw e;
  }

  try {
    await User.updateOne({ _id: userId }, { $set: { theme } });
    await invalidateUserSessions(userId);
    return { message: "Theme updated successfully" };
  } catch (err) {
    console.error(err);
    const e = new Error("Internal Server Error");
    e.status = 500;
    throw e;
  }
};

export const updateNameLogic = async ({ userId, name }) => {
  const user = await User.findOne({ _id: userId });
  user.name = sanitize(name);
  await user.save();
  await invalidateUserSessions(userId);
  return { message: "Name update logged" };
};

export const updatePasswordLogic = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  console.log(`Password update request received`, {
    currentPassword,
    password: newPassword,
  });

  const user = await User.findOne({ _id: userId });

  if (!user.password) {
    user.password = newPassword;
    await user.save();
    return { message: "Password created successfully" };
  }

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    const e = new Error("Invalid current password");
    e.status = 404;
    throw e;
  }

  user.password = newPassword;
  await user.save();

  return { message: "Password updated successfully" };
};
