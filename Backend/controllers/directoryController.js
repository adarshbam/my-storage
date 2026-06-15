import archiver from "archiver";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { sanitize } from "../utils/sanitize.js";
import mongoose from "mongoose";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Trash from "../models/trashModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import { hasWriteAccess } from "../utils/integrationHelper.js";
import { cacheDel, cacheHgetall, cacheHset } from "../utils/redis.js";
import {
  getDirectoryPath,
  updateParentDirectorySize,
} from "./fileController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, "../storage");
const THUMBNAILS_DIR = path.join(STORAGE_DIR, "thumbnails");

export const getDirectoryById = async (req, res) => {
  const rootDirId = req.user.rootDirId.toString();

  try {
    let dirId = req.params.dirId;
    if (!dirId || dirId === "undefined") {
      dirId = rootDirId;
    }
    const { action } = req.query;

    let directoryData = await Directory.findOne({ _id: dirId })
      .select("-__v")
      .lean();
    // console.log(directoryData);

    if (!directoryData) {
      return res.status(404).json({ error: "Directory not found" });
    }

    directoryData._id = directoryData._id.toString();
    const files = await File.find({ parentDir: dirId }).select("-__v").lean();
    directoryData.files = await Promise.all(
      files.map(async (file) => {
        const path = await Directory.find({
          _id: { $in: file.path },
        })
          .select("-_id name")
          .lean();

        path.push({ name: file.name });

        return {
          ...file,
          _id: file._id.toString(),
          path: path,
        };
      }),
    );

    const childDirs = await Directory.find({ parentDir: dirId })
      .select("-__v")
      .lean();

    const childDirsWithCounts = await Promise.all(
      childDirs.map(async (dir) => {
        const filesCount = await File.countDocuments({
          parentDir: dir._id,
        });

        const directoriesCount = await Directory.countDocuments({
          parentDir: dir._id,
        });

        const items = filesCount + directoriesCount;
        const path = await Directory.find({ _id: { $in: dir.path } })
          .select("-_id name")
          .lean();

        return {
          ...dir,
          filesCount,
          path,
          directoriesCount,
          items,
        };
      }),
    );
    directoryData.directories = childDirsWithCounts;
    const path = await Directory.find({ _id: { $in: directoryData.path } })
      .select("name")
      .lean();
    directoryData.path = path;
    // console.log(childDirsWithCounts);

    if (
      directoryData.userId &&
      directoryData.userId.toString() !== req.user.id &&
      req.user.role !== "Owner" &&
      req.user.role !== "Admin" &&
      req.user.role !== "Manager"
    ) {
      const hasAccess = await SharedAccess.findOne({
        userId: directoryData.userId,
        targetUserId: req.user.id,
      });

      if (!hasAccess) {
        return res
          .status(403)
          .send("You are not authorized to access this directory");
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

      // Set headers before piping so headers are sent first
      res.setHeader("X-Total-Size", size);
      res.setHeader("X-Total-Files", count);

      // Now we can pipe
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
      return; // 🔥 CRITICAL
    }

    return res.status(200).json(directoryData);
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).send("Internal Server Error");
    }
  }
};

export const createDirectory = async (req, res) => {
  const rootDirId = req.user.rootDirId.toString();
  try {
    let parentDirId = req.params.parentDirId;
    if (!parentDirId || parentDirId === "undefined") {
      parentDirId = rootDirId;
    }

    let ownerId = req.user.id;
    // Verify parent directory ownership and check shared permissions
    if (parentDirId && parentDirId !== rootDirId) {
      const parentDir = await Directory.findOne({ _id: parentDirId })
        .select("userId")
        .lean();
      if (parentDir && parentDir.userId) {
        ownerId = parentDir.userId.toString();
        const canWrite = await hasWriteAccess(ownerId, req);
        if (!canWrite) {
          return res
            .status(403)
            .send("You are not authorized to create folders in this directory");
        }
      }
    }

    // console.log(parentDirId);
    const dirName = sanitize(req.body.foldername ?? "new-folder");
    // console.log(dirName);
    const dirId = new mongoose.Types.ObjectId();

    const path = await getDirectoryPath(dirId, parentDirId);

    await Directory.create({
      _id: dirId,
      name: dirName,
      path,
      userId: ownerId,
      type: "directory",
      parentDir: parentDirId,
    });

    await cacheDel("dir:meta:" + parentDirId);

    return res.status(201).send("Folder created successfully");
  } catch (err) {
    if (err.code === "EEXIST") {
      return res.status(409).send("Folder already exists");
    } else {
      return res.status(500).send("Internal Server Error");
    }
  }
};

