import archiver from "archiver";
import path from "path";
import mongoose from "mongoose";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import GitWorkspace from "../models/gitWorkspaceModel.js";
import Trash from "../models/trashModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import {
  hasWriteAccess,
  verifyItemAccess,
} from "../utils/integrationHelper.js";
import {
  cacheDel,
  cacheHgetall,
  cacheHset,
  cacheGet,
  cacheSet,
} from "../databases/redis.js";
import { deleteByParentChain } from "./trash.service.js";
import {
  copyInB2,
  deleteFromB2,
  deleteMultipleFromB2,
  getObjectFromB2,
} from "../integrations/storage/s3.client.js";
import {
  createCloudflareCdnDownloadUrl,
  generatePublicMediaToken,
  createPublicMediaCdnUrl,
} from "../integrations/cdn/cloudflare.service.js";
import { CLIENT_URL, BACKEND_URL } from "../config/config.js";
import crypto from "node:crypto";
import { extractHostname, matchDomainPattern } from "./file.service.js";
import User from "../models/userModel.js";
import {
  storageThresholdReached,
  storageLimitResolved,
} from "./notification.service.js";
import { withTransaction } from "../utils/transaction.js";

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

      // Check storage threshold on root directory
      const rootDir = await Directory.findById(path[0])
        .select("userId size")
        .lean();
      if (rootDir && rootDir.userId) {
        const user = await User.findById(rootDir.userId)
          .select("maxStorage")
          .lean();
        if (user && user.maxStorage) {
          const usedStorage = rootDir.size;
          const percentage = Math.floor((usedStorage / user.maxStorage) * 100);
          if (percentage >= 100) {
            await storageThresholdReached({
              userId: rootDir.userId,
              percentage: 100,
              usedBytes: usedStorage,
              maxBytes: user.maxStorage,
            }).catch(() => {});
          } else if (percentage >= 90) {
            await storageThresholdReached({
              userId: rootDir.userId,
              percentage: 90,
              usedBytes: usedStorage,
              maxBytes: user.maxStorage,
            }).catch(() => {});
          } else if (percentage >= 80) {
            await storageThresholdReached({
              userId: rootDir.userId,
              percentage: 80,
              usedBytes: usedStorage,
              maxBytes: user.maxStorage,
            }).catch(() => {});
          } else {
            await storageLimitResolved({ userId: rootDir.userId }).catch(() => {});
          }
        }
      }
    } catch (cacheErr) {
      console.error("Failed to clear directory size caches:", cacheErr);
    }
  }
};

export const getDirectoryPath = async (itemId, parentDirId) => {
  if (!parentDirId) {
    if (!itemId) return [];
    const dir = await Directory.findById(itemId).select("path").lean();
    return dir && dir.path ? [...dir.path, itemId] : [itemId];
  }
  const parentDir = await Directory.findById(parentDirId).select("path").lean();
  const path =
    parentDir && parentDir.path ? [...parentDir.path, itemId] : [itemId];
  return path;
};

const ALREADY_COMPRESSED_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".webm",
  ".mp3",
  ".aac",
  ".m4a",
  ".ogg",
  ".flac",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".zip",
  ".gz",
  ".7z",
  ".rar",
]);

const normalizeFileExtension = (extension) => {
  if (!extension || typeof extension !== "string") return "";
  return extension.startsWith(".") ? extension : `.${extension}`;
};

