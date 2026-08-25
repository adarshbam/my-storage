import crypto from "crypto";
import argon2 from "argon2";
import ShareLink from "../models/shareLinkModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { populateDirectoryItemCounts } from "./directory.service.js";
import { cacheDel } from "../databases/redis.js";
import { BACKEND_URL } from "../config/config.js";
import { s3Client } from "../integrations/storage/s3.client.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const generateShareLinkLogic = async ({
  items,
  permissions,
  expiresAt,
  userId,
  password,
  hasPassword,
  accessType,
  title,
  maxDownloads,
  planContext,
}) => {
  if (planContext?.rules?.permissions?.allowSharing === false) {
    const err = new Error("Link sharing is disabled for your current plan tier.");
    err.statusCode = 403;
    err.code = "FEATURE_NOT_PERMITTED";
    throw err;
  }

  const activeFeatures = planContext?.features || [];
  const checkFeature = (key) =>
    activeFeatures.some(
      (f) => (f.key === key || f.slug === key || f.name === key) && f.enabled !== false,
    );

  const isProtected = Boolean(hasPassword && password && password.trim().length > 0);
  if (isProtected && planContext && !checkFeature("password_links")) {
    const err = new Error("Password-protected links are not available on your current plan.");
    err.statusCode = 403;
    err.code = "FEATURE_NOT_PERMITTED";
    throw err;
  }

  const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
  if (parsedExpiresAt && planContext && !checkFeature("expiring_links")) {
    const err = new Error("Expiring access links are not available on your current plan.");
    err.statusCode = 403;
    err.code = "FEATURE_NOT_PERMITTED";
    throw err;
  }

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
  if (Array.isArray(items) && items.length > 0) {
    const itemIds = items.map((i) => String(i.id || i._id));
    const [foundFiles, foundDirs] = await Promise.all([
      File.find({ _id: { $in: itemIds } }).select("_id name size extension provider").lean(),
      Directory.find({ _id: { $in: itemIds } }).select("_id name size provider").lean(),
    ]);

    const fileMap = new Map(foundFiles.map((f) => [f._id.toString(), f]));
    const dirMap = new Map(foundDirs.map((d) => [d._id.toString(), d]));

    cleanItems = items
      .map((item) => {
        const id = String(item.id || item._id);
        const type = String(item.type);
        const fileMeta = fileMap.get(id);
        const dirMeta = dirMap.get(id);

        return {
          id,
          type: ["file", "directory"].includes(type) ? type : "file",
          provider: String(item.provider || fileMeta?.provider || dirMeta?.provider || "local"),
          name: String(item.name || fileMeta?.name || dirMeta?.name || "Shared Item"),
          size: Number(item.size || fileMeta?.size || dirMeta?.size || 0),
          extension: String(item.extension || fileMeta?.extension || ""),
          mimeType: String(item.mimeType || ""),
        };
      })
      .filter((item) => item.id && item.type && item.name);
  }

  const shareToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(shareToken)
    .digest("hex");

  let hashedPassword = null;
  if (isProtected) {
    hashedPassword = await argon2.hash(password.trim());
  }

  const shareLink = await ShareLink.create({
    userId,
    token: hashedToken,
    permission: cleanPermission,
    items: cleanItems,
    expiresAt: parsedExpiresAt,
    isActive: true,
    hasPassword: isProtected,
    password: hashedPassword,
    accessType: ["restricted", "public"].includes(accessType) ? accessType : "restricted",
    title: title ? title.trim() : "",
    maxDownloads: maxDownloads ? Number(maxDownloads) : null,
    views: 0,
    downloads: 0,
  });

  const responseLink = shareLink.toObject();
  delete responseLink.password;

  return {
    message: "Share link generated successfully",
    token: shareToken,
    link: responseLink,
  };
};

