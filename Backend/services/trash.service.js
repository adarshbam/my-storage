import path from "node:path";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";
import { cacheDel, cacheHgetall, cacheHset } from "../databases/redis.js";
import { updateParentDirectorySize, populateDirectoryItemCounts } from "./directory.service.js";
import { deleteFromB2, deleteMultipleFromB2 } from "../integrations/storage/s3.client.js";
import { withTransaction } from "../utils/transaction.js";

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

  await withTransaction(async (session) => {
    await Trash.deleteMany({ userId }).session(session);
  });
};

export const restoreFileLogic = async ({
  id,
  userId,
  userRole,
  rootDirId,
}) => {
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

  await withTransaction(async (session) => {
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
  });

  // Clear caches
  await cacheDel("dir:meta:" + parentDirId.toString());
  await cacheDel("dir:contents:" + parentDirId.toString());
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

  const ext = trashFile.extension ? (trashFile.extension.startsWith(".") ? trashFile.extension : `.${trashFile.extension}`) : "";
  await deleteMultipleFromB2({
    keys: [
      `${trashFile._id.toString()}${ext}`,
      `thumbnails/${trashFile._id.toString()}.webp`,
      `thumbnails/${trashFile._id.toString()}.jpg`,
    ],
  });

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

  const b2Keys = [];
  for (const file of filesToDelete) {
    const ext = file.extension ? (file.extension.startsWith(".") ? file.extension : `.${file.extension}`) : "";
    b2Keys.push(`${file._id.toString()}${ext}`);
    b2Keys.push(`thumbnails/${file._id.toString()}.webp`);
    b2Keys.push(`thumbnails/${file._id.toString()}.jpg`);
  }
  if (b2Keys.length > 0) {
    await deleteMultipleFromB2({ keys: b2Keys });
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

  await withTransaction(async (session) => {
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
  });

  // Clear caches
  await cacheDel("dir:meta:" + parentDirId.toString());
  await cacheDel("dir:contents:" + parentDirId.toString());
  await cacheDel("dir:meta:" + dirId);
  await cacheDel("dir:contents:" + dirId);
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

  let allIdsToDeleteFromTrash = [];
  const b2KeysToDelete = [];

  for (const item of items) {
    const itemId = item.id || item._id;
    if (!itemId) continue;

    const trashItem = await Trash.findOne({ _id: itemId })
      .select("userId extension type")
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

    allIdsToDeleteFromTrash.push(itemId);

    if (item.type === "directory" || trashItem.type === "directory") {
      const ids = await deleteByParentChain(itemId);
      allIdsToDeleteFromTrash = [...allIdsToDeleteFromTrash, ...ids];
    } else {
      const ext = trashItem.extension ? (trashItem.extension.startsWith(".") ? trashItem.extension : `.${trashItem.extension}`) : "";
      b2KeysToDelete.push(`${trashItem._id.toString()}${ext}`);
      b2KeysToDelete.push(`thumbnails/${trashItem._id.toString()}.webp`);
      b2KeysToDelete.push(`thumbnails/${trashItem._id.toString()}.jpg`);
    }
  }

  if (b2KeysToDelete.length > 0) {
    await deleteMultipleFromB2({ keys: b2KeysToDelete });
  }

  if (allIdsToDeleteFromTrash.length > 0) {
    await Trash.deleteMany({
      _id: { $in: allIdsToDeleteFromTrash },
    });
  }
};

export const batchRestoreLogic = async ({ items, all = false, userId, userRole, rootDirId }) => {
  let trashItems;
  if (all) {
    trashItems = await Trash.find({ userId }).select("-__v").lean();
  } else {
    if (!items || !Array.isArray(items) || items.length === 0) {
      const error = new Error("Invalid items array for restore");
      error.status = 400;
      throw error;
    }
    const itemIds = items.map((i) => i.id || i._id).filter(Boolean);
    trashItems = await Trash.find({ _id: { $in: itemIds } }).select("-__v").lean();
  }

  if (!trashItems || trashItems.length === 0) {
    return { restoredCount: 0 };
  }

  for (const item of trashItems) {
    if (
      item.userId.toString() !== userId &&
      userRole !== "Owner" &&
      userRole !== "Admin"
    ) {
      const error = new Error("Unauthorized to restore one or more items");
      error.status = 403;
      throw error;
    }
  }

  // Pre-fetch parent directories to avoid querying inside loops
  const parentDirIds = [...new Set(trashItems.map((i) => i.parentDir?.toString()).filter(Boolean))];
  const existingDirs = await Directory.find({ _id: { $in: parentDirIds } }).select("_id path").lean();
  const dirMap = new Map(existingDirs.map((d) => [d._id.toString(), d]));

  // Default root directory doc
  let rootDirDoc = null;
  if (rootDirId) {
    rootDirDoc = await Directory.findById(rootDirId).select("_id path").lean();
  }

  const filesToInsert = [];
  const dirsToInsert = [];
  const restoredIds = [];
  const sizeChanges = new Map();
  const dirDescendantUpdates = [];
  const affectedDirIds = new Set();

  for (const item of trashItems) {
    const itemId = item._id.toString();
    restoredIds.push(item._id);

    const rawParentId = item.parentDir?.toString();
    const parentDoc = (rawParentId && dirMap.get(rawParentId)) || rootDirDoc;
    const parentDirId = parentDoc ? parentDoc._id.toString() : rootDirId;
    const parentPath = parentDoc ? parentDoc.path || [] : [];
    const itemPath = [...parentPath, item._id];

    affectedDirIds.add(parentDirId);

    if (item.type === "directory") {
      affectedDirIds.add(itemId);
      const { extension, size, hasThumbnail, deleted_at, ...validDirData } = item;
      validDirData.parentDir = parentDirId;
      validDirData.path = itemPath;
      dirsToInsert.push(validDirData);
      dirDescendantUpdates.push({ dirId: item._id, parentDirId });

      if (item.size) {
        sizeChanges.set(parentDirId, (sizeChanges.get(parentDirId) || 0) + item.size);
      }
    } else {
      const { deleted_at, ...validFileData } = item;
      validFileData.parentDir = parentDirId;
      validFileData.path = itemPath;
      filesToInsert.push(validFileData);

      if (item.size) {
        sizeChanges.set(parentDirId, (sizeChanges.get(parentDirId) || 0) + item.size);
      }
    }
  }

  await withTransaction(async (session) => {
    if (filesToInsert.length > 0) {
      await File.insertMany(filesToInsert, { session });
    }
    if (dirsToInsert.length > 0) {
      await Directory.insertMany(dirsToInsert, { session });
    }

    for (const update of dirDescendantUpdates) {
      await updateDirectoryPathAndDescendants(update.dirId, update.parentDirId, session);
    }

    for (const [pId, sizeDelta] of sizeChanges.entries()) {
      await updateParentDirectorySize(pId, sizeDelta, session);
    }

    await Trash.deleteMany({ _id: { $in: restoredIds } }).session(session);
  });

  // Clear Redis caches for all affected directories
  for (const dirId of affectedDirIds) {
    if (dirId) {
      await cacheDel("dir:meta:" + dirId.toString());
      await cacheDel("dir:contents:" + dirId.toString());
    }
  }

  return { restoredCount: restoredIds.length };
};
