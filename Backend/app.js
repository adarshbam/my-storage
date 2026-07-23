import express from "express";
import cookieParser from "cookie-parser";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import trashRouter from "./routes/trashRoutes.js";
import userRouter from "./routes/userRoutes.js";
import otpRouter from "./routes/otpRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import driveRouter from "./routes/driveRoutes.js";
import githubRouter from "./routes/githubRoutes.js";
import systemUsersRouter from "./routes/systemUsersRoutes.js";
import shareRouter from "./routes/shareRoutes.js";
import systemConfigRouter from "./routes/systemConfigRoutes.js";
import webhookRouter from "./routes/webhookRoutes.js";
import cors from "cors";
import checkAuth from "./middlewares/authMiddleware.js";
import https from "https";
import { readFileSync } from "fs";
import "./databases/mongoose.js";
import path from "path";
import Trash from "./models/trashModel.js";
import File from "./models/fileModel.js";
import Directory from "./models/directoryModel.js";
import User from "./models/userModel.js";
import { reconcileDirectoryPathsAndSizes } from "./utils/reconcile.js";
import helmet from "helmet";
import { s3Client } from "./services/s3.js";
import {
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { PORT, CLIENT_URL, SESSION_SECRET } from "./config.js";

const app = express();

app.use(
  helmet({
    // 1. Content Security Policy (CSP) - Extremely strict whitelist
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: [
          "'self'",
          "https://accounts.google.com/gsi/client",
          "https://apis.google.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com/gsi/style",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://lh3.googleusercontent.com",
          "https://*.googleusercontent.com",
          "https://avatars.githubusercontent.com",
          "https://*.githubusercontent.com",
        ],
        connectSrc: [
          "'self'",
          CLIENT_URL,
          "https://accounts.google.com",
          "https://oauth2.googleapis.com",
          "https://api.github.com",
          "https://github.com",
          "https://*.googleapis.com",
        ],
        frameSrc: ["'self'", "https://accounts.google.com/"],
        formAction: [
          "'self'",
          CLIENT_URL,
          "https://accounts.google.com/",
          "https://github.com/login/oauth/authorize",
        ],
        frameAncestors: ["'none'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // 2. Strict Transport Security (HSTS) - Enforce HTTPS for 1 year, all subdomains, preload-ready
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // 3. X-Frame-Options - Complete Clickjacking protection
    frameguard: {
      action: "deny",
    },
    // 4. X-Content-Type-Options - Prevent MIME-type sniffing
    noSniff: true,
    // 5. Referrer-Policy - Leak-free referrer controls
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    // 6. X-XSS-Protection - Enable legacy browser security
    xssFilter: true,
    // 7. Cross-Origin Opener Policy (COOP) - Crucial for popup OAuth flows
    crossOriginOpenerPolicy: {
      policy: "unsafe-none",
    },
    // 8. Cross-Origin Resource Policy (CORP) - Allow client app to read static files
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    // Disable COEP to allow loading external profile pictures without CORP headers
    crossOriginEmbedderPolicy: false,
  }),
);

// 9. Extra Professional Header: Permissions-Policy - Disable all unused hardware features
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );
  next();
});

app.use(
  cors({
    exposedHeaders: ["X-Total-Size", "X-Total-Files"],
    origin: [CLIENT_URL],
    credentials: true,
  }),
);
app.use(cookieParser(SESSION_SECRET));
app.use(express.json());

app.use("/directory", checkAuth, directoryRouter);
app.use("/file", checkAuth, fileRouter);
app.use("/trash", checkAuth, trashRouter);
app.use("/user", userRouter);
app.use("/otp", otpRouter);
app.use("/subscriptions", subscriptionRouter);
app.use("/drive", driveRouter);
app.use("/github", githubRouter);
app.use("/users", systemUsersRouter);
app.use("/share", shareRouter);
app.use("/system-config", systemConfigRouter);
app.use("/webhooks", webhookRouter);

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).send("Internal Server Error");
});

/* =======================
   SAFE PATH RESOLVER
   ======================= */

/* =======================
   ROUTES
   ======================= */

app.get("/", (req, res) => {
  return res.send("Server running");
});

