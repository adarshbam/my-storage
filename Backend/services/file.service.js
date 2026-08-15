import { sanitize } from "../utils/sanitize.js";
import path from "path";
import { unlink, mkdir, readFile, writeFile } from "fs/promises";
import SharedAccess from "../models/sharedAccessModel.js";
import {
  hasWriteAccess,
  verifyItemAccess,
} from "../utils/integrationHelper.js";
import { escapeRegExp } from "../utils/escapeRegExp.js";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";
import { cacheDel, cacheHgetall, cacheHset } from "../databases/redis.js";
import {
  createUploadSignedUrl,
  createDownloadSignedUrl,
  s3Client,
  uploadToB2,
  deleteFromB2,
  getObjectFromB2,
} from "../integrations/storage/s3.client.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { updateParentDirectorySize, getDirectoryPath } from "./directory.service.js";
import { processThumbnailInWorker } from "./workerPool.service.js";

const STORAGE_DIR = path.join(import.meta.dirname, "../storage");
const THUMBNAILS_DIR = path.join(STORAGE_DIR, "thumbnails");

// Ensure storage directories exist
await mkdir(STORAGE_DIR, { recursive: true });
await mkdir(THUMBNAILS_DIR, { recursive: true });

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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

export const searchFiles = async ({ query, ext, maxSize, userId, userRole, rootDirId, parentId }) => {
  const req = { user: { id: userId, role: userRole } };
  
  if (!query && !ext && !maxSize) {
    const error = new Error("Search query required");
    error.status = 400;
    throw error;
  }

  const qRegex = query ? escapeRegExp(query.toLowerCase()) : "";

  let searchFilter = {};
  if (qRegex) {
    searchFilter.name = { $regex: qRegex, $options: "i" };
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
  if (maxSize) {
    const maxSizeBytes = parseInt(maxSize, 10) * 1024 * 1024;
    searchFilter.size = { $lte: maxSizeBytes };
  }

  // Resolve target owner of search
  if (parentId && parentId !== "null" && parentId !== "undefined") {
    const parentDir = await Directory.findById(parentId)
      .select("userId path")
      .lean();
    if (!parentDir) {
      const error = new Error("Search directory not found");
      error.status = 404;
      throw error;
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
        const error = new Error("Unauthorized to access directory contents");
        error.status = 403;
        throw error;
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

  return {
    name: "Search Results",
    directories: finalMatchingDirs,
    files: finalMatchingFilesProcessed,
    parentDir: null, // No parent for flat search results
  };
};

export const getThumbnailLogic = async ({ fileId, userId, userRole, res }) => {
  const req = { user: { id: userId, role: userRole } };
  let isTrash = false;
  let file = await File.findOne({ _id: fileId })
    .select("userId path name extension size hasThumbnail")
    .lean();

  // If not found in File collection, check Trash collection
  if (!file) {
    file = await Trash.findOne({ _id: fileId })
      .select("userId path name extension size hasThumbnail")
      .lean();
    isTrash = true;
  }

  if (!file) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }
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
      const error = new Error("Unauthorized");
      error.status = 403;
      throw error;
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

  if (
    !imageExtensions.includes(fileExt) &&
    !videoExtensions.includes(fileExt)
  ) {
    const error = new Error("Thumbnail not available");
    error.status = 404;
    throw error;
  }

  // 1. Try to serve from Backblaze B2 first if hasThumbnail is true (check WebP first, then legacy JPEG)
  if (file.hasThumbnail) {
    try {
      const s3Params = {
        Bucket: process.env.BACKBLAZE_BUCKET_NAME,
        Key: `thumbnails/${fileId}.webp`,
      };
      const command = new GetObjectCommand(s3Params);
      const s3Response = await s3Client.send(command);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return s3Response.Body.pipe(res);
    } catch (webpErr) {
      // Fallback: check legacy .jpg thumbnail if present
      try {
        const legacyParams = {
          Bucket: process.env.BACKBLAZE_BUCKET_NAME,
          Key: `thumbnails/${fileId}.jpg`,
        };
        const legacyCommand = new GetObjectCommand(legacyParams);
        const legacyRes = await s3Client.send(legacyCommand);
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        return legacyRes.Body.pipe(res);
      } catch (jpgErr) {
        console.warn(
          "Thumbnail was marked in DB but not found in B2, regenerating on-demand in worker thread:",
          jpgErr.name,
        );
      }
    }
  }

  // 2. Generate on-demand in Worker Thread purely in-memory (Zero Disk I/O)
  try {
    let workerResult;

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
      workerResult = await processThumbnailInWorker({
        type: "image",
        buffer,
        width: 256,
        height: 144,
        quality: 75,
      });
    } else if (videoExtensions.includes(fileExt)) {
      const videoUrl = await createDownloadSignedUrl({
        key: `${fileId}${file.extension}`,
      });
      workerResult = await processThumbnailInWorker({
        type: "video",
        videoUrl,
        width: 256,
        height: 144,
        quality: 75,
      });
    }

    if (workerResult && workerResult.data) {
      // Upload directly to Backblaze B2 in-memory
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.BACKBLAZE_BUCKET_NAME,
        Key: `thumbnails/${fileId}.webp`,
        Body: workerResult.data,
        ContentType: "image/webp",
      });
      await s3Client.send(uploadCommand);

      // Update database
      if (isTrash) {
        await Trash.updateOne(
          { _id: fileId },
          { $set: { hasThumbnail: true } },
        );
      } else {
        await File.updateOne({ _id: fileId }, { $set: { hasThumbnail: true } });
      }

      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.send(workerResult.data);
    }
  } catch (genErr) {
    console.error("Failed multithreaded on-demand thumbnail generation:", genErr);
    const error = new Error("Thumbnail not available");
    error.status = 404;
    throw error;
  }
    const error = new Error("Thumbnail not available");
    error.status = 404;
    throw error;
  }
};

