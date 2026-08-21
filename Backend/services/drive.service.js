import User from "../models/userModel.js";
import { sanitize } from "../utils/sanitize.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../config/config.js";
import { google } from "googleapis";
import { Readable } from "stream";
import archiver from "archiver";
import path from "path";
import mongoose from "mongoose";
import SharedAccess from "../models/sharedAccessModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { updateParentDirectorySize } from "../controllers/fileController.js";
import { uploadToB2, getObjectFromB2, deleteFromB2 } from "../integrations/storage/s3.client.js";

import {
  resolveIntegrationOwnerId,
  hasWriteAccess,
  verifyItemAccess,
} from "../utils/integrationHelper.js";

const STORAGE_DIR = path.join(import.meta.dirname, "../storage");

// ─── Shared Helper: Build an authenticated Drive client ───────────────────────
async function getDriveClient(userId) {
  const user = await User.findById(userId).select("integrations").lean();
  if (!user?.integrations?.googleDrive?.refreshToken) return null;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage",
  );
  oauth2Client.setCredentials({
    refresh_token: user.integrations.googleDrive.refreshToken,
  });

  return {
    drive: google.drive({ version: "v3", auth: oauth2Client }),
    user,
  };
}

// ─── Shared Helper: Authenticate requests and verify permissions ────────────────
async function getAuthenticatedClient(req, requireWrite = false) {
  try {
    const ownerId = await resolveIntegrationOwnerId(req);

    // If accessing someone else's integration, check permissions
    if (ownerId !== req.user.id) {
      const sharedAccess = await SharedAccess.findOne({
        userId: ownerId,
        targetUserId: req.user.id,
      });
      if (!sharedAccess) {
        const err = new Error("Unauthorized shared access");
        err.statusCode = 403;
        throw err;
      }
      if (requireWrite && !sharedAccess.permission.includes("owner")) {
        const err = new Error(
          "Integration modification requires 'owner' permission level",
        );
        err.statusCode = 403;
        throw err;
      }
    }

    const client = await getDriveClient(ownerId);
    if (!client) {
      const err = new Error("Google Drive not connected");
      err.statusCode = 403;
      throw err;
    }

    return {
      drive: client.drive,
      ownerId,
      user: client.user,
    };
  } catch (error) {
    if (!error.statusCode) {
      if (error.message === "FORBIDDEN_ADMIN_ACCESS") {
        error.statusCode = 403;
        error.message =
          "Admins are not permitted to access other users' personal integrations.";
      } else if (error.message === "UNAUTHORIZED_SHARE_ACCESS") {
        error.statusCode = 403;
        error.message = "You do not have shared access to this user's files.";
      } else {
        error.statusCode = 500;
      }
    }
    throw error;
  }
}

// ─── Shared Helper: Map a raw Drive API file to your app's standard shape ─────
function mapDriveItem(file) {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  return {
    _id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: parseInt(file.size) || 0,
    extension: isFolder ? null : `.${file.name.split(".").pop() || "tmp"}`,
    type: isFolder ? "directory" : "file",
    provider: "google_drive",
    parentId: file.parents?.[0] ?? null,
    modifiedTime: file.modifiedTime,
  };
}

export const connectGoogleDriveLogic = async ({ code, userId, rootDirId, req, res }) => {
  if (!code) {
    const err = new Error("Authorization code missing");
    err.statusCode = 400;
    throw err;
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage",
  );

  const { tokens } = await oauth2Client.getToken(code);

  const existingUser = await User.findById(userId).select("integrations").lean();
  const existingRefreshToken = existingUser?.integrations?.googleDrive?.refreshToken;
  const refreshToken = tokens.refresh_token || existingRefreshToken;

  if (!refreshToken) {
    const err = new Error(
      "Google did not provide a refresh token. Please ensure consent is granted during login.",
    );
    err.statusCode = 400;
    throw err;
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "integrations.googleDrive": {
          connected: true,
          refreshToken: refreshToken,
          scope: tokens.scope || "https://www.googleapis.com/auth/drive",
          connectedAt: new Date(),
        },
      },
    },
  );
  await invalidateUserSessions(userId);

  // Create a special mount-point directory if it doesn't exist yet
  const existingDir = await Directory.findOne({
    userId: userId,
    provider: "google_drive",
  });
  if (!existingDir) {
    const newDirId = new mongoose.Types.ObjectId();
    await Directory.create({
      _id: newDirId,
      name: "Google Drive",
      userId: userId,
      type: "directory",
      parentDir: rootDirId,
      path: [rootDirId, newDirId],
      provider: "google_drive",
    });
  }

  return { success: true, message: "Drive connected" };
};