export const getShareLinksLogic = async ({ userId }) => {
  const [shareLinks, user] = await Promise.all([
    ShareLink.find({ userId: userId }).sort({ createdAt: -1 }).lean(),
    User.findById(userId).select("usedStorage rootDirId").lean(),
  ]);

  const now = new Date();

  // Collect missing file/directory IDs to enrich sizes if needed
  const fileIds = [];
  const dirIds = [];
  shareLinks.forEach((link) => {
    (link.items || []).forEach((item) => {
      if (item.type === "file" && (!item.size || !item.extension)) {
        fileIds.push(item.id);
      } else if (item.type === "directory" && !item.size) {
        dirIds.push(item.id);
      }
    });
  });

  let fileMap = new Map();
  let dirMap = new Map();

  if (fileIds.length > 0) {
    const files = await File.find({ _id: { $in: fileIds } }).select("_id size extension hasThumbnail").lean();
    fileMap = new Map(files.map((f) => [f._id.toString(), f]));
  }
  if (dirIds.length > 0) {
    const dirs = await Directory.find({ _id: { $in: dirIds } }).select("_id size").lean();
    dirMap = new Map(dirs.map((d) => [d._id.toString(), d]));
  }

  const sanitizedLinks = shareLinks.map((link) => {
    const isExpired = Boolean(link.expiresAt && new Date(link.expiresAt) < now);
    const enrichedItems = (link.items || []).map((item) => {
      if (item.type === "file") {
        const meta = fileMap.get(item.id);
        return {
          ...item,
          size: item.size || meta?.size || 0,
          extension: item.extension || meta?.extension || "",
          hasThumbnail: meta?.hasThumbnail || false,
        };
      } else {
        const meta = dirMap.get(item.id);
        return {
          ...item,
          size: item.size || meta?.size || 0,
        };
      }
    });

    const isWholeVault = !enrichedItems || enrichedItems.length === 0;
    const computedSize = isWholeVault
      ? (user?.usedStorage || 0)
      : enrichedItems.reduce((acc, curr) => acc + (curr.size || 0), 0);

    const { password, ...safeLink } = link;
    return {
      ...safeLink,
      items: enrichedItems,
      size: computedSize,
      vaultSize: computedSize,
      isExpired,
      hasPassword: Boolean(link.hasPassword),
    };
  });

  return { links: sanitizedLinks };
};

export const toggleShareLinkActiveLogic = async ({ linkId, userId }) => {
  const sharedLink = await ShareLink.findOne({ _id: linkId, userId });
  if (!sharedLink) {
    const err = new Error("Share link not found");
    err.statusCode = 404;
    throw err;
  }

  sharedLink.isActive = !sharedLink.isActive;
  await sharedLink.save();

  return {
    message: `Share link is now ${sharedLink.isActive ? "active" : "disabled"}`,
    isActive: sharedLink.isActive,
    linkId: sharedLink._id,
  };
};

export const updateShareLinkLogic = async ({ linkId, userId, updateData }) => {
  const sharedLink = await ShareLink.findOne({ _id: linkId, userId });
  if (!sharedLink) {
    const err = new Error("Share link not found");
    err.statusCode = 404;
    throw err;
  }

  if (updateData.permission && Array.isArray(updateData.permission)) {
    const allowed = ["read", "write", "owner"];
    const filtered = updateData.permission.filter((p) => allowed.includes(p));
    if (filtered.length > 0) {
      sharedLink.permission = filtered;
    }
  }

  if (updateData.expiresAt !== undefined) {
    sharedLink.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
  }

  if (typeof updateData.isActive === "boolean") {
    sharedLink.isActive = updateData.isActive;
  }

  if (updateData.accessType && ["restricted", "public"].includes(updateData.accessType)) {
    sharedLink.accessType = updateData.accessType;
  }

  if (updateData.title !== undefined) {
    sharedLink.title = updateData.title ? updateData.title.trim() : "";
  }

  if (updateData.maxDownloads !== undefined) {
    sharedLink.maxDownloads = updateData.maxDownloads ? Number(updateData.maxDownloads) : null;
  }

  if (updateData.hasPassword === false) {
    sharedLink.hasPassword = false;
    sharedLink.password = null;
  } else if (updateData.password && updateData.password.trim().length > 0) {
    sharedLink.hasPassword = true;
    sharedLink.password = await argon2.hash(updateData.password.trim());
  }

  await sharedLink.save();

  const responseLink = sharedLink.toObject();
  delete responseLink.password;

  return {
    message: "Share link updated successfully",
    link: responseLink,
  };
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

  return {
    message: "Share link and all associated shared access revoked successfully",
  };
};

