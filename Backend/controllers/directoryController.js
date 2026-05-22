import archiver from "archiver";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Trash from "../models/trashModel.js";
import SharedAccess from "../models/sharedAccessModel.js";
import { hasWriteAccess } from "../utils/integrationHelper.js";
import { cacheDel, cacheHgetall, cacheHset } from "../utils/redis.js";

export const getDirectoryById = async (req, res) => {
  const rootDirId = req.user.rootDirId.toString();

  try {
    let dirId = req.params.dirId;
    if (!dirId || dirId === "undefined") {
      dirId = rootDirId;
    }
    const { action } = req.query;

    const directoryData = await Directory.findOne({ _id: dirId })
      .select("-__v")
      .lean();
    // console.log(directoryData);

    if (!directoryData) {
      return res.status(404).json({ error: "Directory not found" });
    }

    directoryData.id = directoryData._id.toString();
    const files = await File.find({ parentDir: dirId }).select("-__v").lean();
    directoryData.files = files.map((f) => ({ ...f, id: f._id.toString() }));

    const childDirs = await Directory.find({ parentDir: dirId })
      .select("-__v")
      .lean();

    if (
      directoryData.userId &&
      directoryData.userId.toString() !== req.user.id &&
      req.user.role !== "Owner" &&
      req.user.role !== "Admin"
    ) {
      const hasAccess = await SharedAccess.findOne({
        userId: directoryData.userId,
        targetUserId: req.user.id,
      });

      console.log(hasAccess);

      if (!hasAccess) {
        return res
          .status(403)
          .send("You are not authorized to access this directory");
      }
    }

    directoryData.directories = await Promise.all(
      childDirs.map(async (dir) => {
        const dirIdStr = dir._id.toString();
        const cachedMeta = await cacheHgetall("dir:meta:" + dirIdStr);

        if (cachedMeta) {
          return {
            ...dir,
            id: dirIdStr,
            size: Number(cachedMeta.size || 0),
            itemCount: Number(cachedMeta.itemCount || 0),
          };
        }

        const fileCount = await File.countDocuments({
          parentDir: dirIdStr,
        });
        const dirCount = await Directory.countDocuments({
          parentDir: dirIdStr,
        });
        if (!dir.size) {
          const files = await File.find({ parentDir: dirIdStr })
            .select("size")
            .lean();
          const dirFiles = await Directory.find({
            parentDir: dirIdStr,
          })
            .select("size")
            .lean();
          dir.size = files.reduce((acc, file) => acc + file.size, 0);
          dir.size += dirFiles.reduce((acc, dir) => acc + dir.size, 0);
          await Directory.updateOne(
            { _id: dirIdStr },
            { $set: { size: dir.size } },
          );
        }

        const itemCount = fileCount + dirCount;

        await cacheHset("dir:meta:" + dirIdStr, {
          size: dir.size || 0,
          itemCount: itemCount || 0,
        }, 600);

        return {
          ...dir,
          id: dirIdStr,
          itemCount: itemCount,
        };
      }),
    );

    // console.log(directoryData);

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

      const getDirectorySize = async (dirId) => {
        const cachedMeta = await cacheHgetall("dir:meta:" + dirId);
        if (cachedMeta) {
          return {
            size: Number(cachedMeta.size || 0),
            count: Number(cachedMeta.itemCount || 0),
          };
        }

        let totalSize = 0;
        let totalFiles = 0;
        const dirDirectories = await Directory.find({
          parentDir: dirId,
        })
          .select("_id")
          .lean();
        const dirfiles = await File.find({ parentDir: dirId })
          .select("size name")
          .lean();
        if (!dirfiles) return { size: 0, count: 0 };

        for (const file of dirfiles) {
          if (file) {
            try {
              totalSize += file.size;
              totalFiles++;
            } catch (e) {
              console.error(`Error getting size for file ${file.name}:`, e);
            }
          }
        }

        for (const subDir of dirDirectories) {
          if (subDir) {
            const { size, count } = await getDirectorySize(
              subDir._id.toString(),
            );
            totalSize += size;
            totalFiles += count;
          }
        }

        await cacheHset("dir:meta:" + dirId, {
          size: totalSize,
          itemCount: totalFiles,
        }, 600);

        return { size: totalSize, count: totalFiles };
      };

      const { size, count } = await getDirectorySize(directoryData.id);

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

      await addDirectory(directoryData.id, directoryData.name);
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
    const dirName = req.body.foldername ?? "new-folder";
    // console.log(dirName);
    const dirId = new mongoose.Types.ObjectId();

    await Directory.create({
      _id: dirId,
      name: dirName,
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

    const ownerId = directoryData.userId ? directoryData.userId.toString() : req.user.id;
    const canWrite = await hasWriteAccess(ownerId, req);
    if (!canWrite) {
      return res
        .status(403)
        .send("You are not authorized to rename this directory");
    }
    const { newDirName } = req.body;
    await Directory.updateOne({ _id: dirId }, { $set: { name: newDirName } });
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

export const moveDirectory = async (req, res) => {
  try {
    const { dirId } = req.params;
    const transfers = req.body;

    const rootDirId = req.user.rootDirId.toString();
    let targetDir = null;

    if (
      dirId === rootDirId ||
      (dirId === "undefined" && req.user.role !== "Owner")
    ) {
      targetDir = { _id: rootDirId };
    } else {
      targetDir = await Directory.findOne({ _id: dirId }).select("_id").lean();
    }

    if (!targetDir) {
      return res.status(404).json({ message: "Target folder not found" });
    }

    let targetOwnerId = req.user.id;
    if (dirId !== rootDirId && dirId !== "undefined") {
      const fullTargetDir = await Directory.findOne({ _id: dirId }).select("userId").lean();
      if (fullTargetDir && fullTargetDir.userId) {
        targetOwnerId = fullTargetDir.userId.toString();
      }
    }
    const canWriteTarget = await hasWriteAccess(targetOwnerId, req);
    if (!canWriteTarget) {
      return res.status(403).json({ message: "You are not authorized to move items to this folder" });
    }

    const itemIds = transfers.map((t) => t.id);

    // Check write access for all items being moved
    const sourceDirs = await Directory.find({ _id: { $in: itemIds } }).select("userId parentDir").lean();
    const sourceFiles = await File.find({ _id: { $in: itemIds } }).select("userId parentDir").lean();

    for (const item of [...sourceDirs, ...sourceFiles]) {
      const itemOwnerId = item.userId ? item.userId.toString() : req.user.id;
      const canWriteItem = await hasWriteAccess(itemOwnerId, req);
      if (!canWriteItem) {
        return res.status(403).json({ message: "You are not authorized to move some of these items" });
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Directory.updateMany(
        { _id: { $in: itemIds } },
        { $set: { parentDir: dirId } },
      ).session(session);

      await File.updateMany(
        { _id: { $in: itemIds } },
        { $set: { parentDir: dirId } },
      ).session(session);

      await session.commitTransaction();

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
    console.error(err);
    return res.status(500).json({ message: "Move failed" });
  }
};
