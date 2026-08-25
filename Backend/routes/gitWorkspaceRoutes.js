import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import { requireFeature } from "../middlewares/requireFeature.js";
import { validate } from "../middlewares/validationMiddleware.js";
import throttle from "../utils/throttle.js";
import {
  heavyOpLimiter,
  mediumWriteLimiter,
  directoryReadLimiter,
} from "../middlewares/rateLimiter.js";

import {
  cloneRepoToVault,
  getWorkspaceStatus,
  stageFiles,
  unstageFiles,
  commitWorkspace,
  pullRemoteChanges,
  switchWorkspaceBranch,
  stashChanges,
  listStashes,
  popStash,
  dropStash,
  configureFolderBackup,
  runFolderBackupSync,
} from "../controllers/gitWorkspaceController.js";

import {
  cloneRepoSchema,
  getWorkspaceStatusSchema,
  stageFilesSchema,
  unstageFilesSchema,
  commitWorkspaceSchema,
  pullRemoteChangesSchema,
  switchWorkspaceBranchSchema,
  stashChangesSchema,
  listStashesSchema,
  popStashSchema,
  dropStashSchema,
  configureFolderBackupSchema,
  runFolderBackupSyncSchema,
} from "../validators/gitWorkspaceSchema.js";

const router = express.Router();

// Require authenticated session and github_backup feature for all Git Workspace routes
router.use(checkAuth, loadPlanContext, requireFeature("github_backup"));

// 1. Clone repo to Vault
router.post(
  "/clone",
  heavyOpLimiter,
  throttle(3000, 2, "gw-clone"),
  validate(cloneRepoSchema),
  cloneRepoToVault
);

// 2. Get workspace status (working tree tracker)
router.get(
  "/status",
  directoryReadLimiter,
  throttle(100, 30, "gw-status"),
  validate(getWorkspaceStatusSchema),
  getWorkspaceStatus
);

// 3. Stage files
router.post(
  "/stage",
  mediumWriteLimiter,
  validate(stageFilesSchema),
  stageFiles
);

// 4. Unstage files
router.post(
  "/unstage",
  mediumWriteLimiter,
  validate(unstageFilesSchema),
  unstageFiles
);

// 5. Atomic multi-file commit
router.post(
  "/commit",
  heavyOpLimiter,
  throttle(1000, 5, "gw-commit"),
  validate(commitWorkspaceSchema),
  commitWorkspace
);

// 6. Pull remote changes
router.post(
  "/pull",
  heavyOpLimiter,
  throttle(2000, 3, "gw-pull"),
  validate(pullRemoteChangesSchema),
  pullRemoteChanges
);

// 7. Switch / Checkout branch
router.post(
  "/branch/switch",
  heavyOpLimiter,
  throttle(2000, 3, "gw-branch-switch"),
  validate(switchWorkspaceBranchSchema),
  switchWorkspaceBranch
);

// 8. Stash operations
router.post(
  "/stash",
  mediumWriteLimiter,
  validate(stashChangesSchema),
  stashChanges
);

router.get(
  "/stash/:workspaceId",
  directoryReadLimiter,
  validate(listStashesSchema),
  listStashes
);

router.post(
  "/stash/:stashId/pop",
  mediumWriteLimiter,
  validate(popStashSchema),
  popStash
);

router.delete(
  "/stash/:stashId",
  mediumWriteLimiter,
  validate(dropStashSchema),
  dropStash
);

// 9. Automated Folder Backup configuration & sync
router.post(
  "/backup/configure",
  mediumWriteLimiter,
  validate(configureFolderBackupSchema),
  configureFolderBackup
);

router.post(
  "/backup/sync",
  heavyOpLimiter,
  throttle(3000, 2, "gw-backup-sync"),
  validate(runFolderBackupSyncSchema),
  runFolderBackupSync
);

export default router;
