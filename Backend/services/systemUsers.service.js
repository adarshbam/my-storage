import { rm } from "node:fs/promises";
import path from "node:path";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { BACKEND_URL } from "../config/config.js";
import { deleteFromB2 } from "../integrations/storage/s3.client.js";
import { withTransaction } from "../utils/transaction.js";

const hierarchy = ["User", "Manager", "Admin", "Owner"];

export const getAllSystemUsersLogic = async ({ requestingUser }) => {
  console.log("GET /users called");

  if (!requestingUser?.role || requestingUser.role === "User") {
    const e = new Error("Access denied");
    e.status = 403;
    e.redirect = "/";
    throw e;
  }

  const [allUsers, allSessions, allBillingPlans] = await Promise.all([
    User.find()
      .populate("profilepic")
      .populate({
        path: "subscription",
        populate: { path: "billingPlan" },
      })
      .populate("billingPlan")
      .lean(),
    Session.find().lean(),
    BillingPlan.find().lean(),
  ]);

  const allSessionsUserId = allSessions.map(({ userId }) => userId.toString());
  const allSessionsUserIdSet = new Set(allSessionsUserId);

  const planMap = new Map(allBillingPlans.map((p) => [p._id.toString(), p]));
  const defaultFreePlan =
    allBillingPlans.find(
      (p) => p.slug === "free-trial" || p.slug === "free-trail" || p.amount === 0
    ) || allBillingPlans[0];
  const defaultStorage = defaultFreePlan?.storage || 5368709120; // 5 GB default

  const rootDirIds = allUsers.map((u) => u.rootDirId).filter(Boolean);
  const rootDirs = await Directory.find({ _id: { $in: rootDirIds } })
    .select("_id size")
    .lean();
  const rootDirMap = new Map(rootDirs.map((d) => [d._id.toString(), d.size || 0]));

  const userHierarchy = hierarchy.indexOf(requestingUser.role ?? "User");
  const yourAuthority = hierarchy.slice(0, userHierarchy);

  const transformedUsers = allUsers.map((user) => {
    let resolvedPic = null;
    if (user.profilepic) {
      if (typeof user.profilepic === "object" && user.profilepic._id) {
        resolvedPic =
          user.profilepic.externalUrl ||
          `${BACKEND_URL}/user/profilepic?id=${user.profilepic._id}`;
      } else if (typeof user.profilepic === "string") {
        resolvedPic = user.profilepic.startsWith("http")
          ? user.profilepic
          : `${BACKEND_URL}/user/profilepic?id=${user.profilepic}`;
      } else if (user.profilepic) {
        resolvedPic = `${BACKEND_URL}/user/profilepic?id=${user.profilepic.toString()}`;
      }
    }

    // Dynamic maxStorage resolution based on user's plan and subscription
    let userMaxStorage = 0;
    let planSlug = "free-trial";

    if (user.status === "Terminated") {
      userMaxStorage = 0;
      planSlug = "Terminated";
    } else {
      const sub = user.subscription;
      if (
        sub &&
        ["active", "paused", "authenticated", "created"].includes(
          sub.status?.toLowerCase()
        )
      ) {
        const subPlanId =
          sub.billingPlan?._id?.toString() || sub.billingPlan?.toString();
        const planDoc =
          planMap.get(subPlanId) ||
          (typeof sub.billingPlan === "object" ? sub.billingPlan : null);
        if (planDoc?.storage) {
          userMaxStorage = planDoc.storage;
          planSlug = planDoc.slug || "Subscribed";
        } else if (sub.isFreeTrial) {
          userMaxStorage = defaultStorage;
          planSlug = "free-trial";
        }
      }

      if (!userMaxStorage && user.billingPlan) {
        const bpId =
          user.billingPlan._id?.toString() || user.billingPlan.toString();
        const planDoc =
          planMap.get(bpId) ||
          (typeof user.billingPlan === "object" ? user.billingPlan : null);
        if (planDoc?.storage) {
          userMaxStorage = planDoc.storage;
          planSlug = planDoc.slug || "Custom Plan";
        }
      }

      if (!userMaxStorage && user.maxStorage) {
        userMaxStorage = user.maxStorage;
      }

      if (!userMaxStorage) {
        userMaxStorage = defaultStorage;
      }
    }

    return {
      _id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      avatar: user.name?.slice(0, 1)?.toUpperCase() || "U",
      profilepic: resolvedPic,
      status: user.status || "Active",
      yourAuthority,
      rootDirId: user.rootDirId?.toString() || null,
      isLoggedIn: allSessionsUserIdSet.has(user._id.toString()),
      maxStorage: userMaxStorage,
      usedStorage: user.rootDirId
        ? rootDirMap.get(user.rootDirId.toString()) || 0
        : 0,
      planSlug,
    };
  });

  return transformedUsers;
};

