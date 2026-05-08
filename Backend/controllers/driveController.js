import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../config.js";
import { google } from "googleapis";
import { Readable } from "stream";
import archiver from "archiver";

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
      fields: "name, mimeType",
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
    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    if (action === "download") {
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    }

    // 3. Stream the file bytes directly to the response — zero memory buffering!
    const fileRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );

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

