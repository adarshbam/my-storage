import { createReadStream, createWriteStream } from "fs";
import { Transform } from "stream";
import { sanitize } from "../utils/sanitize.js";
import path from "path";
import { stat, unlink, mkdir } from "fs/promises";
import SharedAccess from "../models/sharedAccessModel.js";
import {
  hasWriteAccess,
  verifyItemAccess,
} from "../utils/integrationHelper.js";
import { escapeRegExp } from "../utils/escapeRegExp.js";

// Absolute path to the storage directory (Backend/storage/)
const STORAGE_DIR = path.join(import.meta.dirname, "../storage");
const THUMBNAILS_DIR = path.join(STORAGE_DIR, "thumbnails");

// Ensure storage directories exist
await mkdir(STORAGE_DIR, { recursive: true });
await mkdir(THUMBNAILS_DIR, { recursive: true });
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";
import { cacheDel, cacheHgetall, cacheHset } from "../utils/redis.js";
import { getSystemConfigHelper } from "./systemConfigController.js";
import { error } from "console";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const maxFileSize = parseInt(false || "104857", 10);

export const updateParentDirectorySize = async (
  parentDirIdOrPath,
  size,
  session = null,
) => {
  const sizeChange = Number(size) || 0;
  if (!parentDirIdOrPath || sizeChange === 0) return;

  let path = [];
  if (Array.isArray(parentDirIdOrPath)) {
    path = parentDirIdOrPath;
  } else {
    const query = Directory.findById(parentDirIdOrPath).select("path");
    if (session) {
      query.session(session);
    }
    const parentDir = await query.lean();
    if (parentDir) {
      path = parentDir.path || [];
    }
  }

  if (path.length > 0) {
    const updateQuery = Directory.updateMany(
      { _id: { $in: path } },
      { $inc: { size: sizeChange } },
    );
    if (session) {
      updateQuery.session(session);
    }
    await updateQuery;

    // Clear Redis cache for all updated directories and their parent directories
    try {
      const idsToClear = [...path];

      const firstDirId = path[0];
      if (firstDirId) {
        const firstDirQuery =
          Directory.findById(firstDirId).select("parentDir");
        if (session) {
          firstDirQuery.session(session);
        }
        const firstDir = await firstDirQuery.lean();
        if (firstDir && firstDir.parentDir) {
          idsToClear.push(firstDir.parentDir);
        }
      }

      await Promise.all(
        idsToClear.flatMap((id) => [
          cacheDel("dir:contents:" + id.toString()),
          cacheDel("dir:meta:" + id.toString()),
        ]),
      );
    } catch (cacheErr) {
      console.error("Failed to clear directory size caches:", cacheErr);
    }
  }
};

export const getDirectoryPath = async (itemId, parentDirId) => {
  const parentDir = await Directory.findById(parentDirId).select("path").lean();
  const path = [...parentDir.path, itemId];
  console.log(path);
  return path;
};

const getAllDescendantIds = (rootDirId, allDirs) => {
  const descendants = new Set();
  const stack = [rootDirId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    descendants.add(currentId);

    const children = allDirs.filter((d) => d.parentDir === currentId);
    for (const child of children) {
      stack.push(child.id);
    }
  }
  return descendants;
};