export const getShareLinkByTokenLogic = async ({ token, password }) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken }).lean();

  if (!shareLink) {
    const err = new Error("Share link not found or has been revoked");
    err.statusCode = 404;
    throw err;
  }

  if (!shareLink.isActive) {
    const err = new Error("This shared link has been disabled by its owner");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < now) {
    const err = new Error("This shared link has expired");
    err.statusCode = 410;
    throw err;
  }

  if (shareLink.maxDownloads && shareLink.downloads >= shareLink.maxDownloads) {
    const err = new Error("Download limit for this share link has been reached");
    err.statusCode = 403;
    throw err;
  }

  const owner = await User.findById(shareLink.userId).select("name email profilepic").lean();
  const profilepicId = owner?.profilepic?._id || owner?.profilepic;
  const ownerInfo = {
    name: owner?.name || "Vault Owner",
    email: owner?.email || "",
    profilepic: profilepicId
      ? (typeof owner.profilepic === "object" && owner.profilepic?.externalUrl)
        ? owner.profilepic.externalUrl
        : `${BACKEND_URL}/user/profilepic?id=${profilepicId}`
      : null,
  };

  // Check password protection
  if (shareLink.hasPassword && shareLink.password) {
    if (!password) {
      return {
        requiresPassword: true,
        hasPassword: true,
        title: shareLink.title || "Protected Vault Link",
        owner: ownerInfo,
        permission: shareLink.permission,
        expiresAt: shareLink.expiresAt,
        accessType: shareLink.accessType,
        itemCount: shareLink.items?.length || 0,
      };
    }

    const isValid = await argon2.verify(shareLink.password, password);
    if (!isValid) {
      const err = new Error("Invalid password for this shared link");
      err.statusCode = 401;
      throw err;
    }
  }

  // Increment views asynchronously
  ShareLink.updateOne({ _id: shareLink._id }, { $inc: { views: 1 } }).catch((e) =>
    console.error("Async view increment error:", e)
  );

  // Enrich item metadata
  let enrichedItems = shareLink.items || [];
  if (enrichedItems.length > 0) {
    const fileIds = enrichedItems.filter((i) => i.type === "file").map((i) => i.id);
    const dirIds = enrichedItems.filter((i) => i.type === "directory").map((i) => i.id);

    const [files, dirs] = await Promise.all([
      fileIds.length > 0
        ? File.find({ _id: { $in: fileIds } }).select("_id name size extension hasThumbnail").lean()
        : [],
      dirIds.length > 0
        ? Directory.find({ _id: { $in: dirIds } }).select("_id name size").lean()
        : [],
    ]);

    const fileMap = new Map(files.map((f) => [f._id.toString(), f]));
    const dirMap = new Map(dirs.map((d) => [d._id.toString(), d]));

    enrichedItems = enrichedItems.map((item) => {
      if (item.type === "file") {
        const meta = fileMap.get(item.id);
        return {
          ...item,
          name: meta?.name || item.name,
          size: meta?.size || item.size || 0,
          extension: meta?.extension || item.extension || "",
          hasThumbnail: meta?.hasThumbnail || false,
        };
      } else {
        const meta = dirMap.get(item.id);
        return {
          ...item,
          name: meta?.name || item.name,
          size: meta?.size || item.size || 0,
        };
      }
    });
  }

  return {
    requiresPassword: false,
    hasPassword: Boolean(shareLink.hasPassword),
    title: shareLink.title || "",
    owner: ownerInfo,
    permission: shareLink.permission || ["read"],
    items: enrichedItems,
    expiresAt: shareLink.expiresAt,
    accessType: shareLink.accessType || "restricted",
    views: (shareLink.views || 0) + 1,
    downloads: shareLink.downloads || 0,
    maxDownloads: shareLink.maxDownloads,
    createdAt: shareLink.createdAt,
    requiresFullAdminPlan: (shareLink.permission || []).includes("owner"),
    hasGithubItems: (shareLink.items || []).some((i) => i.provider === "github"),
    hasGdriveItems: (shareLink.items || []).some((i) => i.provider === "google_drive" || i.provider === "drive"),
    hasDropboxItems: (shareLink.items || []).some((i) => i.provider === "dropbox"),
  };
};