const sslOptions = {
  key: readFileSync("server.key"),
  cert: readFileSync("server.cert"),
};

const httpsServer = https.createServer(sslOptions, app);

const UPLOAD_DIR = path.join(import.meta.dirname, "storage");
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

async function cleanFiles() {
  try {
    console.log(
      "[Cleanup] Starting Backblaze B2 storage and database cleanup...",
    );
    const expiryDate = new Date(Date.now() - THIRTY_DAYS);

    // 1. Identify active user IDs
    const userIds = await User.distinct("_id");

    // 2. Identify expired and ghost Trash records
    const expiredTrash = await Trash.find({ deleted_at: { $lt: expiryDate } });
    const ghostTrash = await Trash.find({ userId: { $nin: userIds } });

    // Combine trash items to delete (preventing duplicates)
    const trashMap = new Map();
    for (const item of [...expiredTrash, ...ghostTrash]) {
      trashMap.set(item._id.toString(), item);
    }
    const trashItemsToDelete = Array.from(trashMap.values());

    // 3. Identify Ghost Files and Directories of deleted users
    const ghostFiles = await File.find({ userId: { $nin: userIds } });
    const ghostDirectories = await Directory.find({
      userId: { $nin: userIds },
    });

    // 4. Identify Orphan Files and Directories (whose parentDir is not null and does not exist)
    const allDirIds = await Directory.distinct("_id");
    const allDirIdsSet = new Set(allDirIds.map((id) => id.toString()));

    const orphanFiles = await File.find({
      parentDir: { $ne: null, $nin: Array.from(allDirIdsSet) },
    });

    const orphanDirectories = await Directory.find({
      parentDir: { $ne: null, $nin: Array.from(allDirIdsSet) },
    });

    // For Trash records, a valid parentDir could be either in Directory or in Trash (another deleted/trashed dir)
    const allTrashDirs = await Trash.find(
      { type: "directory" },
      { _id: 1 },
    ).lean();
    const allTrashDirsSet = new Set(allTrashDirs.map((t) => t._id.toString()));
    const validTrashParentsSet = new Set([...allDirIdsSet, ...allTrashDirsSet]);

    const orphanTrash = await Trash.find({
      parentDir: { $ne: null, $nin: Array.from(validTrashParentsSet) },
    });

    // 5. Fetch all object versions from Backblaze B2 to identify broken database records and orphans
    const allVersions = [];
    const allDeleteMarkers = [];
    let keyMarker;
    let versionIdMarker;
    let isTruncated = true;

    while (isTruncated) {
      const listCommand = new ListObjectVersionsCommand({
        Bucket: process.env.BACKBLAZE_BUCKET_NAME,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      });
      const response = await s3Client.send(listCommand);
      if (response.Versions) {
        allVersions.push(...response.Versions);
      }
      if (response.DeleteMarkers) {
        allDeleteMarkers.push(...response.DeleteMarkers);
      }
      isTruncated = response.IsTruncated;
      keyMarker = response.NextKeyMarker;
      versionIdMarker = response.NextVersionIdMarker;
    }

    // Set of all unique keys currently in S3 (having at least one version)
    const allS3Keys = new Set(allVersions.map((v) => v.Key));

    // Identify Broken Database Records (files in DB with externalUrl = null that do not exist in Backblaze B2)
    const activeLocalFiles = await File.find({ externalUrl: null }).lean();
    const trashLocalFiles = await Trash.find({
      type: "file",
      externalUrl: null,
    }).lean();

    const brokenFiles = [];
    for (const f of activeLocalFiles) {
      const s3Key = `${f._id}${f.extension}`;
      if (!allS3Keys.has(s3Key)) {
        brokenFiles.push(f);
      }
    }

    const brokenTrash = [];
    for (const t of trashLocalFiles) {
      const s3Key = `${t._id}${t.extension}`;
      if (!allS3Keys.has(s3Key)) {
        brokenTrash.push(t);
      }
    }

    console.log(`[Cleanup] Scan results:
      - Expired/Ghost Trash items: ${trashItemsToDelete.length}
      - Ghost files: ${ghostFiles.length}
      - Ghost directories: ${ghostDirectories.length}
      - Orphan files: ${orphanFiles.length}
      - Orphan directories: ${orphanDirectories.length}
      - Orphan trash records: ${orphanTrash.length}
      - Broken active files (missing in B2): ${brokenFiles.length}
      - Broken trash files (missing in B2): ${brokenTrash.length}
    `);

    // 6. Consolidate items to delete recursively or directly
    const dirsToDeleteMap = new Map();
    const filesToDeleteMap = new Map();

    const addDirToQueue = (dir) => {
      dirsToDeleteMap.set(dir._id.toString(), dir);
    };

    for (const d of ghostDirectories) addDirToQueue(d);
    for (const d of orphanDirectories) addDirToQueue(d);
    for (const item of trashItemsToDelete) {
      if (item.type === "directory") {
        addDirToQueue(item);
      }
    }

    const addFileToQueue = (file) => {
      filesToDeleteMap.set(file._id.toString(), file);
    };

    for (const f of ghostFiles) addFileToQueue(f);
    for (const f of orphanFiles) addFileToQueue(f);
    for (const f of brokenFiles) addFileToQueue(f);
    for (const item of trashItemsToDelete) {
      if (item.type === "file") {
        addFileToQueue(item);
      }
    }

    // Direct deletion for broken/orphan trash records (no storage cleanup needed)
    const trashToDirectDeleteIds = new Set();
    for (const t of orphanTrash) trashToDirectDeleteIds.add(t._id.toString());
    for (const t of brokenTrash) trashToDirectDeleteIds.add(t._id.toString());

    if (trashToDirectDeleteIds.size > 0) {
      const deletedTrashCount = await Trash.deleteMany({
        _id: { $in: Array.from(trashToDirectDeleteIds) },
      });
      console.log(
        `[Cleanup] Directly deleted ${deletedTrashCount.deletedCount} broken/orphan trash database records.`,
      );
    }

    // 7. Perform Directory Cleanup (recursive deletion from DB and Backblaze B2)
    for (const [dirId, dirItem] of dirsToDeleteMap.entries()) {
      const recursiveDelete = async (id) => {
        // Find descendant files
        const childFiles = await File.find({ parentDir: id });
        for (const f of childFiles) {
          const fileKey = `${f._id.toString()}${f.extension}`;
          const thumbKey = `thumbnails/${f._id.toString()}.jpg`;

          await s3Client
            .send(
              new DeleteObjectCommand({
                Bucket: process.env.BACKBLAZE_BUCKET_NAME,
                Key: fileKey,
              }),
            )
            .catch(() => {});

          await s3Client
            .send(
              new DeleteObjectCommand({
                Bucket: process.env.BACKBLAZE_BUCKET_NAME,
                Key: thumbKey,
              }),
            )
            .catch(() => {});

          console.log(
            `[Cleanup] Deleted descendant file in B2: ${f.name || f._id}`,
          );
        }

        // Remove children files from DB and Trash
        const childFileIds = childFiles.map((f) => f._id);
        if (childFileIds.length > 0) {
          await File.deleteMany({ _id: { $in: childFileIds } });
          await Trash.deleteMany({ _id: { $in: childFileIds } });
        }

        // Find child directories
        const childDirs = await Directory.find({ parentDir: id });
        for (const d of childDirs) {
          await recursiveDelete(d._id.toString());
        }

        // Remove child directories from DB and Trash
        const childDirIds = childDirs.map((d) => d._id);
        if (childDirIds.length > 0) {
          await Directory.deleteMany({ _id: { $in: childDirIds } });
          await Trash.deleteMany({ _id: { $in: childDirIds } });
        }
      };

      await recursiveDelete(dirId);

      // Finally, delete the top-level directory record itself
      await Directory.deleteOne({ _id: dirId });
      await Trash.deleteOne({ _id: dirId });
      console.log(
        `[Cleanup] Recursively deleted directory: ${dirItem.name || dirId}`,
      );
    }

    // 8. Perform File Cleanup (deleting Backblaze B2 files, thumbnails, and DB/Trash records)
    for (const [fileId, fileItem] of filesToDeleteMap.entries()) {
      const fileKey = `${fileItem._id}${fileItem.extension}`;
      const thumbKey = `thumbnails/${fileItem._id}.jpg`;

      await s3Client
        .send(
          new DeleteObjectCommand({
            Bucket: process.env.BACKBLAZE_BUCKET_NAME,
            Key: fileKey,
          }),
        )
        .catch(() => {});

      await s3Client
        .send(
          new DeleteObjectCommand({
            Bucket: process.env.BACKBLAZE_BUCKET_NAME,
            Key: thumbKey,
          }),
        )
        .catch(() => {});

      await File.deleteOne({ _id: fileId });
      await Trash.deleteOne({ _id: fileId });
      console.log(
        `[Cleanup] Deleted file from B2 and database: ${fileItem.name || fileId}`,
      );
    }

    // 9. Safe Storage Housekeeping (Delete all versions of orphaned S3 files/thumbnails in B2)
    const activeFileDocs = await File.find(
      {},
      { _id: 1, extension: 1, hasThumbnail: 1 },
    ).lean();
    const trashFileDocs = await Trash.find(
      { type: "file" },
      { _id: 1, extension: 1, hasThumbnail: 1 },
    ).lean();

    const activeFileIdsSet = new Set(
      activeFileDocs.map((f) => f._id.toString()),
    );
    const trashFileIdsSet = new Set(trashFileDocs.map((t) => t._id.toString()));

    const activeThumbnailIdsSet = new Set(
      activeFileDocs.filter((f) => f.hasThumbnail).map((f) => f._id.toString()),
    );
    const trashThumbnailIdsSet = new Set(
      trashFileDocs.filter((t) => t.hasThumbnail).map((t) => t._id.toString()),
    );

    const isOrphanedKey = (key) => {
      if (key.startsWith("thumbnails/")) {
        const match = key.match(/^thumbnails\/(.+)\.jpg$/);
        if (match) {
          const fileId = match[1];
          return (
            !activeThumbnailIdsSet.has(fileId) &&
            !trashThumbnailIdsSet.has(fileId)
          );
        }
        return true; // Malformed thumbnail key or folder placeholder itself
      } else {
        const dotIndex = key.lastIndexOf(".");
        const fileId = dotIndex !== -1 ? key.substring(0, dotIndex) : key;
        // B2 folder markers/placeholders should not be deleted if they don't match typical IDs, but wait,
        // if it doesn't have a dot and is not a valid ObjectId format, maybe we should ignore it to be safe?
        // Let's check if the fileId is 24 hex characters
        const isHex24 = /^[0-9a-fA-F]{24}$/.test(fileId);
        if (isHex24) {
          return !activeFileIdsSet.has(fileId) && !trashFileIdsSet.has(fileId);
        }
        return false; // Ignore general/non-asset keys to prevent accidental deletion of user assets
      }
    };

    const objectsToDelete = [];

    // Collect orphaned versions
    for (const v of allVersions) {
      if (isOrphanedKey(v.Key)) {
        objectsToDelete.push({ Key: v.Key, VersionId: v.VersionId });
      }
    }

    // Collect orphaned delete markers
    for (const dm of allDeleteMarkers) {
      if (isOrphanedKey(dm.Key)) {
        objectsToDelete.push({ Key: dm.Key, VersionId: dm.VersionId });
      }
    }

    if (objectsToDelete.length > 0) {
      console.log(
        `[Cleanup] Permanently purging ${objectsToDelete.length} orphaned B2 file versions/delete markers...`,
      );
      for (let i = 0; i < objectsToDelete.length; i += 1000) {
        const batch = objectsToDelete.slice(i, i + 1000);
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: process.env.BACKBLAZE_BUCKET_NAME,
            Delete: { Objects: batch },
          }),
        );
      }
      console.log("[Cleanup] S3 purging complete.");
    }

    console.log(
      "[Cleanup] Storage and database cleanup completed successfully.",
    );
  } catch (err) {
    console.error("[Cleanup] Cleanup error:", err);
  }
}

cleanFiles();

setInterval(cleanFiles, 24 * 60 * 60 * 1000); // Check every minute

// httpsServer.listen(PORT, () => {
//   console.log(`HTTPS Server running on port ${PORT}`);
// });

reconcileDirectoryPathsAndSizes().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