export const search = async (req, res) => {
  try {
    const { q, parentId, ext, size } = req.query;
    if (!q && !ext && !size)
      return res.status(400).send("Search query required");

    const query = q ? escapeRegExp(q.toLowerCase()) : "";

    // Ensure users have loaded data
    if (!req.user || !req.user.id) {
      return res.status(401).send("Unauthorized");
    }

    let searchFilter = {};
    if (query) {
      searchFilter.name = { $regex: query, $options: "i" };
    }

    // Process extensions
    if (ext) {
      const extList = ext.split(",").map((e) => {
        let eStr = e.trim().toLowerCase();
        return eStr.startsWith(".") ? eStr : "." + eStr;
      });
      searchFilter.extension = { $in: extList };
    }

    // Process size (Max size in MB)
    if (size) {
      const maxSizeBytes = parseInt(size, 10) * 1024 * 1024;
      searchFilter.size = { $lte: maxSizeBytes };
    }

    // Resolve target owner of search
    if (parentId && parentId !== "null" && parentId !== "undefined") {
      const parentDir = await Directory.findById(parentId)
        .select("userId")
        .lean();
      if (!parentDir) {
        return res.status(404).send("Search directory not found");
      }

      const targetOwnerId = parentDir.userId.toString();

      // Check if current user is authorized to access target owner's files
      if (targetOwnerId !== req.user.id) {
        const hasAccess = await verifyItemAccess(
          targetOwnerId,
          req,
          parentId,
          "directory",
          "read",
          parentDir.path,
        );

        if (!hasAccess) {
          return res
            .status(403)
            .send("Unauthorized to access directory contents");
        }
      }

      // If authorized, restrict search to the target owner's files
      searchFilter.userId = targetOwnerId;
    } else {
      // Global search (no parentId):
      // - Admins/Owners/Managers search globally across all users
      // - Regular users search their own files + shared files
      if (
        req.user.role !== "Owner" &&
        req.user.role !== "Admin" &&
        req.user.role !== "Manager"
      ) {
        const sharedWithMe = await SharedAccess.find({
          targetUserId: req.user.id,
        }).lean();

        const filters = [{ userId: req.user.id }];

        for (const sa of sharedWithMe) {
          const ownerId = sa.userId.toString();
          if (!sa.items || sa.items.length === 0) {
            filters.push({ userId: ownerId });
          } else {
            const fileIds = sa.items
              .filter((i) => i.type === "file")
              .map((i) => i.id);
            const dirIds = sa.items
              .filter((i) => i.type === "directory")
              .map((i) => i.id);

            filters.push({
              userId: ownerId,
              $or: [
                { _id: { $in: [...fileIds, ...dirIds] } },
                { path: { $in: dirIds } },
              ],
            });
          }
        }
        searchFilter.$or = filters;
      }
    }

    let validParentIds = null;
    if (parentId && parentId !== "null" && parentId !== "undefined") {
      const allDirs = await Directory.find().select("_id parentDir").lean();
      validParentIds = getAllDescendantIds(
        parentId,
        allDirs.map((d) => ({ ...d, id: d._id.toString() })),
      );
    }

    // Filter DirectoryDB (Don't search directories if extension filter is used)
    let matchingDirs = [];
    if (!ext) {
      matchingDirs = await Directory.find(searchFilter).select("-__v").lean();
    }

    const finalMatchingDirsRaw = validParentIds
      ? matchingDirs.filter((d) => validParentIds.has(d._id.toString()))
      : matchingDirs;

    // Filter FilesDB
    const matchingFiles = await File.find(searchFilter).select("-__v").lean();

    const finalMatchingFiles = validParentIds
      ? matchingFiles.filter((f) => validParentIds.has(f.parentDir))
      : matchingFiles;

    // 1. Gather all unique folder IDs in paths across matching dirs and files
    const allDirIdsSet = new Set();
    finalMatchingDirsRaw.forEach((dir) => {
      if (dir.path) {
        dir.path.forEach((id) => {
          if (id) allDirIdsSet.add(id.toString());
        });
      }
    });
    finalMatchingFiles.forEach((f) => {
      if (f.path) {
        f.path.forEach((id) => {
          if (id) allDirIdsSet.add(id.toString());
        });
      }
    });

    // Bulk query all path directory names
    const pathDocs = await Directory.find({
      _id: { $in: Array.from(allDirIdsSet) },
    })
      .select("name")
      .lean();

    const dirMap = new Map(pathDocs.map((d) => [d._id.toString(), d.name]));

    // 2. Fetch cache in parallel for matching dirs
    const cachedMetas = await Promise.all(
      finalMatchingDirsRaw.map((dir) =>
        cacheHgetall("dir:meta:" + dir._id.toString()),
      ),
    );

    // 3. For directories that missed the cache, count files/dirs in bulk
    const cacheMissDirIds = [];
    finalMatchingDirsRaw.forEach((dir, idx) => {
      if (!cachedMetas[idx]) {
        cacheMissDirIds.push(dir._id);
      }
    });

    let filesCountMap = new Map();
    let dirsCountMap = new Map();

    if (cacheMissDirIds.length > 0) {
      const [filesCounts, dirsCounts] = await Promise.all([
        File.aggregate([
          { $match: { parentDir: { $in: cacheMissDirIds } } },
          { $group: { _id: "$parentDir", count: { $sum: 1 } } },
        ]),
        Directory.aggregate([
          { $match: { parentDir: { $in: cacheMissDirIds } } },
          { $group: { _id: "$parentDir", count: { $sum: 1 } } },
        ]),
      ]);

      filesCountMap = new Map(
        filesCounts.map((c) => [c._id.toString(), c.count]),
      );
      dirsCountMap = new Map(
        dirsCounts.map((c) => [c._id.toString(), c.count]),
      );
    }

    // 4. Map final matching directories
    const finalMatchingDirs = await Promise.all(
      finalMatchingDirsRaw.map(async (dir, idx) => {
        const dirIdStr = dir._id.toString();
        const sortedPath = (dir.path || [])
          .map((id) => {
            if (!id) return null;
            const name = dirMap.get(id.toString());
            return name ? { name } : null;
          })
          .filter(Boolean);

        const cachedMeta = cachedMetas[idx];
        if (cachedMeta) {
          return {
            ...dir,
            id: dirIdStr,
            path: sortedPath,
            itemCount: Number(cachedMeta.itemCount || 0),
          };
        }

        const fileCount = filesCountMap.get(dirIdStr) || 0;
        const dirCount = dirsCountMap.get(dirIdStr) || 0;
        const itemCount = fileCount + dirCount;

        // Populate cache asynchronously
        cacheHset(
          "dir:meta:" + dirIdStr,
          {
            size: dir.size || 0,
            itemCount: itemCount || 0,
          },
          600,
        ).catch((err) => console.error("Cache populate error in search:", err));

        return {
          ...dir,
          id: dirIdStr,
          path: sortedPath,
          itemCount: itemCount,
        };
      }),
    );

    // 5. Map final matching files
    const finalMatchingFilesProcessed = finalMatchingFiles.map((f) => {
      const sortedPath = (f.path || [])
        .map((id) => {
          if (!id) return null;
          const name = dirMap.get(id.toString());
          return name ? { name } : null;
        })
        .filter(Boolean);

      sortedPath.push({ name: f.name });

      return {
        ...f,
        id: f._id.toString(),
        path: sortedPath,
      };
    });

    // Structure result similar to directory content response
    return res.status(200).json({
      name: "Search Results",
      directories: finalMatchingDirs,
      files: finalMatchingFilesProcessed,
      parentDir: null, // No parent for flat search results
    });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const getThumbnail = async (req, res) => {
  try {
    const { fileId } = req.params;
    let file = await File.findOne({ _id: fileId }).select("userId path").lean();

    // If not found in File collection, check Trash collection
    if (!file) {
      file = await Trash.findOne({ _id: fileId }).select("userId path").lean();
    }

    if (!file) return res.status(404).send("File not found");
    if (file.userId.toString() !== req.user.id) {
      const hasAccess = await verifyItemAccess(
        file.userId,
        req,
        fileId,
        "file",
        "read",
        file.path,
      );
      if (!hasAccess) {
        return res.status(403).send("Unauthorized");
      }
    }

    const thumbnailPath = path.join(THUMBNAILS_DIR, `${fileId}.jpg`);

    // Check if thumbnail exists
    try {
      await stat(thumbnailPath);
      res.sendFile(thumbnailPath);
    } catch {
      res.status(404).send("Thumbnail not available");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const getFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { action } = req.query;
    
    // Update openedAt timestamp for file
    await File.updateOne({ _id: fileId }, { $set: { openedAt: new Date() } });

    const file = await File.findOne({ _id: fileId })
      .select("userId name extension path")
      .lean();

    // Check if file exists first
    if (!file) return res.status(404).send("File not found");

    if (file.userId.toString() !== req.user.id) {
      const hasAccess = await verifyItemAccess(
        file.userId,
        req,
        fileId,
        "file",
        "read",
        file.path,
      );
      if (!hasAccess) {
        return res
          .status(403)
          .send("You are not authorized to access this file");
      }
    }

    const filePath = path.join(STORAGE_DIR, `${fileId}${file.extension}`);

    // If action is NOT download, just send the file simple way (fixes Open File)
    if (action !== "download") {
      const textExtensions = [
        ".txt",
        ".md",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".json",
        ".css",
        ".html",
        ".xml",
        ".yml",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".h",
        ".sql",
        ".sh",
        ".bat",
        ".log",
        ".env",
        ".gitignore",
      ];
      if (
        file.extension &&
        textExtensions.includes(file.extension.toLowerCase())
      ) {
        res.setHeader("Content-Type", "text/plain");
      } else if (file.extension && file.extension.toLowerCase() === ".svg") {
        res.setHeader("Content-Type", "image/svg+xml");
      }
      return res.sendFile(path.resolve(filePath));
    }

    const stats = await stat(filePath);
    const fileSize = stats.size;

    const range = req.headers.range;

    // ✅ IMPORTANT HEADERS
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.setHeader("Accept-Ranges", "bytes");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Total-Size", fileSize);

    if (range) {
      const start = Number(range.replace(/\D/g, ""));
      const end = fileSize - 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", end - start + 1);

      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.setHeader("Content-Length", fileSize);
      createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const getAllStarredItems = async (req, res) => {
  try {
    const starredFiles = await File.find({ starred: true }).lean();
    const starredDirectories = await Directory.find({
      starred: true,
    }).lean();

    console.log(starredFiles, starredDirectories);
    const starredItems = starredFiles.concat(starredDirectories);
    console.log(starredItems);

    return res.status(200).json(starredItems);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const setStarredItem = async (req, res) => {
  try {
    const itemId = req.query.fildId;
    const { type } = req.body;

    if (!itemId) return res.status(401).json({ error: "Invalid Id" });

    let starredItem;

    if (type === "directory") {
      const dir = await Directory.findOne({ _id: itemId });
      if (!dir) return res.status(404).json({ error: "Directory not found" });
      starredItem = await Directory.findOneAndUpdate(
        { _id: itemId },
        { $set: { starred: !dir.starred } },
        { new: true }
      );
    } else {
      const file = await File.findOne({ _id: itemId });
      if (!file) return res.status(404).json({ error: "File not found" });
      starredItem = await File.findOneAndUpdate(
        { _id: itemId },
        { $set: { starred: !file.starred } },
        { new: true }
      );
    }

    return res.status(200).json(starredItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAllRecentItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const rootDirId = req.user.rootDirId;

    const recentFiles = await File.find({ userId, openedAt: { $ne: null } })
      .sort({ openedAt: -1 })
      .limit(10)
      .lean();
    const recentDirectories = await Directory.find({
      userId,
      openedAt: { $ne: null },
      _id: { $ne: rootDirId },
    })
      .sort({ openedAt: -1 })
      .limit(10)
      .lean();

    const combined = recentFiles
      .concat(recentDirectories)
      .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
      .slice(0, 10);

    return res.status(200).json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const uploadFile = async (req, res) => {
  try {
    const systemConfig = await getSystemConfigHelper();

    // Robustly handle missing or "undefined" string param
    let parentDirId = req.params.parentDirId;
    const rootDirId = req.user.rootDirId.toString();
    const parsedSize = parseInt(sanitize(req.headers.filesize), 10);
    const fileSize = Number.isNaN(parsedSize) ? 0 : parsedSize;

    if (!parentDirId || parentDirId === "undefined") {
      parentDirId = rootDirId;
    }

    if (fileSize > systemConfig.maxFileSizeLimit) {
      return req.destroy();
    }

    const rootDir = await Directory.findOne({ _id: req.user.rootDirId })
      .select("size")
      .lean();
    const usedStorage = rootDir ? rootDir.size : 0;
    const maxStorage = req.user.maxStorage || 1024 * 1024 * 1024;

    if (usedStorage + fileSize > maxStorage) {
      if (!res.headersSent) {
        res.setHeader("Connection", "close");
        res.status(400).json({ error: "Not enough storage left" });
      }
      setTimeout(() => {
        req.destroy();
      }, 0);
      return;
    }

    let recievedBytes = 0;
    const sizeValidator = new Transform({
      transform(chunk, encoding, callback) {
        recievedBytes += chunk.length;

        if (
          recievedBytes > fileSize ||
          recievedBytes > systemConfig.maxFileSizeLimit
        ) {
          // Cleanup: delete partial file on disk, thumbnail, and any DB record
          unlink(filePath).catch(() => {});
          unlink(path.join(THUMBNAILS_DIR, `${id}.jpg`)).catch(() => {});
          File.deleteOne({ _id: id }).catch(() => {});
          req.destroy(new Error("File exceeds maximum allowed size"));
        }
        callback(null, chunk);
      },
    });

    let ownerId = req.user.id;
    // Verify parent directory ownership and check shared permissions
    if (parentDirId && parentDirId !== rootDirId) {
      const parentDir = await Directory.findOne({ _id: parentDirId })
        .select("userId path")
        .lean();
      if (parentDir && parentDir.userId) {
        ownerId = parentDir.userId.toString();
        const canWrite = await verifyItemAccess(
          ownerId,
          req,
          parentDirId,
          "directory",
          "write",
          parentDir.path,
        );
        if (!canWrite) {
          return res
            .status(403)
            .send("You are not authorized to upload files in this directory");
        }
      }
    }

    // Support client-provided ID for resumption, or generate new one
    const id =
      req.headers["x-file-id"] || new mongoose.Types.ObjectId().toString();
    const fileName = sanitize(req.headers.filename);
    const startByte = parseInt(req.headers["x-start-byte"] || "0", 10);
    const ext = path.extname(fileName);
    const fullFileName = `${id}${ext}`;
    const filePath = path.join(STORAGE_DIR, fullFileName);

    // Decide flags: 'a' for append (resume), 'w' for write (new)
    const flags = startByte > 0 ? "a" : "w";

    const writeStream = createWriteStream(filePath, { flags });

    writeStream.on("error", async (err) => {
      console.error("Write stream error:", err);

      try {
        // Delete the physical file that was being uploaded
        await unlink(filePath).catch(() => {});

        // Delete the thumbnail if it exists
        const thumbnailPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
        await unlink(thumbnailPath).catch(() => {});

        // Remove the file entry from the database
        await File.deleteOne({ _id: id });
      } catch (cleanupErr) {
        console.error("Error during cleanup:", cleanupErr);
      }

      if (!res.headersSent) {
        return res.status(500).send("Error writing file");
      }
    });

    writeStream.on("finish", async () => {
      const exists = await File.findOne({ _id: id }).select("_id").lean();

      await updateParentDirectorySize(parentDirId, fileSize);

      let hasThumbnail = false;

      // Generate thumbnail if image or video
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".tiff",
        ".svg",
      ];
      const videoExtensions = [".mp4", ".webm", ".mkv", ".avi", ".mov"];

      try {
        const thumbnailPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
        const fileExt = ext.toLowerCase();

        if (imageExtensions.includes(fileExt)) {
          await sharp(filePath)
            .resize(256, 128, { fit: "cover" }) // Resize to 256x128 as requested (16:8 ratio)
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          hasThumbnail = true;
        } else if (videoExtensions.includes(fileExt)) {
          await new Promise((resolve, reject) => {
            ffmpeg(filePath)
              .on("end", () => {
                hasThumbnail = true;
                resolve();
              })
              .on("error", (err) => {
                console.error("Failed to generate video thumbnail", err);
                resolve(); // resolve anyway to continue file upload
              })
              .screenshots({
                timestamps: ["1"], // capture at 1 second
                filename: `${id}.jpg`,
                folder: THUMBNAILS_DIR,
                size: "256x128",
              });
          });
        }
      } catch (err) {
        console.error("Failed to generate thumbnail", err);
      }

      console.log(parentDirId);

      const dirPath = await getDirectoryPath(id, parentDirId);

      if (!exists) {
        await File.create({
          _id: id,
          extension: ext,
          type: "file",
          userId: ownerId,
          path: dirPath,
          size: fileSize,
          name: fileName,
          parentDir: parentDirId,
          hasThumbnail,
        });
      }

      await cacheDel("dir:contents:" + parentDirId);
      await cacheDel("dir:meta:" + parentDirId);

      if (!res.writableEnded) return res.status(201).send("File uploaded");
    });

    // If we have content in req.body (from New File modal), write it and end
    if (req.body && req.body.content !== undefined) {
      writeStream.write(req.body.content);
      writeStream.end();
    } else {
      // Otherwise pipe the binary stream (from TransferManager)
      req.pipe(sizeValidator).pipe(writeStream);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const renameFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findOne({ _id: fileId })
      .select("userId parentDir path")
      .lean();

    if (!file) {
      return res.status(404).send("File not found");
    }
    const ownerId = file.userId ? file.userId.toString() : req.user.id;
    const canWrite = await verifyItemAccess(
      ownerId,
      req,
      fileId,
      "file",
      "write",
      file.path,
    );
    if (!canWrite) {
      return res.status(403).send("You are not authorized to rename this file");
    }
    const { newFileName } = req.body;
    await File.updateOne(
      { _id: fileId },
      { $set: { name: sanitize(newFileName) } },
    );
    if (file && file.parentDir) {
      await cacheDel("dir:contents:" + file.parentDir.toString());
    }
    return res.status(200).send("File renamed successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileData = await File.findOne({ _id: fileId })
      .select("userId parentDir size path")
      .lean();

    if (!fileData) {
      return res.status(404).send("File not found");
    }
    const ownerId = fileData.userId ? fileData.userId.toString() : req.user.id;
    const canWrite = await verifyItemAccess(
      ownerId,
      req,
      fileId,
      "file",
      "write",
      fileData.path,
    );
    if (!canWrite) {
      return res.status(403).send("You are not authorized to delete this file");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const isPermanent = req.query.permanent === "true";

      await updateParentDirectorySize(
        (fileData.path || []).slice(0, -1),
        -fileData.size,
        session,
      );

      const deletedFile = await File.findOne({ _id: fileId })
        .select("-__v")
        .session(session)
        .lean();
      if (deletedFile) {
        await File.deleteOne({ _id: fileId }).session(session);
        if (!isPermanent) {
          await Trash.create([deletedFile], { session });
        } else {
          // Physically delete the file and thumbnail
          const filePath = path.join(
            STORAGE_DIR,
            `${fileId}${fileData.extension}`,
          );
          const thumbnailPath = path.join(THUMBNAILS_DIR, `${fileId}.jpg`);
          unlink(filePath).catch(() => {});
          unlink(thumbnailPath).catch(() => {});
        }
      }

      await session.commitTransaction();

      if (fileData.parentDir) {
        await cacheDel("dir:contents:" + fileData.parentDir.toString());
        await cacheDel("dir:meta:" + fileData.parentDir.toString());
      }

      return res.status(200).send("File deleted successfully");
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const saveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content } = req.body;
    const file = await File.findOne({ _id: fileId })
      .select("userId extension parentDir size path")
      .lean();

    if (!file) return res.status(404).send("File not found");
    const ownerId = file.userId ? file.userId.toString() : req.user.id;
    const canWrite = await verifyItemAccess(
      ownerId,
      req,
      fileId,
      "file",
      "write",
      file.path,
    );
    if (!canWrite) {
      return res.status(403).send("Unauthorized");
    }

    const filePath = path.join(STORAGE_DIR, `${fileId}${file.extension}`);
    const writeStream = createWriteStream(filePath);
    writeStream.write(content);
    writeStream.end();

    writeStream.on("finish", async () => {
      const stats = await stat(filePath);
      const sizeDiff = stats.size - (file.size || 0);
      await File.updateOne({ _id: fileId }, { size: stats.size });
      if (sizeDiff !== 0) {
        await updateParentDirectorySize(file.parentDir, sizeDiff);
      }
      if (file && file.parentDir) {
        await cacheDel("dir:meta:" + file.parentDir.toString());
        await cacheDel("dir:contents:" + file.parentDir.toString());
      }
      return res.status(200).send("File saved");
    });

    writeStream.on("error", (err) => {
      console.error(err);
      return res.status(500).send("Error saving file");
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};
