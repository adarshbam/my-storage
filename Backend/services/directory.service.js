import archiver from "archiver";
import path from "path";
import mongoose from "mongoose";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
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
import { copyInB2 } from "../integrations/storage/s3.client.js";

const STORAGE_DIR = path.join(import.meta.dirname, "../storage");
const THUMBNAILS_DIR = path.join(STORAGE_DIR, "thumbnails");

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
  const path =
    parentDir && parentDir.path ? [...parentDir.path, itemId] : [itemId];
  return path;
};

export const getDirectorySize = async (dirId) => {
  let size = 0;
  let count = 0;

  const files = await File.find({ parentDir: dirId }).select("size").lean();
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

  // Update openedAt timestamp for directory
  await Directory.updateOne(
    { _id: dirId },
    { $set: { openedAt: new Date() } },
  );

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
        return cachedData;
      } catch (jsonErr) {
        console.error("Failed to parse cached folder content:", jsonErr);
      }
    }
  }

  // 2. Parallelize initial fetching of directory, files, and childDirs on cache miss
  const [directoryDataRaw, files, childDirs] = await Promise.all([
    Directory.findOne({ _id: dirId }).select("-__v").lean(),
    File.find({ parentDir: dirId }).select("-__v").lean(),
    Directory.find({ parentDir: dirId }).select("-__v").lean(),
  ]);

  if (!directoryDataRaw) {
    const err = new Error("Directory not found");
    err.status = 404;
    throw err;
  }

  const directoryData = { ...directoryDataRaw };
  directoryData._id = directoryData._id.toString();

  // 3. Optimized Current-Folder-Only Path Resolution
  const pathDocs = await Directory.find({
    _id: { $in: directoryData.path || [] },
  })
    .select("name")
    .lean();

  const dirMap = new Map(pathDocs.map((d) => [d._id.toString(), d.name]));

  const mappedCurrentPath = (directoryData.path || [])
    .map((id) => {
      if (!id) return null;
      const idStr = id.toString();
      const name = dirMap.get(idStr);
      return name ? { _id: idStr, name } : null;
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
    return {
      ...file,
      _id: file._id.toString(),
      hasThumbnail: file.hasThumbnail || canHaveThumb,
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
        { $match: { parentDir: { $in: childDirIds } } },
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
    const archive = archiver("zip", { zlib: { level: 9 } });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${directoryData.name}.zip"`,
    );
    res.setHeader("Content-Type", "application/zip");

    archive.on("error", (err) => {
      console.error("Archive Error:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: err.message });
      }
    });

    const { size, count } = await getDirectorySize(directoryData._id);

    res.setHeader("X-Total-Size", size);
    res.setHeader("X-Total-Files", count);

    archive.pipe(res);

    const addDirectory = async (dirId, zipPath) => {
      const dir = await Directory.findOne({ _id: dirId })
        .select("_id")
        .lean();
      if (!dir) return;

      const dirFiles = await File.find({ parentDir: dirId })
        .select("_id extension name")
        .lean();
      for (const file of dirFiles) {
        if (file) {
          const filePath = path.join(
            "storage",
            `${file._id.toString()}${file.extension}`,
          );
          archive.file(filePath, {
            name: path.join(zipPath, file.name),
          });
        }
      }

      const childDirs = await Directory.find({
        parentDir: dirId,
      })
        .select("_id name")
        .lean();
      for (const subDir of childDirs) {
        if (subDir) {
          await addDirectory(
            subDir._id.toString(),
            path.join(zipPath, subDir.name),
          );
        }
      }
    };

    await addDirectory(directoryData._id, directoryData.name);
    await archive.finalize();
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

  await Directory.create({
    _id: dirId,
    name: name,
    path: dirPath,
    userId: ownerId,
    type: "directory",
    parentDir: parentDirId,
  });

  await cacheDel("dir:meta:" + parentDirId);
  await cacheDel("dir:contents:" + parentDirId);
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isPermanent = permanent;

    const directoryToBeDeleted = await Directory.findOne({ _id: dirId })
      .select("parentDir size path")
      .lean();

    await updateParentDirectorySize(
      (directoryToBeDeleted.path || []).slice(0, -1),
      -directoryToBeDeleted.size,
      session,
    );

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

    await session.commitTransaction();

    await cacheDel("dir:meta:" + dirId);
    await cacheDel("dir:contents:" + dirId);
    if (dirData && dirData.parentDir) {
      await cacheDel("dir:meta:" + dirData.parentDir.toString());
      await cacheDel("dir:contents:" + dirData.parentDir.toString());
    }

  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
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

  const session = await mongoose.startSession();

  let retries = 3;
  while (retries > 0) {
    session.startTransaction();
    try {
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

      await session.commitTransaction();
      break; // Success!
    } catch (txError) {
      await session.abortTransaction();

      const isTransient =
        txError.errorLabels &&
        txError.errorLabels.includes("TransientTransactionError");
      const isWriteConflict = txError.code === 112;

      if ((isTransient || isWriteConflict) && retries > 1) {
        retries--;
        console.warn(
          `Transient write conflict encountered in moveItems. Retrying transaction... (${retries} retries left)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 200 + 50),
        );
        continue;
      }
      throw txError;
    }
  }
  session.endSession();

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

  const session = await mongoose.startSession();

  let retries = 3;
  while (retries > 0) {
    session.startTransaction();
    try {
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

      await session.commitTransaction();
      break; // Success!
    } catch (txError) {
      await session.abortTransaction();

      const isTransient =
        txError.errorLabels &&
        txError.errorLabels.includes("TransientTransactionError");
      const isWriteConflict = txError.code === 112;

      if ((isTransient || isWriteConflict) && retries > 1) {
        retries--;
        console.warn(
          `Transient write conflict encountered in copyItems. Retrying transaction... (${retries} retries left)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 200 + 50),
        );
        continue;
      }
      throw txError;
    }
  }
  session.endSession();

  // Clear caches
  await cacheDel("dir:meta:" + targetDirId);
  await cacheDel("dir:contents:" + targetDirId);
};

export const deleteItemsBatchLogic = async ({ items, userId, userRole, permanent }) => {
  const req = { user: { id: userId, role: userRole } };
  if (!items || !Array.isArray(items)) {
    const error = new Error("Invalid items array");
    error.status = 400;
    throw error;
  }

  const fileIds = items.filter((i) => i.type === "file").map((i) => i.id);
  const dirIds = items.filter((i) => i.type === "directory").map((i) => i.id);

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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
        for (const f of files) {
          await deleteFromB2({ key: `${f._id.toString()}${f.extension}` });
          await deleteFromB2({ key: `thumbnails/${f._id.toString()}.jpg` });
        }
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

    await session.commitTransaction();

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

  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};