export const disconnectGoogleDriveLogic = async ({ userId, rootDirId, req, res }) => {
  await User.updateOne(
    { _id: userId },
    {
      $unset: {
        "integrations.googleDrive": "",
      },
    },
  );
  await invalidateUserSessions(userId);

  await Directory.deleteOne({
    userId: userId,
    provider: "google_drive",
  });

  return { success: true, message: "Drive disconnected" };
};

export const listDriveFilesLogic = async ({ req }) => {
  const client = await getAuthenticatedClient(req, false);
  const { drive } = client;

  const response = await drive.files.list({
    // Only show items directly at the root of My Drive, skip trash
    q: "'root' in parents and trashed = false",
    pageSize: 100,
    fields:
      "files(id, name, mimeType, size, modifiedTime, parents, thumbnailLink)",
    orderBy: "folder,name",
  });

  const gFiles = response.data.files || [];
  const mappedItems = gFiles.map(mapDriveItem);

  return {
    directories: mappedItems.filter((i) => i.type === "directory"),
    files: mappedItems.filter((i) => i.type === "file"),
    name: "Google Drive",
  };
};

export const listDriveFolderLogic = async ({ folderId, req }) => {
  const client = await getAuthenticatedClient(req, false);
  const { drive } = client;

  // Run all three fetches in parallel for speed
  const [folderMeta, childrenRes, rootRes] = await Promise.all([
    // Folder name + its parent ID
    drive.files.get({ fileId: folderId, fields: "id, name, parents" }),
    // Direct children of this folder
    drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 100,
      fields: "files(id, name, mimeType, size, modifiedTime, parents)",
      orderBy: "folder,name",
    }),
    // Resolve the real ID of "My Drive" root (it is NEVER the literal string "root")
    drive.files.get({ fileId: "root", fields: "id" }),
  ]);

  const gFiles = childrenRes.data.files || [];
  const mappedItems = gFiles.map(mapDriveItem);

  const rawParentId = folderMeta.data.parents?.[0] ?? null;
  const rootId = rootRes.data.id;

  // Normalize: if the parent IS the Drive root, return "root" so the
  // frontend's (parentId !== "root") check works correctly.
  const parentId = rawParentId === rootId ? "root" : rawParentId;

  return {
    directories: mappedItems.filter((i) => i.type === "directory"),
    files: mappedItems.filter((i) => i.type === "file"),
    name: folderMeta.data.name,
    // parentId powers the ← Back button on the frontend
    parentId,
  };
};