export const getFileLogic = async ({ fileId, userId, userRole, range, action, res }) => {
  const req = { user: { id: userId, role: userRole } };
  // Update openedAt timestamp for file
  await File.updateOne({ _id: fileId }, { $set: { openedAt: new Date() } });

  const file = await File.findOne({ _id: fileId })
    .select("userId name extension path size")
    .lean();

  // Check if file exists first
  if (!file) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
  }

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
      const error = new Error("You are not authorized to access this file");
      error.status = 403;
      throw error;
    }
  }

  try {
    const s3Key = `${fileId}${file.extension}`;
    const s3Params = {
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Key: s3Key,
    };

    if (range) {
      s3Params.Range = range;
    }

    const command = new GetObjectCommand(s3Params);
    const s3Response = await s3Client.send(command);

    res.setHeader("Accept-Ranges", "bytes");
    if (action === "download") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.name}"`,
      );
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
    if (
      action !== "download" &&
      file.extension &&
      textExtensions.includes(file.extension.toLowerCase())
    ) {
      res.setHeader("Content-Type", "text/plain");
    } else if (
      action !== "download" &&
      file.extension &&
      file.extension.toLowerCase() === ".svg"
    ) {
      res.setHeader("Content-Type", "image/svg+xml");
    } else {
      res.setHeader(
        "Content-Type",
        s3Response.ContentType || "application/octet-stream",
      );
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
      const error = new Error("File not found");
      error.status = 404;
      throw error;
    }
    const error = new Error("Server error fetching file from S3");
    error.status = 500;
    throw error;
  }
};

export const getStarredItems = async () => {
  const starredFiles = await File.find({ starred: true }).lean();
  const starredDirectories = await Directory.find({
    starred: true,
  }).lean();

  console.log(starredFiles, starredDirectories);
  const starredItems = starredFiles.concat(starredDirectories);
  console.log(starredItems);

  return starredItems;
};

export const setStarredItem = async ({ itemId, type }) => {
  if (!itemId) {
    const error = new Error("Invalid Id");
    error.status = 401;
    throw error;
  }

  let starredItem;

  if (type === "directory") {
    const dir = await Directory.findOne({ _id: itemId });
    if (!dir) {
      const error = new Error("Directory not found");
      error.status = 404;
      throw error;
    }
    starredItem = await Directory.findOneAndUpdate(
      { _id: itemId },
      { $set: { starred: !dir.starred } },
      { returnDocument: "after" },
    );
  } else {
    const file = await File.findOne({ _id: itemId });
    if (!file) {
      const error = new Error("File not found");
      error.status = 404;
      throw error;
    }
    starredItem = await File.findOneAndUpdate(
      { _id: itemId },
      { $set: { starred: !file.starred } },
      { returnDocument: "after" },
    );
  }

  return starredItem;
};

