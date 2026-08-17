import path from "node:path";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";
import { cacheDel, cacheHgetall, cacheHset } from "../databases/redis.js";
import { updateParentDirectorySize, populateDirectoryItemCounts } from "./directory.service.js";
import { deleteFromB2, deleteMultipleFromB2 } from "../integrations/storage/s3.client.js";

const STORAGE_DIR = path.join(import.meta.dirname, "../storage");

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

export const getTrashItemsLogic = async (userId) => {
  const trashItems = await Trash.find({ userId })
    .select("-__v")
    .lean();

  const dirItems = trashItems.filter((item) => item.type === "directory");
  const populatedDirs = await populateDirectoryItemCounts(dirItems);
  const dirMap = new Map(populatedDirs.map((d) => [d._id.toString(), d]));

  const itemsWithCount = trashItems.map((item) => {
    const idStr = item._id.toString();
    if (item.type === "directory") {
      const populated = dirMap.get(idStr);
      return {
        ...item,
        id: idStr,
        _id: idStr,
        type: "directory",
        itemCount: populated ? populated.itemCount : 0,
        items: populated ? populated.itemCount : 0,
        filesCount: populated ? populated.filesCount : 0,
        directoriesCount: populated ? populated.directoriesCount : 0,
        size: populated ? populated.size || 0 : item.size || 0,
      };
    }
    const ext = item.extension ? item.extension.toLowerCase() : "";
    return {
      ...item,
      id: idStr,
      _id: idStr,
      type: "file",
      hasThumbnail: item.hasThumbnail || mediaExts.includes(ext),
    };
  });

  return itemsWithCount;
};

export const emptyTrashLogic = async (userId) => {
  const trashItems = await Trash.find({ userId })
    .select("_id type extension")
    .lean();
  for (const trashItem of trashItems) {
    if (trashItem.type === "directory") {
      // Clean up all child files/directories still in File/Directory collections
      await deleteByParentChain(trashItem._id.toString());
    } else {
      await deleteFromB2({
        key: `${trashItem._id.toString()}${trashItem.extension}`,
      });
      await deleteFromB2({
        key: `thumbnails/${trashItem._id.toString()}.jpg`,
      });
    }
  }

  await Trash.deleteMany({ userId });
};

export const restoreFileLogic = async ({ id, userId, userRole, rootDirId }) => {
  const trashfile = await Trash.findOne({ _id: id }).select("-__v").lean();
  if (!trashfile) {
    const error = new Error("File not found in trash");
    error.status = 404;
    throw error;
  }

  if (
    trashfile.userId.toString() !== userId &&
    userRole !== "Owner" &&
    userRole !== "Admin"
  ) {
    const error = new Error("Unauthorized to restore this file");
    error.status = 403;
    throw error;
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

  const parentDirId = parentDirData
    ? trashfile.parentDir
    : rootDirId;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { deleted_at, ...validFileData } = trashfile;
    validFileData.parentDir = parentDirId;

    // Recalculate path
    const parentDirDoc = await Directory.findById(parentDirId)
      .session(session)
      .select("path")
      .lean();
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

  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

export const deleteFileForeverLogic = async ({ fileid, userId, userRole }) => {
  const trashFile = await Trash.findOne({ _id: fileid })
    .select("_id extension userId")
    .lean();
  if (!trashFile) {
    const error = new Error("File not found in trash");
    error.status = 404;
    throw error;
  }

  if (
    trashFile.userId.toString() !== userId &&
    userRole !== "Owner" &&
    userRole !== "Admin"
  ) {
    const error = new Error("Unauthorized to delete this file");
    error.status = 403;
    throw error;
  }

  console.log("Deleting forever:", trashFile);

  await deleteFromB2({
    key: `${trashFile._id.toString()}${trashFile.extension}`,
  });
  await deleteFromB2({ key: `thumbnails/${trashFile._id.toString()}.jpg` });

  await Trash.deleteOne({ _id: fileid });
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

const updateDirectoryPathAndDescendants = async (
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

export const restoreDirectoryLogic = async ({ dirId, userId, userRole, rootDirId }) => {
  const trashDir = await Trash.findOne({ _id: dirId }).select("-__v").lean();
  if (!trashDir) {
    const error = new Error("Directory not found in trash");
    error.status = 404;
    throw error;
  }

  if (
    trashDir.userId.toString() !== userId &&
    userRole !== "Owner" &&
    userRole !== "Admin"
  ) {
    const error = new Error("Unauthorized to restore this directory");
    error.status = 403;
    throw error;
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

  const parentDirId = parentDirData ? trashDir.parentDir : rootDirId;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { extension, size, hasThumbnail, deleted_at, ...validDirData } =
      trashDir;
    validDirData.parentDir = parentDirId;

    // Recalculate directory path
    const parentDirDoc = await Directory.findById(parentDirId)
      .session(session)
      .select("path")
      .lean();
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

  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

export const deleteDirectoryForeverLogic = async ({ dirId, userId, userRole }) => {
  const trashDir = await Trash.findOne({ _id: dirId })
    .select("userId")
    .lean();
  if (!trashDir) {
    const error = new Error("Directory not found in trash");
    error.status = 404;
    throw error;
  }

  if (
    trashDir.userId.toString() !== userId &&
    userRole !== "Owner" &&
    userRole !== "Admin"
  ) {
    const error = new Error("Unauthorized to delete this directory");
    error.status = 403;
    throw error;
  }

  const idsToDelete = await deleteByParentChain(dirId);
  idsToDelete.push(dirId);
  await Trash.deleteMany({ _id: { $in: idsToDelete } });
};

export const batchDeleteLogic = async ({ items, userId, userRole }) => {
  if (!items || !Array.isArray(items)) {
    const error = new Error("Invalid items array");
    error.status = 400;
    throw error;
  }

  console.log(`Processing batch delete for ${items.length} items`);

  let allIdsToDeleteFromTrash = [];

  for (const item of items) {
    const trashItem = await Trash.findOne({ _id: item.id })
      .select("userId")
      .lean();
    if (!trashItem) continue;

    if (
      trashItem.userId.toString() !== userId &&
      userRole !== "Owner" &&
      userRole !== "Admin"
    ) {
      const error = new Error("Unauthorized to delete one or more items");
      error.status = 403;
      throw error;
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
        await deleteFromB2({
          key: `${trashFile._id.toString()}${trashFile.extension}`,
        });
        await deleteFromB2({
          key: `thumbnails/${trashFile._id.toString()}.jpg`,
        });
      }
    }
  }

  if (allIdsToDeleteFromTrash.length > 0) {
    await Trash.deleteMany({
      _id: { $in: allIdsToDeleteFromTrash },
    });
  }
};
