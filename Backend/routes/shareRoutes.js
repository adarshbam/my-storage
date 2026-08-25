import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import { requireFeature } from "../middlewares/requireFeature.js";
import { requireRule } from "../middlewares/requireRule.js";
import {
  generateShareLink,
  getShareLinks,
  toggleShareLinkActive,
  updateShareLink,
  revokeShareLink,
  getShareLinkByToken,
  verifyShareLinkPassword,
  downloadSharedFile,
  claimShareAccess,
  getSharedDrives,
} from "../controllers/shareController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  generateShareLinkSchema,
  toggleShareLinkSchema,
  updateShareLinkSchema,
  revokeShareLinkSchema,
  getShareLinkByTokenSchema,
  verifyShareLinkPasswordSchema,
  downloadSharedFileSchema,
  claimShareAccessSchema,
} from "../validators/shareSchema.js";
import { shareLimiter, lightReadLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// Generate a share link (must be logged in and plan must allow sharing)
router.post(
  "/link",
  checkAuth,
  loadPlanContext,
  requireFeature("share_links"),
  requireRule("allowSharing"),
  shareLimiter,
  throttle(500, 5, "share-generate"),
  validate(generateShareLinkSchema),
  generateShareLink,
);

// Retrieve share links created by the user
router.get("/links", checkAuth, lightReadLimiter, getShareLinks);

// Toggle active/disabled status of a share link
router.patch(
  "/link/:linkId/toggle",
  checkAuth,
  shareLimiter,
  validate(toggleShareLinkSchema),
  toggleShareLinkActive,
);

// Update share link settings
router.patch(
  "/link/:linkId",
  checkAuth,
  shareLimiter,
  validate(updateShareLinkSchema),
  updateShareLink,
);

// Revoke a share link (must be logged in and owner of the link)
router.delete(
  "/link/:linkId",
  checkAuth,
  shareLimiter,
  throttle(300, 8, "share-revoke"),
  validate(revokeShareLinkSchema),
  revokeShareLink,
);

// Get list of shared drives/users shared with the current user
router.get("/drives", checkAuth, lightReadLimiter, getSharedDrives);

// PUBLIC or AUTH: Get details about a share link
router.get("/token/:token", lightReadLimiter, validate(getShareLinkByTokenSchema), getShareLinkByToken);

// PUBLIC or AUTH: Verify password for protected link
router.post(
  "/token/:token/verify-password",
  lightReadLimiter,
  validate(verifyShareLinkPasswordSchema),
  verifyShareLinkPassword,
);

// PUBLIC or AUTH: Direct file download from share link
router.get(
  "/token/:token/download/:itemId",
  lightReadLimiter,
  validate(downloadSharedFileSchema),
  downloadSharedFile,
);

// Claim access to shared files (must be logged in)
router.post(
  "/claim/:token",
  checkAuth,
  loadPlanContext,
  shareLimiter,
  throttle(500, 5, "share-claim"),
  validate(claimShareAccessSchema),
  claimShareAccess,
);

export default router;
