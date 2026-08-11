import crypto from "crypto";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import User from "../models/userModel.js";
import { cacheDel } from "../databases/redis.js";
import { BACKEND_URL } from "../config/config.js";

export const generateShareLinkLogic = async ({ items, permissions, expiresAt, userId }) => {
  // Ensure permission is valid, default to ["read"]
  let cleanPermission = ["read"];
  if (Array.isArray(permissions)) {
    const allowed = ["read", "write", "owner"];
    const filtered = permissions.filter((p) => allowed.includes(p));
    if (filtered.length > 0) {
      cleanPermission = filtered;
    }
  }

  let cleanItems = [];
  if (Array.isArray(items)) {
    cleanItems = items
      .map((item) => ({
        id: String(item.id),
        type: String(item.type),
        provider: String(item.provider),
        name: String(item.name),
      }))
      .filter(
        (item) =>
          item.id &&
          item.type &&
          item.provider &&
          item.name &&
          ["file", "directory"].includes(item.type),
      );
  }

  const shareToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(shareToken)
    .digest("hex");

  const shareLink = await ShareLink.create({
    userId: userId,
    token: hashedToken,
    permission: cleanPermission,
    items: cleanItems,
    expiresAt: expiresAt
      ? new Date(expiresAt)
      : Date.now() + 24 * 60 * 60 * 1000,
  });

  return {
    message: "Share link generated successfully",
    token: shareToken,
  };
};

export const getShareLinksLogic = async ({ userId }) => {
  const shareLinks = await ShareLink.find({ userId: userId }).lean();

  // TODO: Fetch active share links for this user from ShareLink collection
  return { links: shareLinks };
};

export const revokeShareLinkLogic = async ({ linkId, userId }) => {
  const sharedLink = await ShareLink.findOne({
    _id: linkId,
    userId: userId,
  });
  if (!sharedLink) {
    const err = new Error("Share link not found");
    err.statusCode = 404;
    throw err;
  }

  const affectedAccesses = await SharedAccess.find({ grantedBy: linkId })
    .select("userId targetUserId")
    .lean();

  await ShareLink.deleteOne({ _id: linkId });
  await SharedAccess.deleteMany({ grantedBy: linkId });

  for (const access of affectedAccesses) {
    await cacheDel(`share:${access.userId}:${access.targetUserId}`);
  }

  // TODO: Find the link by ID, set isRevoked to true, and delete associated SharedAccess records
  return {
    message: "Share link and all associated shared access revoked successfully",
  };
};

export const getShareLinkByTokenLogic = async ({ token }) => {
  // TODO: Hash the token, find the ShareLink in DB, check expiration/revocation, and populate owner details
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken });
  const owner = await User.findById(shareLink.userId).lean();

  // Fake response for UI testing
  return {
    owner: {
      name: owner.name || "John Doe",
      email: owner.email || "dummy@example.com",
      profilepic: owner.profilepic
        ? owner.profilepic.externalUrl
          ? owner.profilepic.externalUrl
          : `${BACKEND_URL}/user/profilepic?id=${owner.profilepic._id}`
        : null,
    },
    permission: shareLink ? shareLink.permission : ["read"],
    items: shareLink ? shareLink.items : [],
    expiresAt: shareLink
      ? shareLink.expiresAt
      : new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
};

export const claimShareAccessLogic = async ({ token, userId, userRole }) => {
  if (userRole === "Owner") {
    return {
      message: "You are the owner of this link, no need to claim access",
    };
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken });

  if (!shareLink) {
    const err = new Error("Share link not found or has been revoked");
    err.statusCode = 404;
    throw err;
  }

  const sharedAccess = await SharedAccess.updateOne(
    {
      userId: shareLink.userId,
      targetUserId: userId,
      grantedBy: shareLink._id,
    },
    {
      $set: {
        permission: shareLink.permission,
        expiresAt: shareLink.expiresAt
          ? shareLink.expiresAt
          : new Date(Date.now() + 24 * 60 * 60 * 1000),
        items: shareLink.items || [],
      },
    },
    {
      upsert: true,
    },
  );

  await cacheDel(`share:${shareLink.userId}:${userId}`);

  // TODO: Validate token, check if user is not the owner, and upsert a SharedAccess record
  return {
    message: "Access granted successfully",
    access: { sharedAccess },
  };
};

export const getSharedDrivesLogic = async ({ userId }) => {
  const sharedAccesses = await SharedAccess.find({ targetUserId: userId })
    .populate("userId", "name email profilepic rootDirId")
    .lean();
  console.log(sharedAccesses);

  // TODO: Fetch all SharedAccess records where targetUserId is the current user, and populate ownerId
  return { sharedAccesses: sharedAccesses };
};
