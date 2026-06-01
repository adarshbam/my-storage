import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  generateShareLink,
  getShareLinks,
  revokeShareLink,
  getShareLinkByToken,
  claimShareAccess,
  getSharedDrives,
} from "../controllers/shareController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  generateShareLinkSchema,
  revokeShareLinkSchema,
  getShareLinkByTokenSchema,
  claimShareAccessSchema,
} from "../validators/shareSchema.js";
import { shareLimiter, lightReadLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// Generate a share link (must be logged in)
router.post("/link", checkAuth, shareLimiter, throttle(500, 5, "share-generate"), validate(generateShareLinkSchema), generateShareLink);

// Retrieve active share links created by the user
router.get("/links", checkAuth, lightReadLimiter, throttle(100, 15, "share-list"), getShareLinks);

// Revoke a share link (must be logged in and owner of the link)
delete router.delete; // Avoid reserved keyword overlap if needed
router.delete("/link/:linkId", checkAuth, shareLimiter, throttle(300, 8, "share-revoke"), validate(revokeShareLinkSchema), revokeShareLink);

// Get list of shared drives/users shared with the current user
router.get("/drives", checkAuth, lightReadLimiter, throttle(100, 15, "share-drives"), getSharedDrives);

// PUBLIC or AUTH: Get details about a share link before claiming it
router.get("/token/:token", lightReadLimiter, throttle(200, 10, "share-token-get"), validate(getShareLinkByTokenSchema), getShareLinkByToken);

// Claim access to shared files (must be logged in)
router.post("/claim/:token", checkAuth, shareLimiter, throttle(500, 5, "share-claim"), validate(claimShareAccessSchema), claimShareAccess);

export default router;
