import { rm } from "fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";
import { cacheDel, cacheHgetall, cacheHset } from "../utils/redis.js";
import { updateParentDirectorySize } from "./fileController.js";
import { deleteFromB2, deleteMultipleFromB2 } from "../utils/s3.js";

const STORAGE_DIR = path.join(import.meta.dirname, "../storage");

export const getTrashItems = async (req, res, next) => {
  try {
    const trashItems = await Trash.find({ userId: req.user.id }).select("-__v").lean();

    const dirItems = trashItems.filter((item) => item.type === "directory");

    // Check cache in parallel
    const cachedMetas = await Promise.all(
      dirItems.map((item) => cacheHgetall("dir:meta:" + item._id.toString()))
    );

    // Identify cache misses
    const missDirIds = [];
    dirItems.forEach((item, idx) => {
      if (!cachedMetas[idx]) {
        missDirIds.push(item._id);
      }
    });

    let filesCountMap = new Map();
    let dirsCountMap = new Map();

    if (missDirIds.length > 0) {
      const [filesCounts, dirsCounts] = await Promise.all([
        File.aggregate([
          { $match: { parentDir: { $in: missDirIds } } },
          { $group: { _id: "$parentDir", count: { $sum: 1 } } },
        ]),
        Directory.aggregate([
          { $match: { parentDir: { $in: missDirIds } } },
          { $group: { _id: "$parentDir", count: { $sum: 1 } } },
        ]),
      ]);

      filesCountMap = new Map(filesCounts.map((c) => [c._id.toString(), c.count]));
      dirsCountMap = new Map(dirsCounts.map((c) => [c._id.toString(), c.count]));
    }

    let dirItemIdx = 0;
    const itemsWithCount = await Promise.all(
      trashItems.map(async (item) => {
        if (item.type === "directory") {
          const dirIdStr = item._id.toString();
          const cachedMeta = cachedMetas[dirItemIdx];
          dirItemIdx++;

          if (cachedMeta) {
            return {
              ...item,
              id: dirIdStr,
              itemCount: Number(cachedMeta.itemCount || 0),
              filesCount: Number(cachedMeta.filesCount || 0),
              directoriesCount: Number(cachedMeta.directoriesCount || 0),
            };
          }

          const fileCount = filesCountMap.get(dirIdStr) || 0;
          const dirCount = dirsCountMap.get(dirIdStr) || 0;
          const itemCount = fileCount + dirCount;

          // Populate cache asynchronously
          cacheHset(
            "dir:meta:" + dirIdStr,
            {
              size: item.size || 0,
              itemCount: itemCount,
              filesCount: fileCount,
              directoriesCount: dirCount,
            },
            600,
          ).catch((err) => console.error("Cache populate error in trash:", err));

          return {
            ...item,
            id: dirIdStr,
            itemCount: itemCount,
            filesCount: fileCount,
            directoriesCount: dirCount,
          };
        }
        return { ...item, id: item._id.toString() };
      })
    );

    return res.send(itemsWithCount);
  } catch (err) {
    console.error("getTrashItems error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const emptyTrash = async (req, res) => {
  try {
    const trashItems = await Trash.find({ userId: req.user.id }).select("_id type extension").lean();
    for (const trashItem of trashItems) {
      if (trashItem.type === "directory") {
        // Clean up all child files/directories still in File/Directory collections
        await deleteByParentChain(trashItem._id.toString());
      } else {
        await deleteFromB2({ key: `${trashItem._id.toString()}${trashItem.extension}` });
        await deleteFromB2({ key: `thumbnails/${trashItem._id.toString()}.jpg` });
      }
    }

    await Trash.deleteMany({ userId: req.user.id });
    return res.status(200).send("Trash emptied successfully");
  } catch (err) {
    console.error("Empty trash error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const restoreFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trashfile = await Trash.findOne({ _id: id }).select("-__v").lean();
    if (!trashfile) {
      return res.status(404).send("File not found in trash");
    }

    if (
      trashfile.userId.toString() !== req.user.id &&
      req.user.role !== "Owner" &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).send("Unauthorized to restore this file");
    }

    let parentDirData = null;
    if (
      trashfile.parentDir &&
      mongoose.Types.ObjectId.isValid(trashfile.parentDir)
    ) {
      parentDirData = await Directory.findOne({
        _id: trashfile.parentDir,
      })
        .select("_id")
        .lean();
    }

    const parentDirId = parentDirData ? trashfile.parentDir : req.user.rootDirId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { deleted_at, ...validFileData } = trashfile;
      validFileData.parentDir = parentDirId;

      // Recalculate path
      const parentDirDoc = await Directory.findById(parentDirId).session(session).select("path").lean();
      const parentPath = parentDirDoc ? parentDirDoc.path : [];
      validFileData.path = [...parentPath, id];

      await File.create([validFileData], { session });
      await Trash.deleteOne({ _id: id }).session(session);

      // Add the file size back to the parent directory and its ancestors
      await updateParentDirectorySize(parentDirId, trashfile.size, session);

      await session.commitTransaction();

      // Clear caches
      await cacheDel("dir:meta:" + parentDirId.toString());
      await cacheDel("dir:contents:" + parentDirId.toString());

      return res.status(201).send("File restored successfully");
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteFileForever = async (req, res) => {
  try {
    const { fileid } = req.params;
    const trashFile = await Trash.findOne({ _id: fileid })
      .select("_id extension userId")
      .lean();
    if (!trashFile) {
      return res.status(404).send("File not found in trash");
    }

    if (
      trashFile.userId.toString() !== req.user.id &&
      req.user.role !== "Owner" &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).send("Unauthorized to delete this file");
    }

    console.log("Deleting forever:", trashFile);

    await deleteFromB2({ key: `${trashFile._id.toString()}${trashFile.extension}` });
    await deleteFromB2({ key: `thumbnails/${trashFile._id.toString()}.jpg` });

    await Trash.deleteOne({ _id: fileid });
    return res.status(200).send("File deleted forever");
  } catch (err) {
    console.error("Delete forever API error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export async function deleteByParentChain(parentId) {
  const filesToDelete = await File.find({ parentDir: parentId })
    .select("_id extension")
    .lean();

  const fileIds = filesToDelete.map((file) => file._id.toString());
  let idsToDelete = [...fileIds];
  if (fileIds.length > 0) {
    await File.deleteMany({ _id: { $in: fileIds } });
  }

  for (const file of filesToDelete) {
    await deleteFromB2({ key: `${file._id.toString()}${file.extension}` });
    await deleteFromB2({ key: `thumbnails/${file._id.toString()}.jpg` });
  }

  const childDirs = await Directory.find({ parentDir: parentId })
    .select("_id")
    .lean();

  for (const dir of childDirs) {
    idsToDelete = [
      ...idsToDelete,
      ...(await deleteByParentChain(dir._id.toString())),
    ];
  }

  const dirIds = childDirs.map((dir) => dir._id.toString());
  if (dirIds.length > 0) {
    await Directory.deleteMany({ _id: { $in: dirIds } });
    idsToDelete = [...idsToDelete, ...dirIds];
  }

  return idsToDelete;
}

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

export const restoreDirectory = async (req, res, next) => {
  try {
    const { dirId } = req.params;
    const trashDir = await Trash.findOne({ _id: dirId }).select("-__v").lean();
    if (!trashDir) {
      return res.status(404).send("Directory not found in trash");
    }

    if (
      trashDir.userId.toString() !== req.user.id &&
      req.user.role !== "Owner" &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).send("Unauthorized to restore this directory");
    }

    let parentDirData = null;
    if (
      trashDir.parentDir &&
      mongoose.Types.ObjectId.isValid(trashDir.parentDir)
    ) {
      parentDirData = await Directory.findOne({
        _id: trashDir.parentDir,
      })
        .select("_id")
        .lean();
    }

    const parentDirId = parentDirData ? trashDir.parentDir : req.user.rootDirId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { extension, size, hasThumbnail, deleted_at, ...validDirData } = trashDir;
      validDirData.parentDir = parentDirId;

      // Recalculate directory path
      const parentDirDoc = await Directory.findById(parentDirId).session(session).select("path").lean();
      const parentPath = parentDirDoc ? parentDirDoc.path : [];
      validDirData.path = [...parentPath, dirId];

      await Directory.create([validDirData], { session });
      await Trash.deleteOne({ _id: dirId }).session(session);

      // Recursively update the path for this directory and all its descendants
      await updateDirectoryPathAndDescendants(dirId, parentDirId, session);

      // Add the directory size back to the parent directory and its ancestors
      await updateParentDirectorySize(parentDirId, trashDir.size, session);

      await session.commitTransaction();

      // Clear caches
      await cacheDel("dir:meta:" + parentDirId.toString());
      await cacheDel("dir:contents:" + parentDirId.toString());
      await cacheDel("dir:meta:" + dirId);
      await cacheDel("dir:contents:" + dirId);

      return res.status(201).send("Directory restored successfully");
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Restore Directory Error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteDirectoryForever = async (req, res) => {
  try {
    const { dirId } = req.params;
    const trashDir = await Trash.findOne({ _id: dirId }).select("userId").lean();
    if (!trashDir) {
      return res.status(404).send("Directory not found in trash");
    }

    if (
      trashDir.userId.toString() !== req.user.id &&
      req.user.role !== "Owner" &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).send("Unauthorized to delete this directory");
    }

    const idsToDelete = await deleteByParentChain(dirId);
    idsToDelete.push(dirId);
    await Trash.deleteMany({ _id: { $in: idsToDelete } });

    return res
      .status(200)
      .send("Directory fully deleted from trash successfully");
  } catch (err) {
    if (!res.headersSent) {
      return res.status(404).send(err.message);
    }
    return res.status(403).send("Forbidden");
  }
};

export const batchDelete = async (req, res) => {
  try {
    const { items } = req.body; // Expects { items: [{ id, type }] }
    if (!items || !Array.isArray(items)) {
      return res.status(400).send("Invalid items array");
    }

    console.log(`Processing batch delete for ${items.length} items`);

    let allIdsToDeleteFromTrash = [];

    for (const item of items) {
      const trashItem = await Trash.findOne({ _id: item.id }).select("userId").lean();
      if (!trashItem) continue;

      if (
        trashItem.userId.toString() !== req.user.id &&
        req.user.role !== "Owner" &&
        req.user.role !== "Admin"
      ) {
        return res.status(403).send("Unauthorized to delete one or more items");
      }

      allIdsToDeleteFromTrash.push(item.id);

      if (item.type === "directory") {
        const ids = await deleteByParentChain(item.id);
        allIdsToDeleteFromTrash = [...allIdsToDeleteFromTrash, ...ids];
      } else {
        const trashFile = await Trash.findOne({ _id: item.id })
          .select("_id extension")
          .lean();
        if (trashFile) {
          await deleteFromB2({ key: `${trashFile._id.toString()}${trashFile.extension}` });
          await deleteFromB2({ key: `thumbnails/${trashFile._id.toString()}.jpg` });
        }
      }
    }

    if (allIdsToDeleteFromTrash.length > 0) {
      await Trash.deleteMany({
        _id: { $in: allIdsToDeleteFromTrash },
      });
    }

    return res.status(200).send("Batch delete completed successfully");
  } catch (err) {
    console.error("Batch delete error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
