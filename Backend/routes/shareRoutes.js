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

const router = express.Router();

// Generate a share link (must be logged in)
router.post("/link", checkAuth, validate(generateShareLinkSchema), generateShareLink);

// Retrieve active share links created by the user
router.get("/links", checkAuth, getShareLinks);

// Revoke a share link (must be logged in and owner of the link)
delete router.delete; // Avoid reserved keyword overlap if needed
router.delete("/link/:linkId", checkAuth, validate(revokeShareLinkSchema), revokeShareLink);

// Get list of shared drives/users shared with the current user
router.get("/drives", checkAuth, getSharedDrives);

// PUBLIC or AUTH: Get details about a share link before claiming it
router.get("/token/:token", validate(getShareLinkByTokenSchema), getShareLinkByToken);

// Claim access to shared files (must be logged in)
router.post("/claim/:token", checkAuth, validate(claimShareAccessSchema), claimShareAccess);

export default router;
