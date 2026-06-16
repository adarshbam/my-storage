import SharedAccess from "../models/sharedAccessModel.js";
import { cacheGet, cacheSet } from "./redis.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";

/**
 * Helper to get cached SharedAccess record with negative caching.
 */
export async function getCachedSharedAccess(ownerId, guestUserId) {
  const cacheKey = `share:${ownerId}:${guestUserId}`;
  
  const cached = await cacheGet(cacheKey);
  if (cached !== null) {
    return cached === "null" ? null : JSON.parse(cached);
  }
  
  // Cache miss -> Query MongoDB
  const sharedAccess = await SharedAccess.findOne({
    userId: ownerId,
    targetUserId: guestUserId,
  }).lean();
  
  const result = sharedAccess
    ? { permission: sharedAccess.permission, items: sharedAccess.items || [], exists: true }
    : null;
  
  await cacheSet(cacheKey, result ? JSON.stringify(result) : "null", 300); // 5-minute TTL
  return result;
}

/**
 * Resolves the ownerId for a Google Drive or GitHub integration request.
 * Performs administrative block and checks shared access permissions.
 * Throws errors for forbidden/unauthorized attempts.
 */
export async function resolveIntegrationOwnerId(req) {
  // Get ownerId from query params, body, or headers
  const ownerId = req.query.ownerId || req.body.ownerId || req.headers["x-owner-id"];
  
  if (!ownerId) {
    // Default to current logged-in user
    return req.user.id;
  }
  
  // If requesting own integration
  if (ownerId === req.user.id) {
    return req.user.id;
  }
  
  // If requesting someone else's integration:
  // 1. Owner & Admin roles are strictly forbidden from accessing other users' external integrations
  if (req.user.role === "Owner" || req.user.role === "Admin") {
    throw new Error("FORBIDDEN_ADMIN_ACCESS");
  }
  
  // 2. Check if the current user has shared access to this owner's files
  const sharedAccess = await getCachedSharedAccess(ownerId, req.user.id);
  
  if (!sharedAccess) {
    throw new Error("UNAUTHORIZED_SHARE_ACCESS");
  }
  
  return ownerId;
}

/**
 * Helper to determine if the requesting user has write access to a local directory/file
 */
export async function hasWriteAccess(ownerId, req) {
  if (!ownerId) return true;
  
  if (ownerId.toString() === req.user.id) {
    return true;
  }
  
  // Administrative views are strictly read-only
  if (req.user.role === "Owner" || req.user.role === "Admin") {
    return false;
  }
  
  const sharedAccess = await getCachedSharedAccess(ownerId, req.user.id);
  
  if (sharedAccess && (sharedAccess.permission.includes("write") || sharedAccess.permission.includes("owner"))) {
    return true;
  }
  
  return false;
}

/**
 * Helper to determine if requesting user has specific item access (granular item-level sharing)
 */
export async function verifyItemAccess(ownerId, req, itemId, itemType, permissionNeeded = "read", pathArray = null) {
  if (!ownerId) return true;
  if (ownerId.toString() === req.user.id) {
    return true;
  }
  
  // Administrators/Managers bypass read authorization checks for local files
  if (permissionNeeded === "read" && (req.user.role === "Owner" || req.user.role === "Admin" || req.user.role === "Manager")) {
    return true;
  }
  
  // Write actions are forbidden for Admins/Owners in others' drives
  if (permissionNeeded === "write" && (req.user.role === "Owner" || req.user.role === "Admin")) {
    return false;
  }
  
  const sharedAccess = await getCachedSharedAccess(ownerId, req.user.id);
  if (!sharedAccess) {
    return false;
  }
  
  // Validate basic permission type (read or write)
  if (permissionNeeded === "write") {
    if (!sharedAccess.permission.includes("write") && !sharedAccess.permission.includes("owner")) {
      return false;
    }
  } else {
    if (!sharedAccess.permission.includes("read") && !sharedAccess.permission.includes("write") && !sharedAccess.permission.includes("owner")) {
      return false;
    }
  }
  
  // If items array is empty, grant full vault access (legacy behavior)
  if (!sharedAccess.items || sharedAccess.items.length === 0) {
    return true;
  }
  
  // Check if current item itself is directly shared
  const sharedItemIds = sharedAccess.items.map(i => i.id);
  if (itemId && sharedItemIds.includes(itemId.toString())) {
    return true;
  }
  
  // If parent path is not supplied, fetch it
  let resolvedPath = pathArray;
  if (!resolvedPath && itemId) {
    if (itemType === "directory") {
      const dirDoc = await Directory.findById(itemId).select("path").lean();
      resolvedPath = dirDoc ? dirDoc.path : [];
    } else {
      const fileDoc = await File.findById(itemId).select("path").lean();
      resolvedPath = fileDoc ? fileDoc.path : [];
    }
  }
  
  // Check if any ancestor directory ID is in sharedItemIds
  const ancestorIds = (resolvedPath || []).map(p => {
    if (p && typeof p === "object") {
      return (p._id || p).toString();
    }
    return p ? p.toString() : "";
  });
  
  const isAncestorShared = ancestorIds.some(id => sharedItemIds.includes(id));
  if (isAncestorShared) {
    return true;
  }
  
  return false;
}
