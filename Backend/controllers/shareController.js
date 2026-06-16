import crypto from "crypto";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import User from "../models/userModel.js";
import { cacheDel } from "../utils/redis.js";
import { BACKEND_URL } from "../config.js";

export const generateShareLink = async (req, res) => {
  const { expiresAt, permission, items } = req.body;

  // Ensure permission is valid, default to ["read"]
  let cleanPermission = ["read"];
  if (Array.isArray(permission)) {
    const allowed = ["read", "write", "owner"];
    const filtered = permission.filter((p) => allowed.includes(p));
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
          ["file", "directory"].includes(item.type)
      );
  }

  const shareToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(shareToken)
    .digest("hex");

  const shareLink = await ShareLink.create({
    userId: req.user.id,
    token: hashedToken,
    permission: cleanPermission,
    items: cleanItems,
    expiresAt: expiresAt
      ? new Date(expiresAt)
      : Date.now() + 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    message: "Share link generated successfully",
    token: shareToken,
  });
};

export const getShareLinks = async (req, res) => {
  const shareLinks = await ShareLink.find({ userId: req.user.id }).lean();

  // TODO: Fetch active share links for this user from ShareLink collection
  return res.status(200).json({ links: shareLinks });
};

export const revokeShareLink = async (req, res) => {
  const { linkId } = req.params;

  const sharedLink = await ShareLink.findOne({
    _id: linkId,
    userId: req.user.id,
  });
  if (!sharedLink) {
    return res.status(404).json({ error: "Share link not found" });
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
  return res.status(200).json({
    message: "Share link and all associated shared access revoked successfully",
  });
};

export const getShareLinkByToken = async (req, res) => {
  const { token } = req.params;

  // TODO: Hash the token, find the ShareLink in DB, check expiration/revocation, and populate owner details
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken });
  const owner = await User.findById(shareLink.userId).lean();

  // Fake response for UI testing
  return res.status(200).json({
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
  });
};

export const claimShareAccess = async (req, res) => {
  const { token } = req.params;

  if (req.user.role === "Owner") {
    return res.status(200).json({
      message: "You are the owner of this link, no need to claim access",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken });

  if (!shareLink) {
    return res
      .status(404)
      .json({ error: "Share link not found or has been revoked" });
  }

  const sharedAccess = await SharedAccess.updateOne(
    {
      userId: shareLink.userId,
      targetUserId: req.user.id,
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

  await cacheDel(`share:${shareLink.userId}:${req.user.id}`);

  // TODO: Validate token, check if user is not the owner, and upsert a SharedAccess record
  return res.status(200).json({
    message: "Access granted successfully",
    access: { sharedAccess },
  });
};

export const getSharedDrives = async (req, res) => {
  const sharedAccesses = await SharedAccess.find({ targetUserId: req.user.id })
    .populate("userId", "name email profilepic rootDirId")
    .lean();
  console.log(sharedAccesses);

  // TODO: Fetch all SharedAccess records where targetUserId is the current user, and populate ownerId
  return res.status(200).json({ sharedAccesses: sharedAccesses });
};
