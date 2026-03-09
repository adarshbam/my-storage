import { rm } from "fs/promises";
import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Trash from "../models/trashModel.js";

export const getTrashItems = async (req, res, next) => {
  try {
    const trashItems = await Trash.find().lean();
    return res.send(trashItems);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
};

export const emptyTrash = async (req, res) => {
  try {
    const trashItems = await Trash.find().lean();
    for (const trashFile of trashItems) {
      if (trashFile.type === "directory") continue;
      const filePath = `./storage/${trashFile.id}${trashFile.extension}`;
      try {
        await rm(filePath, { recursive: true, force: true });

        // Also try to delete thumbnail if exists
        const thumbPath = `./storage/thumbnails/${trashFile.id}.jpg`;
        await rm(thumbPath, { force: true }).catch(() => {});
      } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
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
    const trashfile = await Trash.findOne({ id }).lean();
    if (!trashfile) {
      return res.status(404).send("File not found in trash");
    }

    let parentDirData = await Directory.findOne({
      id: trashfile.parentDir,
    }).lean();

    if (!parentDirData) {
      trashfile.parentDir = null;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await File.create([trashfile], { session });
      await Trash.deleteOne({ id }).session(session);

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
    const trashFile = await Trash.findOne({ id: fileid }).lean();
    if (!trashFile) {
      return res.status(404).send("File not found in trash");
    }

    console.log("Deleting forever:", trashFile);

    const filePath = `./storage/${trashFile.id}${trashFile.extension}`;
    try {
      await rm(filePath, { recursive: true, force: true });

      // Also delete thumbnail
      await rm(`./storage/thumbnails/${trashFile.id}.jpg`, {
        force: true,
      }).catch(() => {});
    } catch (err) {
      console.error(`Failed to delete file on disk ${filePath}:`, err);
    }

    await Trash.deleteOne({ id: fileid });
    return res.status(200).send("File deleted forever");
  } catch (err) {
    console.error("Delete forever API error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

async function deleteByParentChain(parentId) {
  const filesToDelete = await File.find({ parentDir: parentId }).lean();

  const fileIds = filesToDelete.map((file) => file.id);
  let idsToDelete = [...fileIds];
  if (fileIds.length > 0) {
    await File.deleteMany({ id: { $in: fileIds } });
  }

  for (const file of filesToDelete) {
    await rm(`./storage/${file.id}${file.extension}`, { force: true }).catch(
      () => {},
    );
    // Delete thumbnail
    await rm(`./storage/thumbnails/${file.id}.jpg`, { force: true }).catch(
      () => {},
    );
  }

  const childDirs = await Directory.find({ parentDir: parentId }).lean();

  for (const dir of childDirs) {
    idsToDelete = [...idsToDelete, ...(await deleteByParentChain(dir.id))];
  }

  const dirIds = childDirs.map((dir) => dir.id);
  if (dirIds.length > 0) {
    await Directory.deleteMany({ id: { $in: dirIds } });
    idsToDelete = [...idsToDelete, ...dirIds];
  }

  return idsToDelete;
}

export const restoreDirectory = async (req, res, next) => {
  try {
    const { dirId } = req.params;
    const trashDir = await Trash.findOne({ id: dirId }).lean();
    if (!trashDir) {
      return res.status(404).send("Directory not found in trash");
    }
    const parentDirData = await Directory.findOne({
      id: trashDir.parentDir,
    }).lean();

    if (!parentDirData) {
      trashDir.parentDir = null; // optional logic
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Directory.create([trashDir], { session });
      await Trash.deleteOne({ id: dirId }).session(session);

      await session.commitTransaction();
      return res.status(201).send("Directory restored successfully");
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

export const deleteDirectoryForever = async (req, res) => {
  try {
    const { dirId } = req.params;

    const idsToDelete = await deleteByParentChain(dirId);
    idsToDelete.push(dirId);
    await Trash.deleteMany({ id: { $in: idsToDelete } });

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
        const trashFile = await Trash.findOne({ id: item.id }).lean();
        if (trashFile) {
          const filePath = `./storage/${trashFile.id}${trashFile.extension}`;
          try {
            await rm(filePath, { recursive: true, force: true });
            await rm(`./storage/thumbnails/${trashFile.id}.jpg`, {
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
        id: { $in: allIdsToDeleteFromTrash },
      });
    }

    return res.status(200).send("Batch delete completed successfully");
  } catch (err) {
    console.error("Batch delete error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