export const verifyShareLinkPasswordLogic = async ({ token, password }) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken });

  if (!shareLink) {
    const err = new Error("Share link not found or has been revoked");
    err.statusCode = 404;
    throw err;
  }

  if (!shareLink.isActive) {
    const err = new Error("This share link has been disabled by its owner");
    err.statusCode = 403;
    throw err;
  }

  if (!shareLink.hasPassword || !shareLink.password) {
    return { verified: true, message: "No password required" };
  }

  const isValid = await argon2.verify(shareLink.password, password);
  if (!isValid) {
    const err = new Error("Incorrect password");
    err.statusCode = 401;
    throw err;
  }

  return { verified: true, message: "Password verified successfully" };
};

export const downloadSharedFileLogic = async ({ token, itemId, password, res }) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const shareLink = await ShareLink.findOne({ token: hashedToken });

  if (!shareLink) {
    const err = new Error("Share link not found or has been revoked");
    err.statusCode = 404;
    throw err;
  }

  if (!shareLink.isActive) {
    const err = new Error("This shared link has been disabled");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < now) {
    const err = new Error("This shared link has expired");
    err.statusCode = 410;
    throw err;
  }

  if (shareLink.maxDownloads && shareLink.downloads >= shareLink.maxDownloads) {
    const err = new Error("Download limit reached");
    err.statusCode = 403;
    throw err;
  }

  if (shareLink.hasPassword && shareLink.password) {
    if (!password) {
      const err = new Error("Password is required to download this file");
      err.statusCode = 401;
      throw err;
    }
    const isValid = await argon2.verify(shareLink.password, password);
    if (!isValid) {
      const err = new Error("Incorrect password");
      err.statusCode = 401;
      throw err;
    }
  }

  const file = await File.findOne({ _id: itemId }).select("_id name size extension path userId").lean();
  if (!file) {
    const err = new Error("File not found");
    err.statusCode = 404;
    throw err;
  }

  // Increment download count asynchronously
  ShareLink.updateOne({ _id: shareLink._id }, { $inc: { downloads: 1 } }).catch((e) =>
    console.error("Async download increment error:", e)
  );

  const s3Key = `${file._id}${file.extension}`;
  const s3Params = {
    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
    Key: s3Key,
  };

  const command = new GetObjectCommand(s3Params);
  const s3Response = await s3Client.send(command);

  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");
  if (file.size) {
    res.setHeader("Content-Length", file.size);
  }

  s3Response.Body.pipe(res);
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

  if (!shareLink.isActive) {
    const err = new Error("This share link has been disabled by its owner");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  if (shareLink.expiresAt && new Date(shareLink.expiresAt) < now) {
    const err = new Error("This share link has expired");
    err.statusCode = 410;
    throw err;
  }

  const activeFeatures = planContext?.features || [];
  const checkFeature = (key) =>
    activeFeatures.some(
      (f) => (f.key === key || f.slug === key || f.name === key) && f.enabled !== false,
    );

  // 1. Full Admin Gating: Full Admin / Owner clearance requires an active subscription
  const isFullAdmin = (shareLink.permission || []).includes("owner");
  if (isFullAdmin && (planContext?.isNoPlan || planContext?.isReadOnly)) {
    const err = new Error("A storage subscription is required to access and claim Full Admin shared vaults. Please upgrade your plan.");
    err.statusCode = 403;
    err.code = "SUBSCRIPTION_REQUIRED";
    throw err;
  }

  // 2. External Integration Gating: GitHub & Google Drive items require Professional/Ultimate plans
  const hasGithubItems = (shareLink.items || []).some((item) => item.provider === "github");
  const hasGdriveItems = (shareLink.items || []).some((item) => item.provider === "google_drive" || item.provider === "drive");
  const hasDropboxItems = (shareLink.items || []).some((item) => item.provider === "dropbox");

  if (hasGithubItems && (planContext?.isNoPlan || !checkFeature("github_backup"))) {
    const err = new Error("Accessing shared GitHub repositories requires a Professional or Ultimate storage plan.");
    err.statusCode = 403;
    err.code = "PLAN_TIER_INSUFFICIENT";
    throw err;
  }

  if (hasGdriveItems && (planContext?.isNoPlan || !checkFeature("gdrive_sync"))) {
    const err = new Error("Accessing shared Google Drive assets requires a Professional or Ultimate storage plan.");
    err.statusCode = 403;
    err.code = "PLAN_TIER_INSUFFICIENT";
    throw err;
  }

  if (hasDropboxItems && (planContext?.isNoPlan || !checkFeature("dropbox_sync"))) {
    const err = new Error("Accessing shared Dropbox assets requires a Professional or Ultimate storage plan.");
    err.statusCode = 403;
    err.code = "PLAN_TIER_INSUFFICIENT";
    throw err;
  }

  const sanitizedItems = (shareLink.items || []).map((item) => ({
    id: item.id?.toString() || item._id?.toString(),
    type: item.type,
    provider: item.provider || "local",
    name: item.name || "Item",
    size: item.size || 0,
    extension: item.extension || "",
    mimeType: item.mimeType || "",
  }));

  const sharedAccess = await SharedAccess.updateOne(
    {
      userId: shareLink.userId,
      targetUserId: userId,
      grantedBy: shareLink._id,
    },
    {
      $set: {
        permission: shareLink.permission,
        expiresAt: shareLink.expiresAt,
        items: sanitizedItems,
      },
    },
    {
      upsert: true,
    },
  );

  await cacheDel(`share:${shareLink.userId}:${userId}`);

  return {
    message: "Access granted successfully",
    access: { sharedAccess },
  };
};

