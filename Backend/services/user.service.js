import mongoose from "mongoose";
import path from "node:path";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import SystemConfig from "../models/systemConfigModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { sanitize } from "../utils/sanitize.js";
import {
  uploadToB2,
  deleteFromB2,
  getObjectFromB2,
} from "../integrations/storage/s3.client.js";
import { processThumbnailInWorker } from "./workerPool.service.js";
import { withTransaction } from "../utils/transaction.js";

export const getUserProfile = async ({ userId, user }) => {
  try {
    // 1. Fetch fresh user and active subscription from database
    const freshUser = await User.findById(userId || user?._id || user?.id)
      .populate({
        path: "subscription",
        populate: { path: "billingPlan" },
      })
      .lean();

    const currentUser = freshUser || user;

    const rootDir = await Directory.findOne({ _id: currentUser.rootDirId })
      .select("-_id size")
      .lean();
    const usedStorage = rootDir ? rootDir.size : 0;

    let maxStorage = currentUser.maxStorage || 5368709120;
    const sub = currentUser.subscription;
    if (
      sub &&
      ["active", "paused", "authenticated"].includes(
        sub.status?.toLowerCase(),
      )
    ) {
      const slug = sub.billingPlan?.slug?.replace("trail", "trial");
      const isTrial = Boolean(sub.isFreeTrial || slug === "free-trial");
      if (isTrial) {
        let freeTrialPlanDoc = null;
        if (sub.billingPlan?._id) {
          freeTrialPlanDoc = await BillingPlan.findById(sub.billingPlan._id).lean();
        }
        if (!freeTrialPlanDoc) {
          freeTrialPlanDoc =
            (await BillingPlan.findOne({
              slug: { $in: ["free-trial", "free-trail"] },
              active: true,
            }).lean()) ||
            (await BillingPlan.findOne({
              slug: { $in: ["free-trial", "free-trail"] },
            }).lean()) ||
            sub.billingPlan;
        }
        maxStorage =
          freeTrialPlanDoc?.storage ||
          sub.billingPlan?.storage ||
          5368709120;
      } else if (sub.billingPlan) {
        let freshBillingPlan = null;
        if (sub.billingPlan?._id) {
          freshBillingPlan = await BillingPlan.findById(sub.billingPlan._id).lean();
        }
        maxStorage = freshBillingPlan?.storage || sub.billingPlan.storage || 5368709120;
      }
    }

    return {
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || null,
      phoneVerified: !!currentUser.phoneVerified,
      secondaryRecoveryEmail: currentUser.secondaryRecoveryEmail || null,
      secondaryRecoveryEmailVerified: !!currentUser.secondaryRecoveryEmailVerified,
      twoFactorEnabled: !!currentUser.twoFactorEnabled,
      role: currentUser.role || "User",
      profilepic: currentUser.profilepic,
      maxStorage,
      rootDirId: currentUser.rootDirId,
      rootDirectoryId: currentUser.rootDirId,
      usedStorage,
      theme: currentUser.theme || "dark",
      integrations: {
        googleDrive: { connected: !!currentUser.integrations?.googleDrive?.connected },
        github: { connected: !!currentUser.integrations?.github?.connected },
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

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBuffer = Buffer.concat(chunks);
    let finalBuffer = rawBuffer;
    let finalContentType = req.headers["content-type"] || "image/png";

    try {
      const workerRes = await processThumbnailInWorker({
        type: "image",
        buffer: rawBuffer,
        width: 256,
        height: 256,
        quality: 80,
      });
      finalBuffer = workerRes.data;
      finalContentType = "image/webp";
    } catch (compressErr) {
      console.warn("Avatar worker compression fallback:", compressErr.message);
    }

    await uploadToB2({
      key: `${profilePicId.toString()}${ext}`,
      body: finalBuffer,
      contentType: finalContentType,
    });

    let oldProfilePic = null;
    if (user.profilepic) {
      oldProfilePic = await File.findOne({ _id: user.profilepic })
        .select("extension externalUrl")
        .lean();
    }

    await withTransaction(async (session) => {
      await File.create([newProfilePic], { session });

      if (oldProfilePic) {
        await File.deleteOne({ _id: oldProfilePic._id }).session(session);
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { profilepic: profilePicId } },
        { session },
      );
    });

    if (oldProfilePic && !oldProfilePic.externalUrl) {
      try {
        await deleteFromB2({
          key: `${oldProfilePic._id.toString()}${oldProfilePic.extension}`,
        });
      } catch (delErr) {
        console.warn("Failed to delete old avatar from B2:", delErr.message);
      }
    }

    await invalidateUserSessions(userId);

    return { message: "Profile pic updated" };
  } catch (err) {
    console.error("Profile pic upload error:", err);
    if (err.status) throw err;
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

  let profilePic = null;
  if (mongoose.Types.ObjectId.isValid(profilePicId)) {
    profilePic = await File.findOne({ _id: profilePicId })
      .select("extension externalUrl userId")
      .lean();
  }

  // If not found by File _id, profilePicId may be a User _id
  if (!profilePic && mongoose.Types.ObjectId.isValid(profilePicId)) {
    const userDoc = await User.findById(profilePicId).select("profilepic").lean();
    if (userDoc?.profilepic) {
      profilePic = await File.findOne({ _id: userDoc.profilepic })
        .select("extension externalUrl userId")
        .lean();
    }
  }

  if (!profilePic) {
    const e = new Error("Profile pic not found");
    e.status = 404;
    throw e;
  }

  // If legacy externalUrl exists, auto-migrate to B2 on-the-fly
  if (profilePic.externalUrl) {
    try {
      const resp = await fetch(profilePic.externalUrl);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const cType = resp.headers.get("content-type") || "image/jpeg";
        const ext = cType.includes("png") ? ".png" : (cType.includes("webp") ? ".webp" : ".jpg");
        const key = `${profilePic._id.toString()}${ext}`;
        await uploadToB2({
          key,
          body: buf,
          contentType: cType,
        });
        await File.updateOne(
          { _id: profilePic._id },
          { $set: { extension: ext, externalUrl: null, size: buf.length } }
        );
        profilePic.extension = ext;
        profilePic.externalUrl = null;
      }
    } catch (migErr) {
      console.warn("Failed to auto-migrate legacy externalUrl avatar to B2:", migErr);
      return res.redirect(profilePic.externalUrl);
    }
  }

  try {
    const s3Response = await getObjectFromB2({
      key: `${profilePic._id.toString()}${profilePic.extension}`,
    });
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
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