export const deleteSystemUserLogic = async ({ targetId, deleteType, requestingUser }) => {
  console.log("deleteSystemUserLogic:", { targetId, deleteType });

  if (requestingUser.id === targetId) {
    const e = new Error("You cannot delete or terminate yourself");
    e.status = 403;
    throw e;
  }

  const userToDelete = await User.findOne({ _id: targetId });
  if (!userToDelete) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }

  const newRoleHierarchy = hierarchy.indexOf(userToDelete.role);
  const userHierarchy = hierarchy.indexOf(requestingUser.role);

  if (newRoleHierarchy < userHierarchy && userHierarchy >= 2) {
    if (deleteType === "soft") {
      userToDelete.status = "Deleted";
      await userToDelete.save();
      await Session.deleteMany({ userId: targetId });
      await invalidateUserSessions(targetId);
      console.log("Soft Delete applied (status: Deleted)");
      return { message: "User account deactivated successfully" };
    }

    // ── Hard Delete / Permanent Termination ──
    // 1. Delete all user files & thumbnails from B2
    const files = await File.find({ userId: targetId });
    for (const file of files) {
      try {
        if (file.extension) {
          await deleteFromB2({ key: `${file._id.toString()}${file.extension}` });
        }
        await deleteFromB2({ key: `thumbnails/${file._id.toString()}.jpg` });
      } catch (b2Err) {
        console.warn("B2 file cleanup error:", b2Err.message);
      }
    }

    // 2. Delete user's avatar from B2 if any
    if (userToDelete.profilepic) {
      try {
        const picFile = await File.findById(userToDelete.profilepic);
        if (picFile && picFile.extension) {
          await deleteFromB2({ key: `${picFile._id.toString()}${picFile.extension}` });
        }
      } catch (picErr) {
        console.warn("B2 avatar cleanup error:", picErr.message);
      }
    }

    // 3. Purge database records while RETAINING User email with status="Terminated"
    await withTransaction(async (session) => {
      await File.deleteMany({ userId: targetId }).session(session);
      await Directory.deleteMany({ userId: targetId }).session(session);
      await Session.deleteMany({ userId: targetId }).session(session);
      await ShareLink.deleteMany({ userId: targetId }).session(session);
      await SharedAccess.deleteMany({
        $or: [{ userId: targetId }, { recipientEmail: userToDelete.email }],
      }).session(session);

      // Permanently mark user as Terminated and strip all credentials & vaults
      userToDelete.status = "Terminated";
      userToDelete.password = null;
      userToDelete.resetPasswordToken = null;
      userToDelete.twoFactorEnabled = false;
      userToDelete.twoFactorSecret = null;
      userToDelete.twoFactorRecoveryCodes = [];
      userToDelete.phone = null;
      userToDelete.phoneVerified = false;
      userToDelete.secondaryRecoveryEmail = null;
      userToDelete.secondaryRecoveryEmailVerified = false;
      userToDelete.profilepic = null;
      userToDelete.integrations = { googleDrive: {}, github: {} };
      userToDelete.billingPlan = null;
      userToDelete.subscription = null;
      userToDelete.recentlySearchedItems = [];
      userToDelete.rootDirId = null;

      await userToDelete.save({ session });
    });

    await invalidateUserSessions(targetId);
    console.log("Permanent termination complete. Email preserved as Terminated.");
    return { message: "User account permanently terminated" };
  }

  const e = new Error("Not Authorised");
  e.status = 403;
  throw e;
};

export const forceLogoutUserLogic = async ({ targetId, requestingUser }) => {
  if (requestingUser.id === targetId) {
    const e = new Error("You cannot logout yourself from here");
    e.status = 403;
    throw e;
  }

  const userToLogout = await User.findOne({ _id: targetId });
  if (!userToLogout) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }

  const newRoleHierarchy = hierarchy.indexOf(userToLogout.role);
  const userHierarchy = hierarchy.indexOf(requestingUser.role);

  if (newRoleHierarchy < userHierarchy && userHierarchy >= 1) {
    await Session.deleteMany({ userId: targetId });
    await invalidateUserSessions(targetId);
    return { message: "User logged out successfully" };
  }

  const e = new Error("Not Authorised");
  e.status = 403;
  throw e;
};

export const updateSystemUserRoleLogic = async ({ targetId, newRole, requestingUser }) => {
  if (requestingUser.id === targetId) {
    const e = new Error("You cannot change your own roles");
    e.status = 403;
    throw e;
  }

  const userUpdate = await User.findOne({ _id: targetId });
  if (!userUpdate) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }

  if (userUpdate.status === "Terminated") {
    const e = new Error("Cannot change role of a permanently terminated account");
    e.status = 400;
    throw e;
  }

  const newRoleHierarchy = hierarchy.indexOf(newRole);
  const userHierarchy = hierarchy.indexOf(requestingUser.role);
  const userToUpdateHierarchy = hierarchy.indexOf(userUpdate.role);

  if (newRoleHierarchy < userHierarchy && userToUpdateHierarchy < userHierarchy) {
    userUpdate.role = newRole;
    await userUpdate.save();
    await invalidateUserSessions(targetId);
    return { message: "Role update request logged" };
  }
  const e = new Error("Not Authorised");
  e.status = 403;
  throw e;
};

export const reactivateSystemUserLogic = async ({ targetId, requestingUser }) => {
  if (requestingUser.role !== "Owner") {
    const e = new Error("Not Authorised");
    e.status = 403;
    throw e;
  }
  const userToReactivate = await User.findOne({ _id: targetId });
  if (!userToReactivate) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }
  if (userToReactivate.status === "Terminated") {
    const e = new Error("Permanently terminated accounts cannot be reactivated");
    e.status = 400;
    throw e;
  }
  userToReactivate.status = "Active";
  await userToReactivate.save();
  await invalidateUserSessions(targetId);
  return { message: "Account reactivated successfully" };
};