const sanitizeDownloadName = (name) => {
  const cleaned = String(name || "download")
    .replace(/[\r\n"\\/:*?<>|\x00-\x1F]/g, "_")
    .trim()
    .replace(/[. ]+$/g, "");
  return cleaned || "download";
};

const sanitizeZipSegment = (rawName, { isDirectory = false } = {}) => {
  let cleaned = String(rawName || "unnamed")
    .replace(/[/\\:*?"<>|\x00-\x1F]/g, "_")
    .trim();
  if (isDirectory) {
    cleaned = cleaned.replace(/[. ]+$/g, "");
  } else {
    cleaned = cleaned.replace(/ +$/g, "");
  }
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "unnamed";
  }
  return cleaned;
};

const buildZipContentDisposition = (baseName) => {
  const safeBase = sanitizeDownloadName(baseName);
  const zipName = safeBase.toLowerCase().endsWith(".zip")
    ? safeBase
    : `${safeBase}.zip`;
  const asciiFallback = zipName.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(zipName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

const deduplicateZipPath = (zipDirPath, rawName, usedPaths, options = {}) => {
  const baseName = sanitizeZipSegment(rawName, options);
  let candidate = zipDirPath ? path.posix.join(zipDirPath, baseName) : baseName;
  if (!usedPaths.has(candidate)) {
    usedPaths.add(candidate);
    return candidate;
  }
  const dotIdx = options.isDirectory ? -1 : baseName.lastIndexOf(".");
  const stem = dotIdx > 0 ? baseName.slice(0, dotIdx) : baseName;
  const ext = dotIdx > 0 ? baseName.slice(dotIdx) : "";
  let counter = 1;
  while (usedPaths.has(candidate)) {
    const numbered = `${stem} (${counter})${ext}`;
    candidate = zipDirPath ? path.posix.join(zipDirPath, numbered) : numbered;
    counter++;
  }
  usedPaths.add(candidate);
  return candidate;
};

const buildFileB2Keys = (file) => {
  const idStr = file._id.toString();
  const docExt =
    file.extension !== undefined && file.extension !== null
      ? file.extension === ""
        ? ""
        : normalizeFileExtension(file.extension)
      : null;
  const nameExt = normalizeFileExtension(path.posix.extname(file.name || ""));

  const candidates = [];
  if (docExt !== null) {
    candidates.push(`${idStr}${docExt}`);
  }
  if (nameExt && !candidates.includes(`${idStr}${nameExt}`)) {
    candidates.push(`${idStr}${nameExt}`);
  }
  if (!candidates.includes(idStr)) {
    candidates.push(idStr);
  }
  return {
    s3Keys: candidates,
    ext: (docExt || nameExt || "").toLowerCase(),
  };
};

const collectDirectoryEntries = async (
  dirId,
  zipDirPath,
  { FileModel, DirectoryModel, entries, emptyDirs, usedFilePaths, usedDirPaths },
) => {
  const dirFiles = await FileModel.find({
    parentDir: dirId,
    uploadStatus: { $ne: "uploading" },
  })
    .select("_id extension name size")
    .lean();

  for (const file of dirFiles) {
    if (!file) continue;
    const { s3Keys, ext } = buildFileB2Keys(file);
    const zipPath = deduplicateZipPath(zipDirPath, file.name, usedFilePaths, {
      isDirectory: false,
    });
    entries.push({
      s3Key: s3Keys[0],
      fallbackKeys: s3Keys.slice(1),
      zipPath,
      size: Number(file.size) || 0,
      ext,
    });
  }

  const childDirs = await DirectoryModel.find({ parentDir: dirId })
    .select("_id name")
    .lean();

  if (dirFiles.length === 0 && childDirs.length === 0 && zipDirPath) {
    emptyDirs.push(zipDirPath);
  }

  for (const subDir of childDirs) {
    if (!subDir) continue;
    const subZipPath = deduplicateZipPath(zipDirPath, subDir.name, usedDirPaths, {
      isDirectory: true,
    });
    await collectDirectoryEntries(subDir._id.toString(), subZipPath, {
      FileModel,
      DirectoryModel,
      entries,
      emptyDirs,
      usedFilePaths,
      usedDirPaths,
    });
  }
};

const appendStreamToArchive = (archive, bodyStream, options, isAborted) =>
  new Promise((resolve, reject) => {
    if (isAborted()) {
      bodyStream?.destroy?.();
      return reject(new Error("Download aborted by client"));
    }

    let settled = false;
    const cleanup = () => {
      bodyStream.removeListener("end", onEnd);
      bodyStream.removeListener("error", onError);
      bodyStream.removeListener("close", onClose);
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };
    const onClose = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (isAborted()) {
        reject(new Error("Download aborted by client"));
      } else if (bodyStream.readableEnded === false) {
        reject(new Error("Upstream object stream closed prematurely"));
      } else {
        resolve();
      }
    };

    bodyStream.on("end", onEnd);
    bodyStream.on("error", onError);
    bodyStream.on("close", onClose);
    archive.append(bodyStream, options);
  });

const fetchObjectWithFallback = async (fetchObject, entry) => {
  const keys = [entry.s3Key, ...(entry.fallbackKeys || [])];
  let lastErr = null;
  for (const key of keys) {
    try {
      return await fetchObject({ key });
    } catch (err) {
      lastErr = err;
      if (err?.name !== "NoSuchKey" && err?.$metadata?.httpStatusCode !== 404) {
        throw err;
      }
    }
  }
  throw lastErr;
};

/**
 * Streams a set of Vault files and directories directly from Backblaze B2 into a ZIP response.
 */
export const streamItemsAsZip = async ({
  rootName,
  files = [],
  directories = [],
  res,
  deps = {},
}) => {
  const FileModel = deps.File || File;
  const DirectoryModel = deps.Directory || Directory;
  const fetchObject = deps.getObjectFromB2 || getObjectFromB2;

  const entries = [];
  const emptyDirs = [];
  const usedFilePaths = new Set();
  const usedDirPaths = new Set();

  for (const file of files) {
    if (!file || file.uploadStatus === "uploading") continue;
    const { s3Keys, ext } = buildFileB2Keys(file);
    const zipPath = deduplicateZipPath("", file.name, usedFilePaths, {
      isDirectory: false,
    });
    entries.push({
      s3Key: s3Keys[0],
      fallbackKeys: s3Keys.slice(1),
      zipPath,
      size: Number(file.size) || 0,
      ext,
    });
  }

  for (const dir of directories) {
    if (!dir) continue;
    const dirZipPath = deduplicateZipPath("", dir.name, usedDirPaths, {
      isDirectory: true,
    });
    await collectDirectoryEntries(dir._id.toString(), dirZipPath, {
      FileModel,
      DirectoryModel,
      entries,
      emptyDirs,
      usedFilePaths,
      usedDirPaths,
    });
  }

  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  const totalFiles = entries.length;

  res.setHeader("Content-Disposition", buildZipContentDisposition(rootName));
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Cache-Control", "no-transform");
  res.setHeader("X-Total-Size", totalSize);
  res.setHeader("X-Total-Files", totalFiles);

  const archive = archiver("zip", { zlib: { level: 5 } });
  let aborted = false;
  let activeBodyStream = null;
  let archiveError = null;

  const onClose = () => {
    if (!res.writableEnded) {
      aborted = true;
      try {
        activeBodyStream?.destroy?.();
      } catch {
        // Ignore stream cleanup errors
      }
      try {
        archive.abort();
      } catch {
        // Ignore archiver abort errors
      }
    }
  };
  res.on("close", onClose);

  archive.on("error", (err) => {
    archiveError = err;
    console.error("Archive Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.destroy(err);
    }
  });

  archive.pipe(res);

  try {
    for (const emptyDir of emptyDirs) {
      if (aborted || archiveError) break;
      const normalizedDir = emptyDir.endsWith("/") ? emptyDir : `${emptyDir}/`;
      archive.append(Buffer.alloc(0), { name: normalizedDir });
    }

    for (const entry of entries) {
      if (aborted || archiveError) break;
      const s3Res = await fetchObjectWithFallback(fetchObject, entry);
      const bodyStream = s3Res?.Body;
      if (!bodyStream) {
        const missingErr = new Error(`Missing object body for key ${entry.s3Key}`);
        missingErr.status = 404;
        throw missingErr;
      }
      activeBodyStream = bodyStream;
      const store = ALREADY_COMPRESSED_EXTENSIONS.has(entry.ext);
      await appendStreamToArchive(
        archive,
        bodyStream,
        { name: entry.zipPath, store },
        () => aborted || Boolean(archiveError),
      );
      activeBodyStream = null;
    }

    if (aborted) return;
    if (archiveError) throw archiveError;

    await archive.finalize();
  } catch (err) {
    try {
      activeBodyStream?.destroy?.();
    } catch {
      // Ignore stream cleanup errors
    }
    try {
      archive.abort();
    } catch {
      // Ignore archiver abort errors
    }
    if (aborted) return;
    if (res.headersSent) {
      res.destroy(err);
      return;
    }
    if (err.name === "NoSuchKey" && !err.status) {
      err.status = 404;
    }
    throw err;
  } finally {
    res.removeListener("close", onClose);
  }
};

export const getDirectorySize = async (dirId) => {
  let size = 0;
  let count = 0;

  const files = await File.find({
    parentDir: dirId,
    uploadStatus: { $ne: "uploading" },
  })
    .select("size")
    .lean();
  for (const file of files) {
    size += file.size || 0;
    count++;
  }

  const childDirs = await Directory.find({ parentDir: dirId })
    .select("_id")
    .lean();
  for (const child of childDirs) {
    const childSize = await getDirectorySize(child._id.toString());
    size += childSize.size;
    count += childSize.count;
  }

  return { size, count };
};

export const populateDirectoryItemCounts = async (directories = []) => {
  if (!directories || directories.length === 0) return [];

  const dirIds = directories.map((d) => (d && d._id ? d._id : d));
  const dirIdStrs = dirIds.map((id) => (id ? id.toString() : ""));

  // 1. Try parallel Redis cache fetch for dir:meta:<id>
  const cachedMetas = await Promise.all(
    dirIdStrs.map((idStr) =>
      idStr ? cacheHgetall("dir:meta:" + idStr).catch(() => null) : null,
    ),
  );

  // 2. Identify missing IDs
  const missDirIds = [];
  directories.forEach((dir, idx) => {
    const cached = cachedMetas[idx];
    if (!cached || cached.itemCount === undefined) {
      const id = dir && dir._id ? dir._id : dir;
      if (id) missDirIds.push(id);
    }
  });

  let filesCountMap = new Map();
  let dirsCountMap = new Map();

  if (missDirIds.length > 0) {
    const [filesCounts, dirsCounts] = await Promise.all([
      File.aggregate([
        { $match: { parentDir: { $in: missDirIds }, uploadStatus: { $ne: "uploading" } } },
        { $group: { _id: "$parentDir", count: { $sum: 1 } } },
      ]),
      Directory.aggregate([
        { $match: { parentDir: { $in: missDirIds } } },
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

  // 3. Assemble results and populate cache for misses
  const populated = await Promise.all(
    directories.map(async (dir, idx) => {
      const isPlainObject = typeof dir === "object" && dir !== null;
      const dirObj =
        dir && dir.toObject
          ? dir.toObject()
          : isPlainObject
            ? { ...dir }
            : { _id: dir };
      const dirIdStr = dirObj._id ? dirObj._id.toString() : (dir ? dir.toString() : "");
      const cached = cachedMetas[idx];

      if (cached && cached.itemCount !== undefined) {
        const fCount = Number(cached.filesCount || 0);
        const dCount = Number(cached.directoriesCount || 0);
        const iCount = Number(cached.itemCount || 0);
        return {
          ...dirObj,
          _id: dirIdStr,
          type: "directory",
          filesCount: fCount,
          directoriesCount: dCount,
          itemCount: iCount,
          items: iCount,
        };
      }

      const fCount = filesCountMap.get(dirIdStr) || 0;
      const dCount = dirsCountMap.get(dirIdStr) || 0;
      const iCount = fCount + dCount;

      // Populate cache asynchronously
      if (dirIdStr) {
        cacheHset(
          "dir:meta:" + dirIdStr,
          {
            size: dirObj.size || 0,
            itemCount: iCount,
            filesCount: fCount,
            directoriesCount: dCount,
          },
          600,
        ).catch((err) => console.error("Cache populate error in meta:", err));
      }

      return {
        ...dirObj,
        _id: dirIdStr,
        type: "directory",
        filesCount: fCount,
        directoriesCount: dCount,
        itemCount: iCount,
        items: iCount,
      };
    }),
  );

  return populated;
};

export const getAvailableName = async (
  parentDirId,
  originalName,
  isDirectory,
  session = null,
) => {
  let name = originalName;
  let ext = "";
  let base = originalName;

  if (!isDirectory) {
    ext = path.extname(originalName);
    base = path.basename(originalName, ext);
  }

  let counter = 0;
  let exists = true;

  while (exists) {
    const checkName =
      counter === 0
        ? name
        : `${base} - Copy${counter > 1 ? ` (${counter})` : ""}${ext}`;

    let match;
    if (isDirectory) {
      const query = Directory.findOne({
        parentDir: parentDirId,
        name: checkName,
      })
        .select("_id")
        .lean();
      if (session) query.session(session);
      match = await query;
    } else {
      const query = File.findOne({ parentDir: parentDirId, name: checkName })
        .select("_id")
        .lean();
      if (session) query.session(session);
      match = await query;
    }

    if (!match) {
      return checkName;
    }
    counter++;
  }
};

export const updateDirectoryPathAndDescendants = async (
  dirId,
  newParentDirId,
  session,
) => {
  const dir = await Directory.findById(dirId).session(session);
  if (!dir) return;

  const parentDir = await Directory.findById(newParentDirId).session(session);
  const newParentPath = parentDir ? parentDir.path : [];

  const newDirPath = [...newParentPath, dirId];
  dir.parentDir = newParentDirId;
  dir.path = newDirPath;
  await dir.save({ session });

  // Update direct child files
  const files = await File.find({ parentDir: dirId }).session(session);
  for (const file of files) {
    file.path = [...newDirPath, file._id];
    await file.save({ session });
  }

  // Recursively update direct child directories
  const childDirs = await Directory.find({ parentDir: dirId }).session(session);
  for (const childDir of childDirs) {
    await updateDirectoryPathAndDescendants(childDir._id, dirId, session);
  }
};

export const copyDirectoryRecursive = async (
  sourceDirId,
  newDirId,
  targetParentDirId,
  targetOwnerId,
  parentPath,
  session,
) => {
  const sourceDir = await Directory.findById(sourceDirId)
    .session(session)
    .lean();
  if (!sourceDir) return;

  const newDirPath = [...parentPath, newDirId];
  const resolvedName = sourceDir.name;

  await Directory.create(
    [
      {
        _id: newDirId,
        name: resolvedName,
        userId: targetOwnerId,
        parentDir: targetParentDirId,
        path: newDirPath,
        size: sourceDir.size,
        provider: sourceDir.provider || "local",
      },
    ],
    { session },
  );

  // 1. Copy all direct files in this subdirectory
  const files = await File.find({ parentDir: sourceDirId })
    .session(session)
    .lean();
  for (const file of files) {
    const newFileId = new mongoose.Types.ObjectId();

    try {
      await copyInB2({
        sourceKey: `${file._id.toString()}${file.extension}`,
        destinationKey: `${newFileId.toString()}${file.extension}`,
      });
    } catch (copyErr) {
      console.error(`Failed to copy physical file ${file._id}:`, copyErr);
      throw new Error(`Physical file copying failed for "${file.name}"`);
    }

    if (file.hasThumbnail) {
      try {
        await copyInB2({
          sourceKey: `thumbnails/${file._id.toString()}.jpg`,
          destinationKey: `thumbnails/${newFileId.toString()}.jpg`,
        });
      } catch (thumbErr) {
        console.warn(`Failed to copy thumbnail for ${file._id}:`, thumbErr);
      }
    }

    await File.create(
      [
        {
          _id: newFileId,
          name: file.name,
          extension: file.extension,
          type: "file",
          userId: targetOwnerId,
          parentDir: newDirId,
          path: [...newDirPath, newFileId],
          size: file.size,
          hasThumbnail: file.hasThumbnail,
          externalUrl: file.externalUrl,
        },
      ],
      { session },
    );
  }

  // 2. Recursively copy all subdirectories
  const subDirs = await Directory.find({ parentDir: sourceDirId })
    .session(session)
    .lean();
  for (const subDir of subDirs) {
    const newSubDirId = new mongoose.Types.ObjectId();
    await copyDirectoryRecursive(
      subDir._id,
      newSubDirId,
      newDirId,
      targetOwnerId,
      newDirPath,
      session,
    );
  }
};

export const getDirectoryContents = async ({ dirId, userId, userRole, action, res }) => {
  const req = { user: { id: userId, role: userRole } };

  // Non-blocking openedAt timestamp update (does not delay cache-hit response)
  Directory.updateOne(
    { _id: dirId },
    { $set: { openedAt: new Date() } },
  ).catch((err) => console.error("Error updating openedAt for directory:", err.message));

  const cacheKey = `dir:contents:${dirId}`;

  // 1. Try Cache-Aside from Redis first
  if (action !== "download") {
    const cachedVal = await cacheGet(cacheKey);
    if (cachedVal) {
      try {
        const cachedData = JSON.parse(cachedVal);
        // Perform security/authorization validation on cached owner ID
        if (
          cachedData.userId &&
          cachedData.userId.toString() !== req.user.id
        ) {
          const hasAccess = await verifyItemAccess(
            cachedData.userId,
            req,
            dirId,
            "directory",
            "read",
            cachedData.path,
          );

          if (!hasAccess) {
            const err = new Error("You are not authorized to access this directory");
            err.status = 403;
            throw err;
          }
        }
        if (!cachedData.ownerName && cachedData.userId) {
          const userDoc = await User.findById(cachedData.userId).select("name email").lean();
          if (userDoc) {
            cachedData.ownerName = userDoc.name;
            cachedData.ownerEmail = userDoc.email;
          }
        }
        return cachedData;
      } catch (jsonErr) {
        console.error("Failed to parse cached folder content:", jsonErr);
      }
    }
  }

  // 2. Parallelize initial fetching of directory, files, and childDirs on cache miss
  let effectiveDirId = dirId;
  let [directoryDataRaw, files, childDirs] = await Promise.all([
    Directory.findOne({ _id: effectiveDirId }).select("-__v").populate("userId", "name email").lean(),
    File.find({ parentDir: effectiveDirId, uploadStatus: { $ne: "uploading" } }).select("-__v").lean(),
    Directory.find({ parentDir: effectiveDirId }).select("-__v").lean(),
  ]);

  if (!directoryDataRaw) {
    // Check if dirId matches a GitWorkspace _id or stale rootDirectoryId
    const ws = await GitWorkspace.findOne({
      $or: [{ _id: dirId }, { rootDirectoryId: dirId }],
    }).lean();

    if (ws) {
      const activeWs = await GitWorkspace.findOne({
        userId: ws.userId,
        repoOwner: ws.repoOwner,
        repoName: ws.repoName,
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (activeWs && activeWs.rootDirectoryId) {
        const foundDir = await Directory.findOne({ _id: activeWs.rootDirectoryId })
          .select("-__v")
          .populate("userId", "name email")
          .lean();

        if (foundDir) {
          effectiveDirId = activeWs.rootDirectoryId.toString();
          directoryDataRaw = foundDir;
          const [activeFiles, activeChildDirs] = await Promise.all([
            File.find({ parentDir: effectiveDirId, uploadStatus: { $ne: "uploading" } }).select("-__v").lean(),
            Directory.find({ parentDir: effectiveDirId }).select("-__v").lean(),
          ]);
          files.length = 0;
          files.push(...activeFiles);
          childDirs.length = 0;
          childDirs.push(...activeChildDirs);
        }
      }
    }
  }

  if (!directoryDataRaw) {
    const err = new Error("Directory not found");
    err.status = 404;
    throw err;
  }

  const rawUserIdObj = directoryDataRaw.userId;
  const ownerUserIdStr = rawUserIdObj?._id
    ? rawUserIdObj._id.toString()
    : rawUserIdObj
    ? rawUserIdObj.toString()
    : null;
  const ownerName = rawUserIdObj?.name || null;
  const ownerEmail = rawUserIdObj?.email || null;

  // Self-heal: If loading the root directory, attach any unparented git workspaces
  if (!directoryDataRaw.parentDir) {
    const unparentedWorkspaces = await Directory.find({
      userId: ownerUserIdStr || userId,
      provider: "git_workspace",
      $or: [{ parentDir: null }, { parentDir: { $exists: false } }],
    }).lean();

    if (unparentedWorkspaces.length > 0) {
      await Directory.updateMany(
        {
          _id: { $in: unparentedWorkspaces.map((d) => d._id) },
        },
        {
          $set: {
            parentDir: dirId,
            path: [dirId],
          },
        }
      );
      for (const uw of unparentedWorkspaces) {
        if (!childDirs.some((c) => c._id.toString() === uw._id.toString())) {
          childDirs.push({
            ...uw,
            parentDir: dirId,
            path: [dirId],
          });
        }
      }
    }
  }

  const directoryData = { ...directoryDataRaw };
  directoryData._id = directoryData._id.toString();
  directoryData.userId = ownerUserIdStr;
  directoryData.ownerName = ownerName;
  directoryData.ownerEmail = ownerEmail;

  // 3. Optimized Current-Folder-Only Path Resolution
  const pathDocs = await Directory.find({
    _id: { $in: directoryData.path || [] },
  })
    .select("name provider")
    .lean();

  const dirMap = new Map(pathDocs.map((d) => [d._id.toString(), d]));

  const mappedCurrentPath = (directoryData.path || [])
    .map((id) => {
      if (!id) return null;
      const idStr = id.toString();
      const doc = dirMap.get(idStr);
      return doc ? { _id: idStr, name: doc.name, provider: doc.provider } : null;
    })
    .filter(Boolean);

  directoryData.path = mappedCurrentPath;

  const parentPathNames = mappedCurrentPath.map((p) => ({ name: p.name }));
  const baseSharedPathNames = [
    ...parentPathNames,
    { name: directoryData.name },
  ];

  const mediaExts = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".tiff",
    ".svg",
    ".mp4",
    ".webm",
    ".mkv",
    ".avi",
    ".mov",
  ];

  directoryData.files = files.map((file) => {
    const ext = file.extension ? file.extension.toLowerCase() : "";
    const canHaveThumb = mediaExts.includes(ext);
    const hasThumb = file.hasThumbnail || canHaveThumb;
    const fileIdStr = file._id.toString();

    let thumbnailUrl = null;
    if (hasThumb) {
      thumbnailUrl = createCloudflareCdnDownloadUrl({
        fileId: fileIdStr,
        extension: ".webp",
        version: file.contentVersion || 1,
        isThumbnail: true,
        filename: file.name,
      });
    }

    let gitStatus = file.gitStatus;
    const lastCommittedVer = gitStatus?.lastCommittedVersion || 1;
    if (
      gitStatus &&
      (file.contentVersion || 1) > lastCommittedVer &&
      gitStatus.originalSha &&
      gitStatus.status !== "modified"
    ) {
      gitStatus = { ...gitStatus, status: "modified" };
    }

    return {
      ...file,
      _id: fileIdStr,
      hasThumbnail: hasThumb,
      thumbnailUrl,
      gitStatus,
      path: [...baseSharedPathNames, { name: file.name }],
    };
  });

  // 4. Skip aggregates if there are no subdirectories
  let filesCountMap = new Map();
  let dirsCountMap = new Map();

  if (childDirs.length > 0) {
    const childDirIds = childDirs.map((dir) => dir._id);
    const [filesCounts, dirsCounts] = await Promise.all([
      File.aggregate([
        { $match: { parentDir: { $in: childDirIds }, uploadStatus: { $ne: "uploading" } } },
        { $group: { _id: "$parentDir", count: { $sum: 1 } } },
      ]),
      Directory.aggregate([
        { $match: { parentDir: { $in: childDirIds } } },
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

  directoryData.directories = childDirs.map((dir) => {
    const dirIdStr = dir._id.toString();
    const filesCount = filesCountMap.get(dirIdStr) || 0;
    const directoriesCount = dirsCountMap.get(dirIdStr) || 0;
    const items = filesCount + directoriesCount;

    return {
      ...dir,
      filesCount,
      path: [...baseSharedPathNames, { name: dir.name }],
      directoriesCount,
      items,
      itemCount: items,
    };
  });

  // 5. Store completed response in Cache-Aside Redis key
  if (action !== "download") {
    await cacheSet(cacheKey, JSON.stringify(directoryData), 600);
  }

  // 6. Security authorization checks
  if (
    directoryData.userId &&
    directoryData.userId.toString() !== req.user.id
  ) {
    const hasAccess = await verifyItemAccess(
      directoryData.userId,
      req,
      dirId,
      "directory",
      "read",
      directoryDataRaw.path,
    );

    if (!hasAccess) {
      const err = new Error("You are not authorized to access this directory");
      err.status = 403;
      throw err;
    }
  }

  if (action === "download") {
    await streamItemsAsZip({
      rootName: directoryData.name,
      directories: [{ _id: directoryData._id, name: directoryData.name }],
      res,
    });
    return;
  }

  return directoryData;
};

export const createDirectoryLogic = async ({ name, parentDirId, userId, userRole, rootDirId }) => {
  const req = { user: { id: userId, role: userRole } };
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
        const error = new Error("You are not authorized to create folders in this directory");
        error.status = 403;
        throw error;
      }
    }
  }

  const dirId = new mongoose.Types.ObjectId();
  const dirPath = await getDirectoryPath(dirId, parentDirId);

  await withTransaction(async (session) => {
    await Directory.create(
      [
        {
          _id: dirId,
          name: name,
          path: dirPath,
          userId: ownerId,
          type: "directory",
          parentDir: parentDirId,
        },
      ],
      { session },
    );
  });

  await cacheDel("dir:meta:" + parentDirId);
  await cacheDel("dir:contents:" + parentDirId);

  return {
    _id: dirId.toString(),
    name,
    parentDir: parentDirId,
    path: dirPath,
  };
};

export const sortTreePathsByDepth = (paths = []) => {
  const unique = Array.from(
    new Set(
      paths
        .map((p) => (typeof p === "string" ? p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") : ""))
        .filter(Boolean),
    ),
  );
  return unique.sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });
};

export const ensureDirectoryTreeLogic = async ({
  parentDirId,
  paths = [],
  userId,
  userRole,
  rootDirId,
}) => {
  const req = { user: { id: userId, role: userRole } };
  let effectiveParentId = parentDirId;
  if (!effectiveParentId || effectiveParentId === "root" || effectiveParentId === "undefined") {
    effectiveParentId = rootDirId.toString();
  }

  let ownerId = userId;
  // Verify parent directory access
  if (effectiveParentId && effectiveParentId !== rootDirId.toString()) {
    const parentDir = await Directory.findOne({ _id: effectiveParentId })
      .select("userId path")
      .lean();
    if (parentDir && parentDir.userId) {
      ownerId = parentDir.userId.toString();
      const canWrite = await verifyItemAccess(
        ownerId,
        req,
        effectiveParentId,
        "directory",
        "write",
        parentDir.path,
      );
      if (!canWrite) {
        const error = new Error("You are not authorized to create folders in this directory");
        error.status = 403;
        throw error;
      }
    }
  }

  const sortedPaths = sortTreePathsByDepth(paths);
  const resolvedMap = { "": effectiveParentId };
  const affectedParentIds = new Set([effectiveParentId]);

  for (const relPath of sortedPaths) {
    const parts = relPath.split("/");
    const folderName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const resolvedParentId = resolvedMap[parentPath] || effectiveParentId;

    // Check if directory already exists under resolved parent
    let existingDir = await Directory.findOne({
      parentDir: resolvedParentId,
      name: folderName,
      userId: ownerId,
    })
      .select("_id")
      .lean();

    if (existingDir) {
      resolvedMap[relPath] = existingDir._id.toString();
    } else {
      const newDirId = new mongoose.Types.ObjectId();
      const dirPath = await getDirectoryPath(newDirId, resolvedParentId);

      await withTransaction(async (session) => {
        await Directory.create(
          [
            {
              _id: newDirId,
              name: folderName,
              path: dirPath,
              userId: ownerId,
              type: "directory",
              parentDir: resolvedParentId,
            },
          ],
          { session },
        );
      });

      resolvedMap[relPath] = newDirId.toString();
      affectedParentIds.add(resolvedParentId);
    }
  }

  // Clear Redis cache for all affected parent directories
  await Promise.all(
    Array.from(affectedParentIds).flatMap((id) => [
      cacheDel("dir:meta:" + id),
      cacheDel("dir:contents:" + id),
    ]),
  );

  return resolvedMap;
};

export const renameDirectoryLogic = async ({ dirId, name, userId, userRole }) => {
  const req = { user: { id: userId, role: userRole } };
  const directoryData = await Directory.findOne({ _id: dirId })
    .select("userId parentDir path")
    .lean();
  console.log(directoryData);

  if (!directoryData) {
    const error = new Error("Folder not found");
    error.status = 404;
    throw error;
  }

  const ownerId = directoryData.userId
    ? directoryData.userId.toString()
    : req.user.id;
  const canWrite = await verifyItemAccess(
    ownerId,
    req,
    dirId,
    "directory",
    "write",
    directoryData.path,
  );
  if (!canWrite) {
    const error = new Error("You are not authorized to rename this directory");
    error.status = 403;
    throw error;
  }
  
  await Directory.updateOne(
    { _id: dirId },
    { $set: { name: name } },
  );

  await cacheDel("dir:contents:" + dirId);
  if (directoryData && directoryData.parentDir) {
    await cacheDel("dir:contents:" + directoryData.parentDir.toString());
  }
};

export const deleteDirectoryLogic = async ({ dirId, userId, permanent, userRole }) => {
  const req = { user: { id: userId, role: userRole } };
  const dirData = await Directory.findOne({ _id: dirId })
    .select("userId parentDir path")
    .lean();

  if (!dirData) {
    const error = new Error("Folder not found");
    error.status = 404;
    throw error;
  }

  const ownerId = dirData.userId ? dirData.userId.toString() : req.user.id;
  const canWrite = await verifyItemAccess(
    ownerId,
    req,
    dirId,
    "directory",
    "write",
    dirData.path,
  );
  if (!canWrite) {
    const error = new Error("You are not authorized to delete this directory");
    error.status = 403;
    throw error;
  }

  await withTransaction(async (session) => {
    const isPermanent = permanent;

    const directoryToBeDeleted = await Directory.findOne({ _id: dirId })
      .select("parentDir size path")
      .session(session)
      .lean();

    if (directoryToBeDeleted) {
      await updateParentDirectorySize(
        (directoryToBeDeleted.path || []).slice(0, -1),
        -directoryToBeDeleted.size,
        session,
      );
    }

    if (isPermanent) {
      // Recursively delete all files and directories completely
      await deleteByParentChain(dirId);
      await Directory.deleteOne({ _id: dirId }).session(session);
    } else {
      const deletedDirectory = await Directory.findOne({ _id: dirId })
        .select("-__v")
        .session(session)
        .lean();
      if (deletedDirectory) {
        await Directory.deleteOne({ _id: dirId }).session(session);
        await Trash.create([deletedDirectory], { session });
      }
    }
  });

  await cacheDel("dir:meta:" + dirId);
  await cacheDel("dir:contents:" + dirId);
  if (dirData && dirData.parentDir) {
    await cacheDel("dir:meta:" + dirData.parentDir.toString());
    await cacheDel("dir:contents:" + dirData.parentDir.toString());
  }
};

export const moveItemsLogic = async ({ targetDirId, items, userId, userRole, rootDirId }) => {
  const req = { user: { id: userId, role: userRole } };
  const targetDir = await Directory.findOne({ _id: targetDirId }).lean();
  if (!targetDir) {
    const error = new Error("Target folder not found");
    error.status = 404;
    throw error;
  }

  let targetOwnerId = targetDir.userId
    ? targetDir.userId.toString()
    : req.user.id;
  const canWriteTarget = await verifyItemAccess(
    targetOwnerId,
    req,
    targetDirId,
    "directory",
    "write",
    targetDir.path,
  );
  if (!canWriteTarget) {
    const error = new Error("You are not authorized to move items to this folder");
    error.status = 403;
    throw error;
  }

  const itemIds = items.map((t) => t._id || t.id);
  const sourceDirs = await Directory.find({ _id: { $in: itemIds } }).lean();
  const sourceFiles = await File.find({ _id: { $in: itemIds } }).lean();

  // Check write access for all items being moved
  for (const item of [...sourceDirs, ...sourceFiles]) {
    const itemOwnerId = item.userId ? item.userId.toString() : req.user.id;
    const canWriteItem = await verifyItemAccess(
      itemOwnerId,
      req,
      item._id,
      item.type,
      "write",
      item.path,
    );
    if (!canWriteItem) {
      const error = new Error("You are not authorized to move some of these items");
      error.status = 403;
      throw error;
    }

    // Also prevent moving a directory into itself or its own subdirectories
    if (item.type === "directory" && targetDirId !== rootDirId) {
      if (
        targetDirId === item._id.toString() ||
        targetDir.path.includes(item._id.toString())
      ) {
        const error = new Error(`Cannot move folder "${item.name}" into itself or its own subfolders`);
        error.status = 400;
        throw error;
      }
    }
  }

  await withTransaction(async (session) => {
    // 1. Move Directories
    for (const dir of sourceDirs) {
      const oldParentDirId = dir.parentDir;
      if (oldParentDirId && oldParentDirId.toString() === targetDirId) {
        continue; // Already in target directory
      }

      // Recursively update this directory and all its descendants' paths
      await updateDirectoryPathAndDescendants(dir._id, targetDirId, session);

      // Update sizes: decrement old parent path sizes and increment new parent path sizes
      if (oldParentDirId) {
        await updateParentDirectorySize(oldParentDirId, -dir.size, session);
      }
      await updateParentDirectorySize(targetDirId, dir.size, session);
    }

    // 2. Move Files
    for (const file of sourceFiles) {
      const oldParentDirId = file.parentDir;
      if (oldParentDirId && oldParentDirId.toString() === targetDirId) {
        continue; // Already in target directory
      }

      file.parentDir = targetDirId;
      file.path = [...targetDir.path, file._id];
      await File.updateOne(
        { _id: file._id },
        { $set: { parentDir: targetDirId, path: file.path } },
      ).session(session);

      // Update sizes
      if (oldParentDirId) {
        await updateParentDirectorySize(
          oldParentDirId,
          -file.size,
          session,
        );
      }
      await updateParentDirectorySize(targetDirId, file.size, session);
    }
  });

  // Clear caches
  const oldParentDirs = new Set();
  for (const item of [...sourceDirs, ...sourceFiles]) {
    if (item.parentDir) {
      oldParentDirs.add(item.parentDir.toString());
    }
  }
  for (const oldPid of oldParentDirs) {
    await cacheDel("dir:meta:" + oldPid);
    await cacheDel("dir:contents:" + oldPid);
  }
  await cacheDel("dir:meta:" + targetDirId);
  await cacheDel("dir:contents:" + targetDirId);
};

export const copyItemsLogic = async ({ targetDirId, items, userId, userRole, rootDirId }) => {
  const req = { user: { id: userId, role: userRole } };
  const targetDir = await Directory.findOne({ _id: targetDirId }).lean();
  if (!targetDir) {
    const error = new Error("Target folder not found");
    error.status = 404;
    throw error;
  }

  let targetOwnerId = targetDir.userId
    ? targetDir.userId.toString()
    : req.user.id;
  const canWriteTarget = await verifyItemAccess(
    targetOwnerId,
    req,
    targetDirId,
    "directory",
    "write",
    targetDir.path,
  );
  if (!canWriteTarget) {
    const error = new Error("You are not authorized to copy items to this folder");
    error.status = 403;
    throw error;
  }

  const itemIds = items.map((t) => t.id || t._id);
  const sourceDirs = await Directory.find({ _id: { $in: itemIds } }).lean();
  const sourceFiles = await File.find({ _id: { $in: itemIds } }).lean();

  // Check read access for all items being copied
  for (const item of [...sourceDirs, ...sourceFiles]) {
    const itemOwnerId = item.userId ? item.userId.toString() : req.user.id;
    const canReadItem = await verifyItemAccess(
      itemOwnerId,
      req,
      item._id,
      item.type,
      "read",
      item.path,
    );
    if (!canReadItem) {
      const error = new Error("You are not authorized to copy some of these items");
      error.status = 403;
      throw error;
    }
  }

  await withTransaction(async (session) => {
    // 1. Copy Files
    for (const file of sourceFiles) {
      const newFileId = new mongoose.Types.ObjectId();
      const resolvedName = await getAvailableName(
        targetDirId,
        file.name,
        false,
        session,
      );

      // Copy physical storage files in Backblaze B2
      try {
        await copyInB2({
          sourceKey: `${file._id.toString()}${file.extension}`,
          destinationKey: `${newFileId.toString()}${file.extension}`,
        });
      } catch (copyErr) {
        console.error(`Failed to copy physical file ${file._id}:`, copyErr);
        throw new Error(`Physical file copying failed for "${file.name}"`);
      }

      // Copy thumbnail if it exists
      if (file.hasThumbnail) {
        try {
          await copyInB2({
            sourceKey: `thumbnails/${file._id.toString()}.jpg`,
            destinationKey: `thumbnails/${newFileId.toString()}.jpg`,
          });
        } catch (thumbErr) {
          console.warn(
            `Failed to copy thumbnail for ${file._id}:`,
            thumbErr,
          );
        }
      }

      await File.create(
        [
          {
            _id: newFileId,
            name: resolvedName,
            extension: file.extension,
            type: "file",
            userId: targetOwnerId,
            parentDir: targetDirId,
            path: [...targetDir.path, newFileId],
            size: file.size,
            hasThumbnail: file.hasThumbnail,
            externalUrl: file.externalUrl,
          },
        ],
        { session },
      );

      // Update sizes
      await updateParentDirectorySize(targetDirId, file.size, session);
    }

    // 2. Copy Directories
    for (const dir of sourceDirs) {
      // Prevent copying directory inside itself or its children
      if (
        targetDirId === dir._id.toString() ||
        targetDir.path.includes(dir._id.toString())
      ) {
        const error = new Error(`Cannot copy folder "${dir.name}" into itself or its own subfolders`);
        error.status = 400;
        throw error;
      }

      const newDirId = new mongoose.Types.ObjectId();
      const resolvedName = await getAvailableName(
        targetDirId,
        dir.name,
        true,
        session,
      );

      // Recursively copy contents
      await copyDirectoryRecursive(
        dir._id,
        newDirId,
        targetDirId,
        targetOwnerId,
        targetDir.path,
        session,
      );

      // Update target directory size (the directory itself + all its contents size)
      await updateParentDirectorySize(targetDirId, dir.size, session);
    }
  });

  // Clear caches
  await cacheDel("dir:meta:" + targetDirId);
  await cacheDel("dir:contents:" + targetDirId);
};

export const downloadItemsBatchLogic = async ({
  items,
  userId,
  userRole,
  res,
  deps = {},
}) => {
  const req = { user: { id: userId, role: userRole } };
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error("No items selected for download");
    error.status = 400;
    throw error;
  }

  const FileModel = deps.File || File;
  const DirectoryModel = deps.Directory || Directory;
  const accessVerifier = deps.verifyItemAccess || verifyItemAccess;

  const fileIds = [
    ...new Set(
      items
        .filter((i) => i.type === "file")
        .map((i) => (i._id || i.id)?.toString())
        .filter(Boolean),
    ),
  ];
  const dirIds = [
    ...new Set(
      items
        .filter((i) => i.type === "directory")
        .map((i) => (i._id || i.id)?.toString())
        .filter(Boolean),
    ),
  ];

  const [files, dirs] = await Promise.all([
    fileIds.length > 0
      ? FileModel.find({
          _id: { $in: fileIds },
          uploadStatus: { $ne: "uploading" },
        })
          .select("-__v")
          .lean()
      : [],
    dirIds.length > 0
      ? DirectoryModel.find({ _id: { $in: dirIds } })
          .select("-__v")
          .lean()
      : [],
  ]);

  if (files.length === 0 && dirs.length === 0) {
    const error = new Error("No downloadable items found");
    error.status = 404;
    throw error;
  }

  for (const file of files) {
    const ownerId = file.userId ? file.userId.toString() : req.user.id;
    const canRead = await accessVerifier(
      ownerId,
      req,
      file._id,
      "file",
      "read",
      file.path,
    );
    if (!canRead) {
      const error = new Error(`You are not authorized to download file: ${file.name}`);
      error.status = 403;
      throw error;
    }
  }

  for (const dir of dirs) {
    const ownerId = dir.userId ? dir.userId.toString() : req.user.id;
    const canRead = await accessVerifier(
      ownerId,
      req,
      dir._id,
      "directory",
      "read",
      dir.path,
    );
    if (!canRead) {
      const error = new Error(`You are not authorized to download folder: ${dir.name}`);
      error.status = 403;
      throw error;
    }
  }

  const rootName =
    files.length === 0 && dirs.length === 1
      ? dirs[0].name
      : files.length === 1 && dirs.length === 0
      ? files[0].name
      : "vault-selection";

  await streamItemsAsZip({
    rootName,
    files,
    directories: dirs,
    res,
    deps,
  });
};

export const deleteItemsBatchLogic = async ({ items, userId, userRole, permanent }) => {
  const req = { user: { id: userId, role: userRole } };
  if (!items || !Array.isArray(items)) {
    const error = new Error("Invalid items array");
    error.status = 400;
    throw error;
  }

  const fileIds = items.filter((i) => i.type === "file").map((i) => i._id || i.id);
  const dirIds = items.filter((i) => i.type === "directory").map((i) => i._id || i.id);

  const [files, dirs] = await Promise.all([
    File.find({ _id: { $in: fileIds } })
      .select("-__v")
      .lean(),
    Directory.find({ _id: { $in: dirIds } })
      .select("-__v")
      .lean(),
  ]);

  for (const file of files) {
    const ownerId = file.userId ? file.userId.toString() : req.user.id;
    const canWrite = await verifyItemAccess(
      ownerId,
      req,
      file._id,
      "file",
      "write",
      file.path,
    );
    if (!canWrite) {
      const error = new Error(`You are not authorized to delete file: ${file.name}`);
      error.status = 403;
      throw error;
    }
  }

  for (const dir of dirs) {
    const ownerId = dir.userId ? dir.userId.toString() : req.user.id;
    const canWrite = await verifyItemAccess(
      ownerId,
      req,
      dir._id,
      "directory",
      "write",
      dir.path,
    );
    if (!canWrite) {
      const error = new Error(`You are not authorized to delete folder: ${dir.name}`);
      error.status = 403;
      throw error;
    }
  }

  const isPermanent = permanent;

  await withTransaction(async (session) => {
    const sizeUpdates = new Map();

    for (const file of files) {
      if (file.parentDir) {
        const pid = file.parentDir.toString();
        sizeUpdates.set(pid, (sizeUpdates.get(pid) || 0) - file.size);
      }
    }

    for (const dir of dirs) {
      if (dir.parentDir) {
        const pid = dir.parentDir.toString();
        sizeUpdates.set(pid, (sizeUpdates.get(pid) || 0) - dir.size);
      }
    }

    for (const [parentDirId, sizeChange] of sizeUpdates.entries()) {
      await updateParentDirectorySize(parentDirId, sizeChange, session);
    }

    const trashingFiles = files.map((f) => ({
      ...f,
      deleted_at: new Date(),
    }));
    const trashingDirs = dirs.map((d) => ({ ...d, deleted_at: new Date() }));

    if (trashingFiles.length > 0) {
      if (isPermanent) {
        const b2Keys = [];
        for (const f of files) {
          const ext = f.extension ? (f.extension.startsWith(".") ? f.extension : `.${f.extension}`) : "";
          b2Keys.push(`${f._id.toString()}${ext}`);
          b2Keys.push(`thumbnails/${f._id.toString()}.webp`);
          b2Keys.push(`thumbnails/${f._id.toString()}.jpg`);
        }
        await deleteMultipleFromB2({ keys: b2Keys });
      } else {
        await Trash.insertMany(trashingFiles, { session });
      }
      await File.deleteMany({ _id: { $in: fileIds } }).session(session);
    }

    if (trashingDirs.length > 0) {
      if (isPermanent) {
        for (const dirId of dirIds) {
          await deleteByParentChain(dirId);
        }
      } else {
        await Trash.insertMany(trashingDirs, { session });
      }
      await Directory.deleteMany({ _id: { $in: dirIds } }).session(session);
    }
  });

  const keysToInvalidate = new Set();
  for (const dirId of dirIds) {
    keysToInvalidate.add("dir:meta:" + dirId);
    keysToInvalidate.add("dir:contents:" + dirId);
  }
  for (const file of files) {
    if (file.parentDir)
      keysToInvalidate.add("dir:meta:" + file.parentDir.toString());
    if (file.parentDir)
      keysToInvalidate.add("dir:contents:" + file.parentDir.toString());
  }
  for (const dir of dirs) {
    if (dir.parentDir)
      keysToInvalidate.add("dir:meta:" + dir.parentDir.toString());
    if (dir.parentDir)
      keysToInvalidate.add("dir:contents:" + dir.parentDir.toString());
  }

  await Promise.all(
    Array.from(keysToInvalidate).map((key) => cacheDel(key)),
  );
};


// ==========================================
// Folder Public Media & Manifest Services
// ==========================================

/**
 * Helper to fetch all files and subdirectories recursively for a published directory.
 */
const getPublishedFolderHierarchy = async (dirId) => {
  const subDirs = await Directory.find({ path: dirId, _id: { $ne: dirId } })
    .select("_id name path parentDir")
    .lean();

  const subDirMap = new Map();
  const subDirIds = subDirs.map((sd) => {
    subDirMap.set(sd._id.toString(), sd.name);
    return sd._id;
  });

  const allDirIds = [dirId, ...subDirIds];

  const files = await File.find({
    parentDir: { $in: allDirIds },
    uploadStatus: { $ne: "uploading" },
  })
    .select("_id name extension size contentVersion hasThumbnail parentDir createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const subfolders = subDirs.map((sd) => {
    const itemCount = files.filter(
      (f) => f.parentDir && f.parentDir.toString() === sd._id.toString()
    ).length;
    return {
      id: sd._id,
      name: sd.name,
      itemCount,
    };
  });

  return {
    subDirs,
    subDirMap,
    files,
    subfolders,
  };
};

export const updateDirectoryPublicAccessLogic = async ({
  dirId,
  userId,
  userRole,
  planContext,
  enabled,
  allowedOrigins = ["*"],
  playerSettings = {},
}) => {
  const req = { user: { id: userId, role: userRole } };
  const dir = await Directory.findOne({ _id: dirId })
    .select("userId name path publicAccess")
    .lean();

  if (!dir) {
    const error = new Error("Directory not found");
    error.status = 404;
    throw error;
  }

  const ownerId = dir.userId ? dir.userId.toString() : req.user.id;
  const canWrite = await verifyItemAccess(
    ownerId,
    req,
    dirId,
    "directory",
    "write",
    dir.path,
  );
  if (!canWrite) {
    const error = new Error("You are not authorized to update sharing settings for this directory");
    error.status = 403;
    throw error;
  }

  let publicToken = dir.publicAccess?.token;
  if (enabled && !publicToken) {
    publicToken = crypto.randomBytes(16).toString("hex");
  }

  const cleanOrigins = Array.isArray(allowedOrigins) && allowedOrigins.length > 0
    ? allowedOrigins.map((o) => o.trim()).filter(Boolean)
    : ["*"];

  const updatedPublicAccess = {
    enabled: Boolean(enabled),
    token: enabled ? publicToken : (dir.publicAccess?.token || null),
    allowedOrigins: cleanOrigins.length > 0 ? cleanOrigins : ["*"],
    playerSettings: {
      accentColor: playerSettings.accentColor || dir.publicAccess?.playerSettings?.accentColor || "#00f0ff",
      hideBranding: Boolean(playerSettings.hideBranding ?? dir.publicAccess?.playerSettings?.hideBranding ?? false),
      customWatermark: {
        url: playerSettings.customWatermark?.url ?? dir.publicAccess?.playerSettings?.customWatermark?.url ?? "",
        position: playerSettings.customWatermark?.position || dir.publicAccess?.playerSettings?.customWatermark?.position || "top-right",
        clickUrl: playerSettings.customWatermark?.clickUrl ?? dir.publicAccess?.playerSettings?.customWatermark?.clickUrl ?? "",
        opacity: typeof playerSettings.customWatermark?.opacity === "number" ? playerSettings.customWatermark.opacity : (dir.publicAccess?.playerSettings?.customWatermark?.opacity ?? 0.8),
      },
      autoPlay: Boolean(playerSettings.autoPlay ?? dir.publicAccess?.playerSettings?.autoPlay ?? false),
      loop: Boolean(playerSettings.loop ?? dir.publicAccess?.playerSettings?.loop ?? false),
      muted: Boolean(playerSettings.muted ?? dir.publicAccess?.playerSettings?.muted ?? false),
      controls: Boolean(playerSettings.controls ?? dir.publicAccess?.playerSettings?.controls ?? true),
      aspectRatio: playerSettings.aspectRatio || dir.publicAccess?.playerSettings?.aspectRatio || "16:9",
      borderRadius: playerSettings.borderRadius || dir.publicAccess?.playerSettings?.borderRadius || "12px",
    },
    views: dir.publicAccess?.views || 0,
    updatedAt: new Date(),
  };

  await Directory.updateOne({ _id: dirId }, { $set: { publicAccess: updatedPublicAccess } });

  let manifestUrl = null;
  let items = [];
  let subfolders = [];

  if (enabled && publicToken) {
    manifestUrl = `${BACKEND_URL}/share/public-folder/${publicToken}/manifest`;
    
    const hierarchy = await getPublishedFolderHierarchy(dirId);
    subfolders = hierarchy.subfolders;

    items = hierarchy.files.map((file) => {
      const edgeToken = generatePublicMediaToken({
        fileId: file._id,
        contentVersion: file.contentVersion || 1,
        allowedOrigins: updatedPublicAccess.allowedOrigins,
      });

      const streamUrl = createPublicMediaCdnUrl({
        fileId: file._id,
        extension: file.extension || "",
        token: edgeToken,
        filename: file.name,
      });

      const embedUrl = `${CLIENT_URL}/embed/${publicToken}?fileId=${file._id}`;
      const cleanAspect = (updatedPublicAccess.playerSettings.aspectRatio || "16:9").replace(":", "/");
      const iframeCode = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="aspect-ratio: ${cleanAspect}; border-radius: ${updatedPublicAccess.playerSettings.borderRadius};"></iframe>`;
      const videoTagCode = `<video src="${streamUrl}" controls playsinline preload="metadata"></video>`;

      const isSubfolder = file.parentDir && file.parentDir.toString() !== dirId.toString();
      const subfolderName = isSubfolder ? (hierarchy.subDirMap.get(file.parentDir.toString()) || null) : null;

      return {
        id: file._id,
        name: file.name,
        size: file.size,
        extension: file.extension,
        subfolder: subfolderName,
        subfolderId: isSubfolder ? file.parentDir : null,
        streamUrl,
        embedUrl,
        iframeCode,
        videoTagCode,
      };
    });
  }

  const primaryItem = items.length > 0 ? items[0] : null;
  const streamUrl = primaryItem ? primaryItem.streamUrl : "";
  const embedUrl = updatedPublicAccess.enabled && publicToken
    ? `${CLIENT_URL}/embed/${publicToken}`
    : "";

  return {
    success: true,
    publicAccess: updatedPublicAccess,
    manifestUrl,
    items,
    subfolders,
    streamUrl,
    embedUrl,
  };
};

export const getDirectoryPublicAccessLogic = async ({ dirId, userId, userRole }) => {
  const req = { user: { id: userId, role: userRole } };
  const dir = await Directory.findOne({ _id: dirId })
    .select("userId name path publicAccess")
    .lean();

  if (!dir) {
    const error = new Error("Directory not found");
    error.status = 404;
    throw error;
  }

  const ownerId = dir.userId ? dir.userId.toString() : req.user.id;
  const canRead = await verifyItemAccess(
    ownerId,
    req,
    dirId,
    "directory",
    "read",
    dir.path,
  );
  if (!canRead) {
    const error = new Error("Unauthorized to access sharing settings");
    error.status = 403;
    throw error;
  }

  const publicAccess = dir.publicAccess || {
    enabled: false,
    token: null,
    allowedOrigins: ["*"],
    playerSettings: {
      accentColor: "#00f0ff",
      hideBranding: false,
      customWatermark: { url: "", position: "top-right", clickUrl: "", opacity: 0.8 },
      autoPlay: false,
      loop: false,
      muted: false,
      controls: true,
      aspectRatio: "16:9",
      borderRadius: "12px",
    },
    views: 0,
  };

  let manifestUrl = null;
  let items = [];
  let subfolders = [];

  if (publicAccess.enabled && publicAccess.token) {
    manifestUrl = `${BACKEND_URL}/share/public-folder/${publicAccess.token}/manifest`;

    const hierarchy = await getPublishedFolderHierarchy(dirId);
    subfolders = hierarchy.subfolders;

    items = hierarchy.files.map((file) => {
      const edgeToken = generatePublicMediaToken({
        fileId: file._id,
        contentVersion: file.contentVersion || 1,
        allowedOrigins: publicAccess.allowedOrigins,
      });

      const streamUrl = createPublicMediaCdnUrl({
        fileId: file._id,
        extension: file.extension || "",
        token: edgeToken,
        filename: file.name,
      });

      const embedUrl = `${CLIENT_URL}/embed/${publicAccess.token}?fileId=${file._id}`;
      const cleanAspect = (publicAccess.playerSettings?.aspectRatio || "16:9").replace(":", "/");
      const iframeCode = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="aspect-ratio: ${cleanAspect}; border-radius: ${publicAccess.playerSettings?.borderRadius || "12px"};"></iframe>`;
      const videoTagCode = `<video src="${streamUrl}" controls playsinline preload="metadata"></video>`;

      const isSubfolder = file.parentDir && file.parentDir.toString() !== dirId.toString();
      const subfolderName = isSubfolder ? (hierarchy.subDirMap.get(file.parentDir.toString()) || null) : null;

      return {
        id: file._id,
        name: file.name,
        size: file.size,
        extension: file.extension,
        subfolder: subfolderName,
        subfolderId: isSubfolder ? file.parentDir : null,
        streamUrl,
        embedUrl,
        iframeCode,
        videoTagCode,
      };
    });
  }

  const primaryItem = items.length > 0 ? items[0] : null;
  const streamUrl = primaryItem ? primaryItem.streamUrl : "";
  const embedUrl = publicAccess.enabled && publicAccess.token
    ? `${CLIENT_URL}/embed/${publicAccess.token}`
    : "";

  return {
    publicAccess,
    manifestUrl,
    items,
    subfolders,
    streamUrl,
    embedUrl,
  };
};

export const getPublicFolderManifestByTokenLogic = async ({ token, origin, referer, fileId }) => {
  if (!token) {
    const error = new Error("Token is required");
    error.status = 400;
    throw error;
  }

  const dir = await Directory.findOne({
    "publicAccess.token": token,
    "publicAccess.enabled": true,
  })
    .select("_id name publicAccess")
    .lean();

  if (!dir) {
    const error = new Error("Public folder not found or has been revoked");
    error.status = 404;
    throw error;
  }

  const allowedOrigins = dir.publicAccess.allowedOrigins || ["*"];
  const isAllowedAnywhere = allowedOrigins.includes("*");

  if (!isAllowedAnywhere) {
    const clientHost = extractHostname(origin) || extractHostname(referer);
    const isDomainAllowed = allowedOrigins.some((pattern) => matchDomainPattern(clientHost, pattern));
    if (!isDomainAllowed) {
      const error = new Error("Embedding is restricted to authorized domains for this folder");
      error.status = 403;
      error.code = "DOMAIN_RESTRICTED";
      throw error;
    }
  }

  Directory.updateOne({ _id: dir._id }, { $inc: { "publicAccess.views": 1 } }).catch((err) =>
    console.error("Async view increment failed:", err.message)
  );

  const hierarchy = await getPublishedFolderHierarchy(dir._id);

  const items = hierarchy.files.map((file) => {
    const edgeToken = generatePublicMediaToken({
      fileId: file._id,
      contentVersion: file.contentVersion || 1,
      allowedOrigins,
    });

    const streamUrl = createPublicMediaCdnUrl({
      fileId: file._id,
      extension: file.extension || "",
      token: edgeToken,
      filename: file.name,
    });

    const embedUrl = `${CLIENT_URL}/embed/${token}?fileId=${file._id}`;
    const cleanAspect = (dir.publicAccess.playerSettings?.aspectRatio || "16:9").replace(":", "/");
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="aspect-ratio: ${cleanAspect}; border-radius: ${dir.publicAccess.playerSettings?.borderRadius || "12px"};"></iframe>`;
    const videoTagCode = `<video src="${streamUrl}" controls playsinline preload="metadata"></video>`;

    const isSubfolder = file.parentDir && file.parentDir.toString() !== dir._id.toString();
    const subfolderName = isSubfolder ? (hierarchy.subDirMap.get(file.parentDir.toString()) || null) : null;

    return {
      id: file._id,
      name: file.name,
      size: file.size,
      extension: file.extension,
      subfolder: subfolderName,
      subfolderId: isSubfolder ? file.parentDir : null,
      streamUrl,
      embedUrl,
      iframeCode,
      videoTagCode,
    };
  });

  return {
    folderId: dir._id,
    folderName: dir.name,
    playerSettings: dir.publicAccess.playerSettings,
    subfolders: hierarchy.subfolders,
    items,
    selectedFileId: fileId || (items[0] ? items[0].id : null),
    totalItems: items.length,
  };
};
