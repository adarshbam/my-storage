import archiver from "archiver";
import path from "path";
import crypto from "crypto";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Trash from "../models/trashModel.js";

const BASE = "storage";

export const getDirectoryById = async (req, res) => {
  const rootDirId = decodeURIComponent(req.cookies.rootDirId);
  // console.log(rootDirId);

  if (!rootDirId) {
    return res.redirect(
      `http://[2409:40e3:40ea:818b:f5a2:c64b:63e3:59a6]:5173/login`,
    );
  }

  try {
    const dirId = req.params.dirId || rootDirId;
    const { action } = req.query;

    const directoryData = await Directory.findOne({ id: dirId }).lean();
    // console.log(directoryData);

    if (!directoryData) {
      return res.status(404).json({ error: "Directory not found" });
    }
    directoryData.files = await File.find({ parentDir: dirId }).lean();
    const childDirs = await Directory.find({ parentDir: dirId }).lean();

    directoryData.directories = await Promise.all(
      childDirs.map(async (dir) => {
        const fileCount = await File.countDocuments({
          parentDir: dir.id,
        });
        const dirCount = await Directory.countDocuments({
          parentDir: dir.id,
        });
        return { ...dir, itemCount: fileCount + dirCount };
      }),
    );

    // console.log(directoryData);

    if (directoryData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to access this directory");
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

      const getDirectorySize = async (dirId) => {
        let totalSize = 0;
        let totalFiles = 0;
        const dirDirectories = await Directory.find({
          parentDir: dirId,
        }).lean();
        const dirfiles = await File.find({ parentDir: dirId }).lean();
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
            const { size, count } = await getDirectorySize(subDir.id);
            totalSize += size;
            totalFiles += count;
          }
        }
        return { size: totalSize, count: totalFiles };
      };

      const { size, count } = await getDirectorySize(directoryData.id);

      // Set headers before piping so headers are sent first
      res.setHeader("X-Total-Size", size);
      res.setHeader("X-Total-Files", count);

      // Now we can pipe
      archive.pipe(res);

      const addDirectory = async (dirId, zipPath) => {
        const dir = await Directory.findOne({ id: dirId });
        if (!dir) return;

        const dirFiles = await File.find({ parentDir: dirId }).lean();
        for (const file of dirFiles) {
          if (file) {
            const filePath = path.join(BASE, `${file.id}${file.extension}`);
            archive.file(filePath, {
              name: path.join(zipPath, file.name),
            });
          }
        }

        const childDirs = await Directory.find({
          parentDir: dirId,
        }).lean();
        for (const subDir of childDirs) {
          if (subDir) {
            await addDirectory(subDir.id, path.join(zipPath, subDir.name));
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
  const rootDirId = decodeURIComponent(req.cookies.rootDirId);
  try {
    const parentDirId = req.params.parentDirId ?? rootDirId;
    // console.log(parentDirId);
    const dirName = req.body.foldername ?? "new-folder";
    // console.log(dirName);
    const dirId = crypto.randomUUID();

    await Directory.create({
      id: dirId,
      name: dirName,
      userId: req.cookies.userId,
      type: "directory",
      parentDir: parentDirId,
    });

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
    const directoryData = await Directory.findOne({ id: dirId }).lean();
    console.log(directoryData);

    if (!directoryData) {
      return res.status(404).send("Folder not found");
    }

    if (directoryData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to rename this directory");
    }
    const { newDirName } = req.body;
    await Directory.updateOne({ id: dirId }, { $set: { name: newDirName } });
    return res.status(200).send("Folder renamed successfully");
  } catch (error) {
    console.error("Rename Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteDirectory = async (req, res) => {
  try {
    const { dirId } = req.params;
    const dirData = await Directory.findOne({ id: dirId }).lean();

    if (!dirData) {
      return res.status(404).send("Folder not found");
    }

    if (dirData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to delete this directory");
    }

    const deletedDirectory = await Directory.findOne({ id: dirId }).lean();
    if (deletedDirectory) {
      await Directory.deleteOne({ id: dirId });
      await Trash.create(deletedDirectory);
    }

    return res.status(200).send("Folder deleted successfully");
  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const moveDirectory = async (req, res) => {
  try {
    const { dirId } = req.params;
    const transfers = req.body;

    const rootDirId = req.cookies.rootDirId
      ? decodeURIComponent(req.cookies.rootDirId)
      : null;
    let targetDir = null;

    if (dirId === rootDirId) {
      targetDir = { id: rootDirId };
    } else {
      targetDir = await Directory.findOne({ id: dirId });
    }

    if (!targetDir) {
      return res.status(404).json({ message: "Target folder not found" });
    }

    const itemIds = transfers.map((t) => t.id);

    await Directory.updateMany(
      { id: { $in: itemIds } },
      { $set: { parentDir: dirId } },
    );

    await File.updateMany(
      { id: { $in: itemIds } },
      { $set: { parentDir: dirId } },
    );

    return res.status(200).json({ message: "Items moved successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Move failed" });
  }
};
