import crypto from "crypto";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import User from "../models/userModel.js";

export const generateShareLink = async (req, res) => {
  const { expiresAt } = req.body;

  // TODO: Add logic to generate a unique token, hash it, and save to ShareLink collection

  const shareToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(shareToken)
    .digest("hex");

  const shareLink = await ShareLink.create({
    userId: req.user.id,
    token: hashedToken,
    permission: ["read"],
    expiresAt: expiresAt
      ? new Date(expiresAt)
      : Date.now() + 24 * 60 * 60 * 1000,
  });

  // Fake response to keep frontend happy
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

  await ShareLink.deleteOne({ _id: linkId });
  await SharedAccess.deleteMany({ grantedBy: linkId });

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
          : `https://localhost:4000/user/profilepic?id=${owner.profilepic._id}`
        : null,
    },
    permission: shareLink ? shareLink.permission : ["read"],
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
      },
    },
    {
      upsert: true,
    },
  );

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
