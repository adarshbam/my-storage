import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../config.js";
import { google } from "googleapis";
import { Readable } from "stream";
import archiver from "archiver";
import path from "path";
import { createWriteStream, createReadStream } from "fs";
import { fileURLToPath } from "url";
import { stat, mkdir, unlink } from "fs/promises";
import mongoose from "mongoose";
import { pipeline } from "stream/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, "../storage");

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

// ─── Shared Helper: Map a raw Drive API file to your app's standard shape ─────
function mapDriveItem(file) {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  return {
    _id: file.id,
    id: file.id,
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /drive/connect
// Exchange the OAuth code from the frontend for refresh/access tokens and save.
// ─────────────────────────────────────────────────────────────────────────────
export const connectGoogleDrive = async (req, res) => {
  const { code } = req.body;
  const rootDirId = req.user.rootDirId.toString();

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "postmessage",
    );

    const { tokens } = await oauth2Client.getToken(code);

    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          "integrations.googleDrive": {
            connected: true,
            refreshToken: tokens.refresh_token,
            scope: tokens.scope,
            connectedAt: new Date(),
          },
        },
      },
    );

    // Create a special mount-point directory if it doesn't exist yet
    const existingDir = await Directory.findOne({
      userId: req.user.id,
      provider: "google_drive",
    });
    if (!existingDir) {
      await Directory.create({
        name: "Google Drive",
        userId: req.user.id,
        type: "directory",
        parentDir: rootDirId,
        provider: "google_drive",
      });
    }

    return res.status(200).json({ success: true, message: "Drive connected" });
  } catch (error) {
    console.error("Drive connection error:", error);
    return res.status(500).json({ error: "Failed to connect Google Drive" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /drive/disconnect
// Remove the Drive integration from the user and delete the mount directory.
// ─────────────────────────────────────────────────────────────────────────────
export const disconnectGoogleDrive = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      {
        $unset: {
          "integrations.googleDrive": "",
        },
      },
    );

    await Directory.deleteOne({
      userId: req.user.id,
      provider: "google_drive",
    });

    return res
      .status(200)
      .json({ success: true, message: "Drive disconnected" });
  } catch (error) {
    console.error("Drive disconnect error:", error);
    return res.status(500).json({ error: "Failed to disconnect Google Drive" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /drive/files
// List root-level items in "My Drive" (items whose parent is "root").
// ─────────────────────────────────────────────────────────────────────────────
export const listDriveFiles = async (req, res) => {
  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
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

    return res.status(200).json({
      directories: mappedItems.filter((i) => i.type === "directory"),
      files: mappedItems.filter((i) => i.type === "file"),
      name: "Google Drive",
    });
  } catch (err) {
    console.error("List Drive root error:", err);
    return res.status(500).json({ error: "Failed to fetch Drive files" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /drive/folder/:folderId
// List the contents of a specific Drive folder (one level deep).
// ─────────────────────────────────────────────────────────────────────────────
export const listDriveFolder = async (req, res) => {
  const { folderId } = req.params;
  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
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

    return res.status(200).json({
      directories: mappedItems.filter((i) => i.type === "directory"),
      files: mappedItems.filter((i) => i.type === "file"),
      name: folderMeta.data.name,
      // parentId powers the ← Back button on the frontend
      parentId,
    });
  } catch (err) {
    console.error("List Drive folder error:", err);
    return res.status(500).json({ error: "Failed to fetch folder contents" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /drive/file/:fileId   (preview) or ?action=download
// Stream a file's raw bytes back to the client.
// ─────────────────────────────────────────────────────────────────────────────
export const getFileFromDrive = async (req, res) => {
  const { fileId } = req.params;
  const { action } = req.query;

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
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
  } catch (err) {
    console.error("Get Drive file error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to fetch file" });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /drive/folder/:parentFolderId/create-folder
// Create a new folder inside a Drive folder.
// ─────────────────────────────────────────────────────────────────────────────
export const createDriveFolder = async (req, res) => {
  const { parentFolderId } = req.params; // "root" or a real folder ID
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "Folder name is required" });

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
    const response = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId || "root"],
      },
      fields: "id, name",
    });

    return res.status(201).json({
      msg: "Folder created!",
      id: response.data.id,
      name: response.data.name,
    });
  } catch (err) {
    console.error("Create Drive folder error:", err);
    return res.status(500).json({ error: "Failed to create folder" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /drive/file/:parentFolderId/upload
// Upload a file to a Drive folder. Reads raw binary from request body.
// The `filename` header tells us the destination filename.
// ─────────────────────────────────────────────────────────────────────────────
export const uploadFileToDrive = async (req, res) => {
  const { parentFolderId } = req.params;
  const fileName = req.headers.filename;

  if (!fileName) return res.status(400).json({ error: "No filename provided" });

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;
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

      return res.status(201).json({
        msg: "Uploaded!",
        id: response.data.id,
        name: response.data.name,
      });
    } catch (err) {
      console.error("Drive upload error:", err);
      return res
        .status(500)
        .json({ error: "Failed to upload to Google Drive" });
    }
  });

  req.on("error", (err) => {
    console.error("Request stream error:", err);
    return res.status(500).json({ error: "Upload stream error" });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /drive/file/:fileId
// Permanently delete a file or folder from Google Drive.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteFromDrive = async (req, res) => {
  const { fileId } = req.params;

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
    await drive.files.delete({ fileId });
    return res.status(200).json({ msg: "Deleted!" });
  } catch (err) {
    console.error("Drive delete error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to delete from Drive" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /drive/folder/:folderId/download
// Recursively zip an entire Drive folder and stream it back.
// ─────────────────────────────────────────────────────────────────────────────
export const downloadDriveFolder = async (req, res) => {
  const { folderId } = req.params;

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

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

  try {
    const meta = await drive.files.get({ fileId: folderId, fields: "name" });
    const folderName = meta.data.name;
    const allFiles = await collectFiles(folderId);

    if (allFiles.length === 0) {
      return res
        .status(404)
        .json({ error: "No downloadable files in this folder" });
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
  } catch (err) {
    console.error("Drive folder download error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download folder" });
    }
  }
};

export const searchDriveFiles = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query is required" });

  const client = await getDriveClient(req.user.id);
  if (!client)
    return res.status(403).json({ error: "Google Drive not connected" });
  const { drive } = client;

  try {
    // Sanitize: escape single quotes to prevent query injection
    const safe = q.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

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

    return res.status(200).json({
      directories: mappedItems.filter((i) => i.type === "directory"),
      files: mappedItems.filter((i) => i.type === "file"),
      name: `Search: ${q}`,
    });
  } catch (err) {
    console.error("Drive search error:", err);
    return res.status(500).json({ error: "Drive search failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /drive/file/:fileId
// Rename a file or move it to a different folder.
// ─────────────────────────────────────────────────────────────────────────────
export const updateDriveItem = async (req, res) => {
  const { fileId } = req.params;
  const { name, parentId } = req.body;

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
    const updateParams = {
      fileId,
      fields: "id, name, parents",
    };

    if (name) {
      updateParams.requestBody = { name };
    }

    if (parentId) {
      // To move a file, we need to know its current parents to remove them
      const file = await drive.files.get({ fileId, fields: "parents" });
      const previousParents = (file.data.parents || []).join(",");

      updateParams.addParents = parentId;
      updateParams.removeParents = previousParents;
    }

    const response = await drive.files.update(updateParams);

    return res.status(200).json({
      msg: "Item updated!",
      id: response.data.id,
      name: response.data.name,
    });
  } catch (err) {
    console.error("Drive update error:", err);
    return res.status(500).json({ error: "Failed to update item on Drive" });
  }
};

export const moveDriveItems = async (req, res) => {
  const { items, targetId } = req.body;

  const client = await getDriveClient(req.user.id);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const { drive } = client;

  try {
    const results = [];
    for (const item of items) {
      // To move a file, we need to know its current parents to remove them
      const file = await drive.files.get({
        fileId: item.id,
        fields: "parents",
      });
      const previousParents = (file.data.parents || []).join(",");

      const response = await drive.files.update({
        fileId: item.id,
        addParents: targetId,
        removeParents: previousParents,
        fields: "id, name, parents",
      });
      results.push(response.data);
    }

    return res.status(200).json({
      msg: "Items moved successfully",
      results,
    });
  } catch (err) {
    console.error("Drive bulk move error:", err);
    return res.status(500).json({ error: "Failed to move items on Drive" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /drive/transfer-to-vault
// Transfer items from Google Drive to local Vault storage.
// ─────────────────────────────────────────────────────────────────────────────
export const transferToVault = async (req, res) => {
  const { items, targetFolderId } = req.body;
  const userId = req.user.id;

  const client = await getDriveClient(userId);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }
  const { drive } = client;

  try {
    const results = [];

    // Recursive helper to import Drive folder structure into local DB
    const importItem = async (driveItem, localParentId) => {
      if (driveItem.type === "directory") {
        // 1. Create local directory
        const newDir = await Directory.create({
          name: driveItem.name,
          parentDir: localParentId,
          userId: userId,
          size: 0,
        });

        // 2. List children in Drive
        const response = await drive.files.list({
          q: `'${driveItem.id}' in parents and trashed = false`,
          fields: "files(id, name, mimeType, size)",
        });

        const children = response.data.files || [];
        for (const child of children) {
          const mappedChild = mapDriveItem(child);
          await importItem(mappedChild, newDir._id.toString());
        }
        return newDir;
      } else {
        // 1. Create local file entry with new ID
        const fileId = new mongoose.Types.ObjectId();
        const ext = path.extname(driveItem.name);
        const fileName = driveItem.name;
        const filePath = path.join(STORAGE_DIR, `${fileId}${ext}`);

        // 2. Stream from Drive to local storage
        const driveRes = await drive.files.get(
          { fileId: driveItem.id, alt: "media" },
          { responseType: "stream" },
        );

        await mkdir(STORAGE_DIR, { recursive: true });
        const writeStream = createWriteStream(filePath);

        await pipeline(driveRes.data, writeStream);

        const stats = await stat(filePath);
        const newFile = await File.create({
          _id: fileId,
          name: fileName,
          extension: ext,
          size: stats.size,
          userId: userId,
          parentDir: localParentId,
          type: "file",
        });

        return newFile;
      }
    };

    for (const item of items) {
      await importItem(item, targetFolderId);
      // Delete from Drive after successful transfer
      await drive.files.delete({ fileId: item.id });
    }

    return res.status(200).json({ msg: "Transfer complete", results });
  } catch (err) {
    console.error("Transfer to Vault error:", err);
    return res.status(500).json({ error: "Transfer failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /drive/transfer-from-vault
// Transfer items from local Vault storage to Google Drive.
// ─────────────────────────────────────────────────────────────────────────────
export const transferFromVault = async (req, res) => {
  const { items, targetDriveFolderId } = req.body;
  const userId = req.user.id;

  const client = await getDriveClient(userId);
  if (!client) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }
  const { drive } = client;

  try {
    const results = [];

    const exportItem = async (localItem, driveParentId) => {
      if (localItem.type === "directory") {
        // 1. Create Drive folder
        const driveFolder = await drive.files.create({
          requestBody: {
            name: localItem.name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [driveParentId || "root"],
          },
          fields: "id, name",
        });

        // 2. Get local children
        const parentDir = new mongoose.Types.ObjectId(localItem.id);
        const childFiles = await File.find({ parentDir }).lean();
        const childDirs = await Directory.find({ parentDir }).lean();

        for (const f of childFiles) {
          await exportItem({ ...f, id: f._id.toString() }, driveFolder.data.id);
        }
        for (const d of childDirs) {
          await exportItem({ ...d, id: d._id.toString() }, driveFolder.data.id);
        }
        return driveFolder.data;
      } else {
        // 1. Stream from local to Drive
        const ext = localItem.extension || "";
        const filePath = path.join(STORAGE_DIR, `${localItem.id}${ext}`);

        const response = await drive.files.create({
          requestBody: {
            name: localItem.name,
            parents: [driveParentId || "root"],
          },
          media: {
            body: createReadStream(filePath),
          },
          fields: "id, name",
        });

        return response.data;
      }
    };

    for (const item of items) {
      await exportItem(item, targetDriveFolderId);

      // Delete from Vault after successful transfer
      if (item.type === "directory") {
        // Recursive delete logic for local directory
        const deleteLocalDir = async (dirId) => {
          const files = await File.find({ parentDir: dirId });
          for (const f of files) {
            const fPath = path.join(STORAGE_DIR, `${f._id}${f.extension}`);
            try {
              await unlink(fPath);
            } catch (e) {}
            await File.deleteOne({ _id: f._id });
          }
          const dirs = await Directory.find({ parentDir: dirId });
          for (const d of dirs) {
            await deleteLocalDir(d._id);
          }
          await Directory.deleteOne({ _id: dirId });
        };
        await deleteLocalDir(item.id);
      } else {
        const fPath = path.join(
          STORAGE_DIR,
          `${item.id}${item.extension || ""}`,
        );
        try {
          await unlink(fPath);
        } catch (e) {}
        await File.deleteOne({ _id: item.id });
      }
    }

    return res.status(200).json({ msg: "Transfer complete", results });
  } catch (err) {
    console.error("Transfer from Vault error:", err);
    return res.status(500).json({ error: "Transfer failed" });
  }
};