export const renameDirectory = async (req, res) => {
  try {
    const { dirId } = req.params;
    const directoryData = await Directory.findOne({ _id: dirId })
      .select("userId")
      .lean();
    console.log(directoryData);

    if (!directoryData) {
      return res.status(404).send("Folder not found");
    }

    const ownerId = directoryData.userId
      ? directoryData.userId.toString()
      : req.user.id;
    const canWrite = await hasWriteAccess(ownerId, req);
    if (!canWrite) {
      return res
        .status(403)
        .send("You are not authorized to rename this directory");
    }
    const { newDirName } = req.body;
    await Directory.updateOne(
      { _id: dirId },
      { $set: { name: sanitize(newDirName) } },
    );
    return res.status(200).send("Folder renamed successfully");
  } catch (error) {
    console.error("Rename Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteDirectory = async (req, res) => {
  try {
    const { dirId } = req.params;
    const dirData = await Directory.findOne({ _id: dirId })
      .select("userId parentDir")
      .lean();

    if (!dirData) {
      return res.status(404).send("Folder not found");
    }

    const ownerId = dirData.userId ? dirData.userId.toString() : req.user.id;
    const canWrite = await hasWriteAccess(ownerId, req);
    if (!canWrite) {
      return res
        .status(403)
        .send("You are not authorized to delete this directory");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const directoryToBeDeleted = await Directory.findOne({ _id: dirId })
        .select("parentDir size")
        .lean();

      await updateParentDirectorySize(
        directoryToBeDeleted.parentDir,
        -directoryToBeDeleted.size,
      );

      const deletedDirectory = await Directory.findOne({ _id: dirId })
        .select("-__v")
        .session(session)
        .lean();
      if (deletedDirectory) {
        await Directory.deleteOne({ _id: dirId }).session(session);
        await Trash.create([deletedDirectory], { session });
      }

      await session.commitTransaction();

      await cacheDel("dir:meta:" + dirId);
      if (dirData && dirData.parentDir) {
        await cacheDel("dir:meta:" + dirData.parentDir.toString());
      }

      return res.status(200).send("Folder deleted successfully");
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

const updateDirectoryPathAndDescendants = async (dirId, newParentDirId, session) => {
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

const getAvailableName = async (parentDirId, originalName, isDirectory, session = null) => {
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
    const checkName = counter === 0 ? name : `${base} - Copy${counter > 1 ? ` (${counter})` : ""}${ext}`;
    
    let match;
    if (isDirectory) {
      const query = Directory.findOne({ parentDir: parentDirId, name: checkName }).select("_id").lean();
      if (session) query.session(session);
      match = await query;
    } else {
      const query = File.findOne({ parentDir: parentDirId, name: checkName }).select("_id").lean();
      if (session) query.session(session);
      match = await query;
    }
    
    if (!match) {
      return checkName;
    }
    counter++;
  }
};

const copyDirectoryRecursive = async (sourceDirId, newDirId, targetParentDirId, targetOwnerId, parentPath, session) => {
  const sourceDir = await Directory.findById(sourceDirId).session(session).lean();
  if (!sourceDir) return;

  const newDirPath = [...parentPath, newDirId];
  const resolvedName = sourceDir.name; 

  await Directory.create([{
    _id: newDirId,
    name: resolvedName,
    userId: targetOwnerId,
    parentDir: targetParentDirId,
    path: newDirPath,
    size: sourceDir.size,
    provider: sourceDir.provider || "local",
  }], { session });

  // 1. Copy all direct files in this subdirectory
  const files = await File.find({ parentDir: sourceDirId }).session(session).lean();
  for (const file of files) {
    const newFileId = new mongoose.Types.ObjectId();
    const oldFilePath = path.join(STORAGE_DIR, `${file._id.toString()}${file.extension}`);
    const newFilePath = path.join(STORAGE_DIR, `${newFileId.toString()}${file.extension}`);

    try {
      await fs.copyFile(oldFilePath, newFilePath);
    } catch (copyErr) {
      console.error(`Failed to copy physical file ${file._id}:`, copyErr);
      throw new Error(`Physical file copying failed for "${file.name}"`);
    }

    if (file.hasThumbnail) {
      const oldThumbPath = path.join(THUMBNAILS_DIR, `${file._id.toString()}.jpg`);
      const newThumbPath = path.join(THUMBNAILS_DIR, `${newFileId.toString()}.jpg`);
      try {
        await fs.copyFile(oldThumbPath, newThumbPath);
      } catch (thumbErr) {
        console.warn(`Failed to copy thumbnail for ${file._id}:`, thumbErr);
      }
    }

    await File.create([{
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
    }], { session });
  }

  // 2. Recursively copy all subdirectories
  const subDirs = await Directory.find({ parentDir: sourceDirId }).session(session).lean();
  for (const subDir of subDirs) {
    const newSubDirId = new mongoose.Types.ObjectId();
    await copyDirectoryRecursive(subDir._id, newSubDirId, newDirId, targetOwnerId, newDirPath, session);
  }
};

export const moveItems = async (req, res) => {
  try {
    let { dirId } = req.params;
    const transfers = req.body;

    const rootDirId = req.user.rootDirId.toString();
    if (!dirId || dirId === "undefined" || dirId === "null") {
      dirId = rootDirId;
    }

    const targetDir = await Directory.findOne({ _id: dirId }).lean();
    if (!targetDir) {
      return res.status(404).json({ message: "Target folder not found" });
    }

    let targetOwnerId = targetDir.userId ? targetDir.userId.toString() : req.user.id;
    const canWriteTarget = await hasWriteAccess(targetOwnerId, req);
    if (!canWriteTarget) {
      return res.status(403).json({
        message: "You are not authorized to move items to this folder",
      });
    }

    const itemIds = transfers.map((t) => t._id || t.id);
    const sourceDirs = await Directory.find({ _id: { $in: itemIds } }).lean();
    const sourceFiles = await File.find({ _id: { $in: itemIds } }).lean();

    // Check write access for all items being moved
    for (const item of [...sourceDirs, ...sourceFiles]) {
      const itemOwnerId = item.userId ? item.userId.toString() : req.user.id;
      const canWriteItem = await hasWriteAccess(itemOwnerId, req);
      if (!canWriteItem) {
        return res.status(403).json({
          message: "You are not authorized to move some of these items",
        });
      }
      
      // Also prevent moving a directory into itself or its own subdirectories
      if (item.type === "directory" && dirId !== rootDirId) {
        if (dirId === item._id.toString() || targetDir.path.includes(item._id.toString())) {
          return res.status(400).json({
            message: `Cannot move folder "${item.name}" into itself or its own subfolders`,
          });
        }
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Move Directories
      for (const dir of sourceDirs) {
        const oldParentDirId = dir.parentDir;
        if (oldParentDirId && oldParentDirId.toString() === dirId) {
          continue; // Already in target directory
        }

        // Recursively update this directory and all its descendants' paths
        await updateDirectoryPathAndDescendants(dir._id, dirId, session);

        // Update sizes: decrement old parent path sizes and increment new parent path sizes
        if (oldParentDirId) {
          await updateParentDirectorySize(oldParentDirId, -dir.size, session);
        }
        await updateParentDirectorySize(dirId, dir.size, session);
      }

      // 2. Move Files
      for (const file of sourceFiles) {
        const oldParentDirId = file.parentDir;
        if (oldParentDirId && oldParentDirId.toString() === dirId) {
          continue; // Already in target directory
        }

        file.parentDir = dirId;
        file.path = [...targetDir.path, file._id];
        await File.updateOne({ _id: file._id }, { $set: { parentDir: dirId, path: file.path } }).session(session);

        // Update sizes
        if (oldParentDirId) {
          await updateParentDirectorySize(oldParentDirId, -file.size, session);
        }
        await updateParentDirectorySize(dirId, file.size, session);
      }

      await session.commitTransaction();

      // Clear caches
      const oldParentDirs = new Set();
      for (const item of [...sourceDirs, ...sourceFiles]) {
        if (item.parentDir) {
          oldParentDirs.add(item.parentDir.toString());
        }
      }
      for (const oldPid of oldParentDirs) {
        await cacheDel("dir:meta:" + oldPid);
      }
      await cacheDel("dir:meta:" + dirId);

      return res.status(200).json({ message: "Items moved successfully" });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Move failed:", err);
    return res.status(500).json({ message: "Move failed" });
  }
};

export const copyItems = async (req, res) => {
  try {
    let { dirId } = req.params;
    const transfers = req.body; // Array of { id, type }

    const rootDirId = req.user.rootDirId.toString();
    if (!dirId || dirId === "undefined" || dirId === "null") {
      dirId = rootDirId;
    }

    const targetDir = await Directory.findOne({ _id: dirId }).lean();
    if (!targetDir) {
      return res.status(404).json({ message: "Target folder not found" });
    }

    let targetOwnerId = targetDir.userId ? targetDir.userId.toString() : req.user.id;
    const canWriteTarget = await hasWriteAccess(targetOwnerId, req);
    if (!canWriteTarget) {
      return res.status(403).json({
        message: "You are not authorized to copy items to this folder",
      });
    }

    const itemIds = transfers.map((t) => t.id || t._id);
    const sourceDirs = await Directory.find({ _id: { $in: itemIds } }).lean();
    const sourceFiles = await File.find({ _id: { $in: itemIds } }).lean();

    // Check read access for all items being copied
    for (const item of [...sourceDirs, ...sourceFiles]) {
      const itemOwnerId = item.userId ? item.userId.toString() : req.user.id;
      const canReadItem = await hasWriteAccess(itemOwnerId, req);
      if (!canReadItem) {
        return res.status(403).json({
          message: "You are not authorized to copy some of these items",
        });
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Copy Files
      for (const file of sourceFiles) {
        const newFileId = new mongoose.Types.ObjectId();
        const resolvedName = await getAvailableName(dirId, file.name, false, session);

        // Copy physical storage files
        const oldFilePath = path.join(STORAGE_DIR, `${file._id.toString()}${file.extension}`);
        const newFilePath = path.join(STORAGE_DIR, `${newFileId.toString()}${file.extension}`);
        
        try {
          await fs.copyFile(oldFilePath, newFilePath);
        } catch (copyErr) {
          console.error(`Failed to copy physical file ${file._id}:`, copyErr);
          throw new Error(`Physical file copying failed for "${file.name}"`);
        }

        // Copy thumbnail if it exists
        if (file.hasThumbnail) {
          const oldThumbPath = path.join(THUMBNAILS_DIR, `${file._id.toString()}.jpg`);
          const newThumbPath = path.join(THUMBNAILS_DIR, `${newFileId.toString()}.jpg`);
          try {
            await fs.copyFile(oldThumbPath, newThumbPath);
          } catch (thumbErr) {
            console.warn(`Failed to copy thumbnail for ${file._id}:`, thumbErr);
          }
        }

        await File.create([{
          _id: newFileId,
          name: resolvedName,
          extension: file.extension,
          type: "file",
          userId: targetOwnerId,
          parentDir: dirId,
          path: [...targetDir.path, newFileId],
          size: file.size,
          hasThumbnail: file.hasThumbnail,
          externalUrl: file.externalUrl,
        }], { session });

        // Update sizes
        await updateParentDirectorySize(dirId, file.size, session);
      }

      // 2. Copy Directories
      for (const dir of sourceDirs) {
        // Prevent copying directory inside itself or its children
        if (dirId === dir._id.toString() || targetDir.path.includes(dir._id.toString())) {
          return res.status(400).json({
            message: `Cannot copy folder "${dir.name}" into itself or its own subfolders`,
          });
        }

        const newDirId = new mongoose.Types.ObjectId();
        const resolvedName = await getAvailableName(dirId, dir.name, true, session);

        // Recursively copy contents
        await copyDirectoryRecursive(dir._id, newDirId, dirId, targetOwnerId, targetDir.path, session);

        // Update target directory size (the directory itself + all its contents size)
        await updateParentDirectorySize(dirId, dir.size, session);
      }

      await session.commitTransaction();

      // Clear caches
      await cacheDel("dir:meta:" + dirId);

      return res.status(201).json({ message: "Items copied successfully" });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Copy failed:", err);
    return res.status(500).json({ message: err.message || "Copy failed" });
  }
};