export const getFileFromDriveLogic = async ({ fileId, action, req, res }) => {
  const client = await getAuthenticatedClient(req, false);
  const { drive } = client;

  // 1. Get file metadata (name + mimeType) so we can set the right headers
  const metaRes = await drive.files.get({
    fileId,
    fields: "name, mimeType, size",
  });

  const { name, mimeType } = metaRes.data;

  // Google Docs/Sheets/Slides can't be streamed directly — export instead
  const exportMimeMap = {
    "application/vnd.google-apps.document": "application/pdf",
    "application/vnd.google-apps.spreadsheet":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.presentation":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  const exportMime = exportMimeMap[mimeType];

  if (exportMime) {
    // Export Google Workspace file to a binary format
    const exportRes = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "stream" },
    );

    res.setHeader("Content-Type", exportMime);
    if (action === "download") {
      const ext = exportMime.split("/").pop().replace(".", "");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${name}.${ext}"`,
      );
    }
    exportRes.data.pipe(res);
    return;
  }

  // 2. Set headers for regular binary files
  const { size } = metaRes.data;
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("X-Total-Size", size || 0);

  if (action === "download") {
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  }

  // 3. Handle Range requests for resumption/seeking
  const range = req.headers.range;
  const driveParams = { fileId, alt: "media" };
  const driveOptions = { responseType: "stream" };

  if (range && !exportMime) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : size
        ? size - 1
        : undefined;

    if (!isNaN(start)) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size || "*"}`);
      driveOptions.headers = { Range: range };
    }
  }

  // 4. Stream the file bytes directly to the response — zero memory buffering!
  const fileRes = await drive.files.get(driveParams, driveOptions);

  fileRes.data.pipe(res);
};

export const createDriveFolderLogic = async ({ parentFolderId, name, req }) => {
  const safeName = sanitize(name);

  const client = await getAuthenticatedClient(req, true);
  const { drive } = client;

  const response = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId || "root"],
    },
    fields: "id, name",
  });

  return {
    msg: "Folder created!",
    id: response.data.id,
    name: response.data.name,
  };
};

export const uploadFileToDriveLogic = async ({ parentFolderId, req }) => {
  const fileName = sanitize(req.headers.filename);

  if (!fileName) {
    const err = new Error("No filename provided");
    err.statusCode = 400;
    throw err;
  }

  const client = await getAuthenticatedClient(req, true);
  const { drive } = client;

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const stream = Readable.from([buffer]);
        const mimeType =
          req.headers["content-type"] || "application/octet-stream";

        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [parentFolderId || "root"],
          },
          media: {
            mimeType,
            body: stream,
          },
          fields: "id, name, mimeType, size",
        });

        resolve({
          msg: "Uploaded!",
          id: response.data.id,
          name: response.data.name,
        });
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
};

export const deleteFromDriveLogic = async ({ fileId, req }) => {
  const client = await getAuthenticatedClient(req, true);
  const { drive } = client;

  await drive.files.delete({ fileId });
  return { msg: "Deleted!" };
};

export const downloadDriveFolderLogic = async ({ folderId, req, res }) => {
  const client = await getAuthenticatedClient(req, false);
  const { drive } = client;

  // Recursively collect all downloadable files inside a folder
  const collectFiles = async (parentId, pathPrefix = "") => {
    const response = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType)",
      pageSize: 100,
    });

    const results = [];
    for (const file of response.data.files || []) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        // Recurse into subfolders
        const sub = await collectFiles(file.id, `${pathPrefix}${file.name}/`);
        results.push(...sub);
      } else if (!file.mimeType.startsWith("application/vnd.google-apps.")) {
        // Skip Google Docs/Sheets/Slides — they can't be streamed as-is
        results.push({
          id: file.id,
          name: file.name,
          path: `${pathPrefix}${file.name}`,
        });
      }
    }
    return results;
  };

  const meta = await drive.files.get({ fileId: folderId, fields: "name" });
  const folderName = meta.data.name;
  const allFiles = await collectFiles(folderId);

  if (allFiles.length === 0) {
    const err = new Error("No downloadable files in this folder");
    err.statusCode = 404;
    throw err;
  }

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${folderName}.zip"`,
  );
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.pipe(res);

  for (const file of allFiles) {
    const fileRes = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "stream" },
    );
    archive.append(fileRes.data, { name: file.path });
  }

  await archive.finalize();
};

export const searchDriveFilesLogic = async ({ query, req }) => {
  if (!query) {
    const err = new Error("Search query is required");
    err.statusCode = 400;
    throw err;
  }

  const client = await getAuthenticatedClient(req, false);
  const { drive } = client;

  // Sanitize: escape single quotes to prevent query injection
  const safe = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  // name contains is case-insensitive by default in Drive API.
  // Combine name match OR full-text content match for loose/deep search.
  const driveQuery = `(name contains '${safe}' or fullText contains '${safe}') and trashed = false`;

  const response = await drive.files.list({
    q: driveQuery,
    pageSize: 50,
    fields: "files(id, name, mimeType, size, modifiedTime, parents)",
  });

  const gFiles = response.data.files || [];
  const mappedItems = gFiles.map(mapDriveItem);

  return {
    directories: mappedItems.filter((i) => i.type === "directory"),
    files: mappedItems.filter((i) => i.type === "file"),
    name: `Search: ${query}`,
  };
};

export const updateDriveItemLogic = async ({ fileId, data, req }) => {
  const { name, parentId } = data;

  const client = await getAuthenticatedClient(req, true);
  const { drive } = client;

  const updateParams = {
    fileId,
    fields: "id, name, parents",
  };

  if (name) {
    updateParams.requestBody = { name: sanitize(name) };
  }

  if (parentId) {
    // To move a file, we need to know its current parents to remove them
    const file = await drive.files.get({ fileId, fields: "parents" });
    const previousParents = (file.data.parents || []).join(",");

    updateParams.addParents = parentId;
    updateParams.removeParents = previousParents;
  }

  const response = await drive.files.update(updateParams);

  return {
    msg: "Item updated!",
    id: response.data.id,
    name: response.data.name,
  };
};

export const moveDriveItemsLogic = async ({ items, targetId, req }) => {
  const client = await getAuthenticatedClient(req, true);
  const { drive } = client;

  const results = [];
  for (const item of items) {
    const itemId = item._id || item.id;
    // To move a file, we need to know its current parents to remove them
    const file = await drive.files.get({
      fileId: itemId,
      fields: "parents",
    });
    const previousParents = (file.data.parents || []).join(",");

    const response = await drive.files.update({
      fileId: itemId,
      addParents: targetId,
      removeParents: previousParents,
      fields: "id, name, parents",
    });
    results.push(response.data);
  }

  return {
    msg: "Items moved successfully",
    results,
  };
};

