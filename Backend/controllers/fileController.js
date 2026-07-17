import { createReadStream, createWriteStream } from "fs";
import { Transform } from "stream";
import { sanitize } from "../utils/sanitize.js";
import path from "path";
import { stat, unlink, mkdir, readFile, writeFile } from "fs/promises";
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
import {
  createUploadSignedUrl,
  createDownloadSignedUrl,
  s3Client,
  uploadToB2,
  deleteFromB2,
  getObjectFromB2,
} from "../utils/s3.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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
  if (!parentDirId) return [itemId];
  const parentDir = await Directory.findById(parentDirId).select("path").lean();
  const path = parentDir && parentDir.path ? [...parentDir.path, itemId] : [itemId];
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
    let isTrash = false;
    let file = await File.findOne({ _id: fileId }).select("userId path name extension size hasThumbnail").lean();

    // If not found in File collection, check Trash collection
    if (!file) {
      file = await Trash.findOne({ _id: fileId }).select("userId path name extension size hasThumbnail").lean();
      isTrash = true;
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
    const fileExt = file.extension ? file.extension.toLowerCase() : "";

    if (!imageExtensions.includes(fileExt) && !videoExtensions.includes(fileExt)) {
      return res.status(404).send("Thumbnail not available");
    }

    // 1. Try to serve from Backblaze B2 first if hasThumbnail is true
    if (file.hasThumbnail) {
      try {
        const s3Params = {
          Bucket: process.env.BACKBLAZE_BUCKET_NAME,
          Key: `thumbnails/${fileId}.jpg`,
        };
        const command = new GetObjectCommand(s3Params);
        const s3Response = await s3Client.send(command);
        res.setHeader("Content-Type", "image/jpeg");
        return s3Response.Body.pipe(res);
      } catch (s3Err) {
        console.warn("Thumbnail was marked in DB but not found in B2, regenerating on-demand:", s3Err.name);
      }
    }

    // 2. Generate on-demand from Backblaze B2 original file, upload to B2, and send to client
    const tempThumbnailPath = path.join(THUMBNAILS_DIR, `${fileId}.jpg`);

    try {
      if (imageExtensions.includes(fileExt)) {
        const s3Params = {
          Bucket: process.env.BACKBLAZE_BUCKET_NAME,
          Key: `${fileId}${file.extension}`,
        };
        const command = new GetObjectCommand(s3Params);
        const s3Response = await s3Client.send(command);
        const chunks = [];
        for await (const chunk of s3Response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        await sharp(buffer, { failOnError: false })
          .resize(256, 128, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toFile(tempThumbnailPath);
      } else if (videoExtensions.includes(fileExt)) {
        const videoUrl = await createDownloadSignedUrl({ key: `${fileId}${file.extension}` });
        await new Promise((resolve, reject) => {
          ffmpeg(videoUrl)
            .on("end", resolve)
            .on("error", reject)
            .screenshots({
              timestamps: ["1"],
              filename: `${fileId}.jpg`,
              folder: THUMBNAILS_DIR,
              size: "256x128",
            });
        });
      }

      // Read generated temp thumbnail
      const thumbnailBuffer = await readFile(tempThumbnailPath);

      // Upload to Backblaze B2
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.BACKBLAZE_BUCKET_NAME,
        Key: `thumbnails/${fileId}.jpg`,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
      });
      await s3Client.send(uploadCommand);

      // Delete local temporary thumbnail immediately
      await unlink(tempThumbnailPath).catch(() => {});

      // Update database: set hasThumbnail: true
      if (isTrash) {
        await Trash.updateOne({ _id: fileId }, { $set: { hasThumbnail: true } });
      } else {
        await File.updateOne({ _id: fileId }, { $set: { hasThumbnail: true } });
      }

      // Send the newly generated thumbnail buffer
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(thumbnailBuffer);

    } catch (genErr) {
      console.error("Failed on-demand thumbnail generation:", genErr);
      // Clean up temp file if it was created
      await unlink(tempThumbnailPath).catch(() => {});
      return res.status(404).send("Thumbnail not available");
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
      .select("userId name extension path size")
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

    try {
      const s3Key = `${fileId}${file.extension}`;
      const s3Params = {
        Bucket: process.env.BACKBLAZE_BUCKET_NAME,
        Key: s3Key,
      };

      const range = req.headers.range;
      if (range) {
        s3Params.Range = range;
      }

      const command = new GetObjectCommand(s3Params);
      const s3Response = await s3Client.send(command);

      res.setHeader("Accept-Ranges", "bytes");
      if (action === "download") {
        res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
      }

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
      if (action !== "download" && file.extension && textExtensions.includes(file.extension.toLowerCase())) {
        res.setHeader("Content-Type", "text/plain");
      } else if (action !== "download" && file.extension && file.extension.toLowerCase() === ".svg") {
        res.setHeader("Content-Type", "image/svg+xml");
      } else {
        res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");
      }

      let totalSize = file.size || 0;
      if (s3Response.ContentRange) {
        const parts = s3Response.ContentRange.split("/");
        if (parts.length > 1) {
          totalSize = Number(parts[1]) || totalSize;
        }
      }
      res.setHeader("X-Total-Size", totalSize);

      if (range) {
        res.status(206);
        if (s3Response.ContentRange) {
          res.setHeader("Content-Range", s3Response.ContentRange);
        }
        if (s3Response.ContentLength) {
          res.setHeader("Content-Length", s3Response.ContentLength);
        }
      } else {
        if (s3Response.ContentLength) {
          res.setHeader("Content-Length", s3Response.ContentLength);
        }
      }

      s3Response.Body.pipe(res);
    } catch (s3Err) {
      console.error("S3 error:", s3Err);
      if (s3Err.name === "NoSuchKey") {
        return res.status(404).send("File not found");
      }
      return res.status(500).send("Server error fetching file from S3");
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

    const id =
      req.headers["x-file-id"] || new mongoose.Types.ObjectId().toString();
    const fileName = sanitize(req.headers.filename);
    const ext = path.extname(fileName);
    const fullFileName = `${id}${ext}`;
    const contentType = req.headers["content-type"] || "application/octet-stream";

    let buffer;
    if (req.body && req.body.content !== undefined) {
      buffer = Buffer.from(req.body.content, "utf-8");
    } else {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    }

    const actualSize = buffer.length;
    if (actualSize > systemConfig.maxFileSizeLimit) {
      return res.status(400).send("File exceeds maximum allowed size");
    }

    // Upload main file to Backblaze B2
    await uploadToB2({
      key: fullFileName,
      body: buffer,
      contentType,
    });

    let hasThumbnail = false;
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
    const fileExt = ext.toLowerCase();

    try {
      if (imageExtensions.includes(fileExt)) {
        const thumbBuffer = await sharp(buffer)
          .resize(256, 128, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();
        await uploadToB2({
          key: `thumbnails/${id}.jpg`,
          body: thumbBuffer,
          contentType: "image/jpeg",
        });
        hasThumbnail = true;
      } else if (videoExtensions.includes(fileExt)) {
        const tempVideoPath = path.join(THUMBNAILS_DIR, `temp_${id}${ext}`);
        const tempThumbPath = path.join(THUMBNAILS_DIR, `${id}.jpg`);
        try {
          await writeFile(tempVideoPath, buffer);
          await new Promise((resolve, reject) => {
            ffmpeg(tempVideoPath)
              .on("end", resolve)
              .on("error", reject)
              .screenshots({
                timestamps: ["1"],
                filename: `${id}.jpg`,
                folder: THUMBNAILS_DIR,
                size: "256x128",
              });
          });
          const thumbBuffer = await readFile(tempThumbPath);
          await uploadToB2({
            key: `thumbnails/${id}.jpg`,
            body: thumbBuffer,
            contentType: "image/jpeg",
          });
          hasThumbnail = true;
        } catch (vErr) {
          console.error("Video thumbnail generation error:", vErr);
        } finally {
          await unlink(tempVideoPath).catch(() => {});
          await unlink(tempThumbPath).catch(() => {});
        }
      }
    } catch (tErr) {
      console.error("Thumbnail generation error:", tErr);
    }

    const finalSize = actualSize || fileSize;
    const exists = await File.findOne({ _id: id }).select("_id").lean();
    await updateParentDirectorySize(parentDirId, finalSize);

    const dirPath = await getDirectoryPath(id, parentDirId);

    if (!exists) {
      await File.create({
        _id: id,
        extension: ext,
        type: "file",
        userId: ownerId,
        path: dirPath,
        size: finalSize,
        name: fileName,
        parentDir: parentDirId,
        hasThumbnail,
      });
    }

    await cacheDel("dir:contents:" + parentDirId);
    await cacheDel("dir:meta:" + parentDirId);

    if (!res.writableEnded) return res.status(201).send("File uploaded");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadVaultInitate = async (req, res) => {
  try {
    const { name, size, contentType, parentDirId } = req.body;
    
    // Default to root dir if no parentDirId provided
    const rootDirId = req.user.rootDirId.toString();
    const dirId = !parentDirId || parentDirId === "root" || parentDirId === "undefined" ? rootDirId : parentDirId;
    
    let ownerId = req.user.id;
    if (dirId) {
      const dir = await Directory.findOne({ _id: dirId }).lean();
      if (dir && dir.userId) {
        ownerId = dir.userId.toString();
      }
    }

    const id = new mongoose.Types.ObjectId().toString();
    const ext = path.extname(name);
    const fullFileName = `${id}${ext}`;
    
    // Get the signed URL for the client to upload to
    const signedUrl = await createUploadSignedUrl({ key: fullFileName, contentType });
    
    const dirPath = dirId ? await getDirectoryPath(id, dirId) : [];

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
    const isMedia = imageExtensions.includes(ext.toLowerCase()) || videoExtensions.includes(ext.toLowerCase());

    // Create the initial file entry
    await File.create({
      _id: id,
      extension: ext,
      type: "file",
      userId: ownerId,
      path: dirPath,
      size: size || 0,
      name: name,
      parentDir: dirId,
      hasThumbnail: isMedia,
    });

    if (size) {
      await updateParentDirectorySize(dirId, size);
    }

    await cacheDel("dir:contents:" + dirId);
    await cacheDel("dir:meta:" + dirId);

    return res.status(200).json({
      fileId: id,
      signedUrl: signedUrl,
      fileName: fullFileName,
    });
  } catch (err) {
    console.error("Vault Upload Initiate Error:", err);
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
      .select("userId parentDir size path extension")
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
          // Physically delete the file and thumbnail from Backblaze B2
          await deleteFromB2({ key: `${fileId}${fileData.extension}` });
          await deleteFromB2({ key: `thumbnails/${fileId}.jpg` });
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

    const fileBuffer = Buffer.from(content || "", "utf-8");
    await uploadToB2({
      key: `${fileId}${file.extension}`,
      body: fileBuffer,
      contentType: "text/plain",
    });

    const newSize = fileBuffer.length;
    const sizeDiff = newSize - (file.size || 0);
    await File.updateOne({ _id: fileId }, { size: newSize });
    if (sizeDiff !== 0) {
      await updateParentDirectorySize(file.parentDir, sizeDiff);
    }
    if (file && file.parentDir) {
      await cacheDel("dir:meta:" + file.parentDir.toString());
      await cacheDel("dir:contents:" + file.parentDir.toString());
    }
    return res.status(200).send("File saved");
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).send("Server error");
  }
};