export const getSharedDrivesLogic = async ({ userId }) => {
  const sharedAccesses = await SharedAccess.find({ targetUserId: userId })
    .populate("userId", "name email profilepic rootDirId")
    .lean();

  const dirIdsToFetch = [];
  const fileIdsToFetch = [];

  sharedAccesses.forEach((access) => {
    const owner = access.userId;
    if (!owner) return;
    if (!access.items || access.items.length === 0) {
      if (owner.rootDirId) {
        dirIdsToFetch.push(owner.rootDirId);
      }
    } else {
      access.items.forEach((item) => {
        if (item.type === "directory") {
          dirIdsToFetch.push(item.id);
        } else if (item.type === "file") {
          fileIdsToFetch.push(item.id);
        }
      });
    }
  });

  let dirMetaMap = new Map();
  if (dirIdsToFetch.length > 0) {
    const dirs = await Directory.find({ _id: { $in: dirIdsToFetch } })
      .select("_id size name provider")
      .lean();
    const populatedDirs = await populateDirectoryItemCounts(dirs);
    dirMetaMap = new Map(populatedDirs.map((d) => [d._id.toString(), d]));
  }

  let fileMetaMap = new Map();
  if (fileIdsToFetch.length > 0) {
    const files = await File.find({ _id: { $in: fileIdsToFetch } })
      .select("_id size extension hasThumbnail name provider")
      .lean();
    fileMetaMap = new Map(files.map((f) => [f._id.toString(), f]));
  }

  const enrichedAccesses = sharedAccesses.map((access) => {
    const owner = access.userId;
    if (!owner) return access;

    if (!access.items || access.items.length === 0) {
      const rootDirMeta = owner.rootDirId
        ? dirMetaMap.get(owner.rootDirId.toString())
        : null;
      return {
        ...access,
        itemCount: rootDirMeta ? rootDirMeta.itemCount : 0,
        items: rootDirMeta ? rootDirMeta.itemCount : 0,
        filesCount: rootDirMeta ? rootDirMeta.filesCount : 0,
        directoriesCount: rootDirMeta ? rootDirMeta.directoriesCount : 0,
        size: rootDirMeta ? rootDirMeta.size || 0 : 0,
      };
    }

    const enrichedItems = (access.items || []).map((item) => {
      if (item.type === "directory") {
        const meta = dirMetaMap.get(item.id.toString());
        return {
          ...item,
          size: meta ? meta.size || 0 : 0,
          itemCount: meta ? meta.itemCount : 0,
          items: meta ? meta.itemCount : 0,
          filesCount: meta ? meta.filesCount : 0,
          directoriesCount: meta ? meta.directoriesCount : 0,
        };
      } else {
        const meta = fileMetaMap.get(item.id.toString());
        return {
          ...item,
          size: meta ? meta.size || 0 : 0,
          extension: meta ? meta.extension : "",
          hasThumbnail: meta ? meta.hasThumbnail : false,
        };
      }
    });

    return {
      ...access,
      items: enrichedItems,
    };
  });

  return { sharedAccesses: enrichedAccesses };
};
