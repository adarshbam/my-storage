import SharedAccess from "../models/sharedAccessModel.js";
import { cacheGet, cacheSet } from "./redis.js";

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
    ? { permission: sharedAccess.permission, exists: true }
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
