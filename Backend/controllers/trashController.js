import { rm } from "fs/promises";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";

export const getTrashItems = async (req, res, next) => {
  try {
    const trashItems = await Trash.find().select("-__v").lean();

    const itemsWithCount = await Promise.all(
      trashItems.map(async (item) => {
        if (item.type === "directory") {
          const fileCount = await File.countDocuments({
            parentDir: item._id.toString(),
          });
          const dirCount = await Directory.countDocuments({
            parentDir: item._id.toString(),
          });
          return {
            ...item,
            id: item._id.toString(),
            itemCount: fileCount + dirCount,
          };
        }
        return { ...item, id: item._id.toString() };
      }),
    );

    return res.send(itemsWithCount);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
};

export const emptyTrash = async (req, res) => {
  try {
    const trashItems = await Trash.find().select("_id type extension").lean();
    for (const trashItem of trashItems) {
      if (trashItem.type === "directory") {
        // Clean up all child files/directories still in File/Directory collections
        await deleteByParentChain(trashItem._id.toString());
      } else {
        const filePath = `./storage/${trashItem._id.toString()}${trashItem.extension}`;
        try {
          await rm(filePath, { recursive: true, force: true });

          // Also try to delete thumbnail if exists
          const thumbPath = `./storage/thumbnails/${trashItem._id.toString()}.jpg`;
          await rm(thumbPath, { force: true }).catch(() => {});
        } catch (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
        }
      }
    }

    await Trash.deleteMany({});
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

    if (!parentDirData) {
      trashfile.parentDir = null;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await File.create([trashfile], { session });
      await Trash.deleteOne({ _id: id }).session(session);

      await session.commitTransaction();
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
      .select("_id extension")
      .lean();
    if (!trashFile) {
      return res.status(404).send("File not found in trash");
    }

    console.log("Deleting forever:", trashFile);

    const filePath = `./storage/${trashFile._id.toString()}${trashFile.extension}`;
    try {
      await rm(filePath, { recursive: true, force: true });

      // Also delete thumbnail
      await rm(`./storage/thumbnails/${trashFile._id.toString()}.jpg`, {
        force: true,
      }).catch(() => {});
    } catch (err) {
      console.error(`Failed to delete file on disk ${filePath}:`, err);
    }

    await Trash.deleteOne({ _id: fileid });
    return res.status(200).send("File deleted forever");
  } catch (err) {
    console.error("Delete forever API error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

async function deleteByParentChain(parentId) {
  const filesToDelete = await File.find({ parentDir: parentId })
    .select("_id extension")
    .lean();

  const fileIds = filesToDelete.map((file) => file._id.toString());
  let idsToDelete = [...fileIds];
  if (fileIds.length > 0) {
    await File.deleteMany({ _id: { $in: fileIds } });
  }

  for (const file of filesToDelete) {
    await rm(`./storage/${file._id.toString()}${file.extension}`, {
      force: true,
    }).catch(() => {});
    // Delete thumbnail
    await rm(`./storage/thumbnails/${file._id.toString()}.jpg`, {
      force: true,
    }).catch(() => {});
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

export const restoreDirectory = async (req, res, next) => {
  try {
    const { dirId } = req.params;
    const trashDir = await Trash.findOne({ _id: dirId }).select("-__v").lean();
    if (!trashDir) {
      return res.status(404).send("Directory not found in trash");
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

    if (!parentDirData) {
      trashDir.parentDir = null; // optional logic
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { extension, size, hasThumbnail, ...validDirData } = trashDir;
      await Directory.create([validDirData], { session });
      await Trash.deleteOne({ _id: dirId }).session(session);

      await session.commitTransaction();
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
      allIdsToDeleteFromTrash.push(item.id);

      if (item.type === "directory") {
        const ids = await deleteByParentChain(item.id);
        allIdsToDeleteFromTrash = [...allIdsToDeleteFromTrash, ...ids];
      } else {
        const trashFile = await Trash.findOne({ _id: item.id })
          .select("_id extension")
          .lean();
        if (trashFile) {
          const filePath = `./storage/${trashFile._id.toString()}${trashFile.extension}`;
          try {
            await rm(filePath, { recursive: true, force: true });
            await rm(`./storage/thumbnails/${trashFile._id.toString()}.jpg`, {
              force: true,
            }).catch(() => {});
          } catch (err) {
            console.error(`Failed to delete file on disk ${filePath}:`, err);
          }
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