export const getRecentItems = async (userId, rootDirId) => {
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

  return combined;
};

export const uploadFileLogic = async ({ userId, userRole, parentDirId, rootDirId, fileBuffer, actualFileSize, headers, fileId }) => {
  const req = { user: { id: userId, role: userRole } };
  
  const parsedSize = parseInt(sanitize(headers.filesize), 10);
  const fileSize = Number.isNaN(parsedSize) ? 0 : parsedSize;

  let ownerId = userId;
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
        const error = new Error("You are not authorized to upload files in this directory");
        error.status = 403;
        throw error;
      }
    }
  }

  const id = fileId || new mongoose.Types.ObjectId().toString();
  const fileName = sanitize(headers.filename);
  const ext = path.extname(fileName);
  const fullFileName = `${id}${ext}`;
  const contentType =
    headers["content-type"] || "application/octet-stream";

  // Upload main file to Backblaze B2
  await uploadToB2({
    key: fullFileName,
    body: fileBuffer,
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
      const workerRes = await processThumbnailInWorker({
        type: "image",
        buffer: fileBuffer,
        width: 256,
        height: 144,
        quality: 75,
      });
      await uploadToB2({
        key: `thumbnails/${id}.webp`,
        body: workerRes.data,
        contentType: "image/webp",
      });
      hasThumbnail = true;
    } else if (videoExtensions.includes(fileExt)) {
      const workerRes = await processThumbnailInWorker({
        type: "video",
        buffer: fileBuffer,
        width: 256,
        height: 144,
        quality: 75,
      });
      await uploadToB2({
        key: `thumbnails/${id}.webp`,
        body: workerRes.data,
        contentType: "image/webp",
      });
      hasThumbnail = true;
    }
  } catch (tErr) {
    console.error("Multithreaded upload thumbnail generation error:", tErr.message);
  }

  const finalSize = actualFileSize || fileSize;
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
};

export const uploadVaultInitiateLogic = async ({ userId, parentDirId, rootDirId, name, size, contentType }) => {
  const dirId =
    !parentDirId || parentDirId === "root" || parentDirId === "undefined"
      ? rootDirId
      : parentDirId;

  let ownerId = userId;
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
  // ContentLength is baked into the signed URL so B2 rejects mismatched sizes
  const signedUrl = await createUploadSignedUrl({
    key: fullFileName,
    contentType,
    contentLength: size,
  });

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
  const isMedia =
    imageExtensions.includes(ext.toLowerCase()) ||
    videoExtensions.includes(ext.toLowerCase());

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

  return {
    fileId: id,
    signedUrl: signedUrl,
    fileName: fullFileName,
  };
};

export const renameFileLogic = async ({ fileId, name, userId, userRole }) => {
  const req = { user: { id: userId, role: userRole } };
  const file = await File.findOne({ _id: fileId })
    .select("userId parentDir path")
    .lean();

  if (!file) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
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
    const error = new Error("You are not authorized to rename this file");
    error.status = 403;
    throw error;
  }
  await File.updateOne(
    { _id: fileId },
    { $set: { name: sanitize(name) } },
  );
  if (file && file.parentDir) {
    await cacheDel("dir:contents:" + file.parentDir.toString());
  }
};

export const deleteFileLogic = async ({ fileId, userId, permanent, userRole }) => {
  const req = { user: { id: userId, role: userRole } };
  const fileData = await File.findOne({ _id: fileId })
    .select("userId parentDir size path extension")
    .lean();

  if (!fileData) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
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
    const error = new Error("You are not authorized to delete this file");
    error.status = 403;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isPermanent = permanent;

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
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

export const saveFileLogic = async ({ fileId, userId, userRole, content }) => {
  const req = { user: { id: userId, role: userRole } };
  const file = await File.findOne({ _id: fileId })
    .select("userId extension parentDir size path")
    .lean();

  if (!file) {
    const error = new Error("File not found");
    error.status = 404;
    throw error;
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
    const error = new Error("Unauthorized");
    error.status = 403;
    throw error;
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
};