export const transferToVaultLogic = async ({ items, targetFolderId, req }) => {
  const client = await getAuthenticatedClient(req, true);
  const { drive, ownerId } = client;

  // Check if the user has write access to the target local folder
  const targetDir = await Directory.findById(targetFolderId).lean();
  const localOwnerId = targetDir ? targetDir.userId.toString() : ownerId;
  const hasLocalWrite = await verifyItemAccess(
    localOwnerId,
    req,
    targetFolderId,
    "directory",
    "write",
    targetDir ? targetDir.path : [],
  );
  if (!hasLocalWrite) {
    const err = new Error("No write access to target local folder");
    err.statusCode = 403;
    throw err;
  }

  const initialParentPath = targetDir ? targetDir.path : [];

  const results = [];

  // Recursive helper to import Drive folder structure into local DB
  const importItem = async (driveItem, localParentId, parentPath) => {
    const driveItemId = driveItem._id || driveItem.id;
    if (driveItem.type === "directory") {
      // 1. Create local directory
      const newDirId = new mongoose.Types.ObjectId();
      const currentPath = [...parentPath, newDirId];
      const newDir = await Directory.create({
        _id: newDirId,
        name: driveItem.name,
        parentDir: localParentId,
        userId: ownerId, // New folders belong to the actual folder owner
        path: currentPath,
        size: 0,
      });

      // 2. List children in Drive
      const response = await drive.files.list({
        q: `'${driveItemId}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, size)",
      });

      const children = response.data.files || [];
      for (const child of children) {
        const mappedChild = mapDriveItem(child);
        await importItem(mappedChild, newDir._id.toString(), currentPath);
      }
      return newDir;
    } else {
      // 1. Create local file entry with new ID
      const fileId = new mongoose.Types.ObjectId();
      const ext = path.extname(driveItem.name);
      const fileName = driveItem.name;

      // 2. Stream from Drive directly to Backblaze B2
      const driveRes = await drive.files.get(
        { fileId: driveItemId, alt: "media" },
        { responseType: "stream" },
      );

      const chunks = [];
      for await (const chunk of driveRes.data) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const fileSize = buffer.length;

      await uploadToB2({
        key: `${fileId}${ext}`,
        body: buffer,
      });

      const newFile = await File.create({
        _id: fileId,
        name: fileName,
        extension: ext,
        size: fileSize,
        userId: ownerId, // Transferred files belong to the actual folder owner
        parentDir: localParentId,
        type: "file",
      });

      await updateParentDirectorySize(parentPath, fileSize);

      return newFile;
    }
  };

  for (const item of items) {
    const importedItem = await importItem(
      item,
      targetFolderId,
      initialParentPath,
    );
    results.push(importedItem);
  }

  return { msg: "Transfer to vault successful", results };
};

export const transferFromVaultLogic = async ({ items, targetFolderId, req }) => {
  const client = await getAuthenticatedClient(req, true);
  const { drive } = client;
  const results = [];

  const exportItem = async (localItem, driveParentId) => {
    const itemId = localItem._id || localItem.id;
    if (localItem.type === "directory") {
      // Create folder in Drive
      const response = await drive.files.create({
        requestBody: {
          name: localItem.name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [driveParentId || "root"],
        },
        fields: "id, name",
      });
      const newDriveFolderId = response.data.id;
      
      // Fetch children from local DB
      const childDirs = await Directory.find({ parentDir: itemId }).lean();
      const childFiles = await File.find({ parentDir: itemId }).lean();
      
      for (const dir of childDirs) {
        await exportItem({ ...dir, type: "directory" }, newDriveFolderId);
      }
      for (const file of childFiles) {
        await exportItem({ ...file, type: "file" }, newDriveFolderId);
      }
      return response.data;
    } else {
      // Get file from B2 and upload to Drive
      let ext = localItem.extension;
      if (!ext) {
        const fileDoc = await File.findById(itemId).select("extension name").lean();
        ext = fileDoc?.extension || (localItem.name ? path.extname(localItem.name) : "");
      }
      const s3Key = `${itemId}${ext}`;
      const objectData = await getObjectFromB2({ key: s3Key });
      
      const response = await drive.files.create({
        requestBody: {
          name: localItem.name,
          parents: [driveParentId || "root"],
        },
        media: {
          mimeType: "application/octet-stream",
          body: objectData.Body,
        },
        fields: "id, name, mimeType, size",
      });
      return response.data;
    }
  };

  for (const item of items) {
    const exportedItem = await exportItem(item, targetFolderId);
    results.push(exportedItem);
  }

  return { msg: "Transfer from vault successful", results };
};
