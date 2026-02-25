import archiver from "archiver";
import { stat } from "fs/promises";
import express from "express";
import path from "path";
import crypto from "crypto";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { connectToDB } from "../utils/db.js";

const db = await connectToDB();
const filesCollection = db.collection("files");
const directoriesCollection = db.collection("directories");
const trashCollection = db.collection("trash");

const BASE = "storage";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("dirId", validateIdMiddleware);

router.get(["/", "/:dirId"], async (req, res) => {
  const rootDirId = decodeURIComponent(req.cookies.rootDirId);
  console.log(rootDirId);

  if (!rootDirId) {
    return res.redirect(`http://localhost:5173/login`);
  }

  try {
    const dirId = req.params.dirId || rootDirId;
    const { action } = req.query;

    const directoryData = await directoriesCollection.findOne({ id: dirId });
    if (!directoryData) {
      return res.status(404).json({ error: "Directory not found" });
    }
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
        console.error(err);
        if (!res.headersSent) {
          return res.status(500).json({ error: err.message });
        }
      });

      archive.pipe(res);

      const getDirectorySize = async (dirId) => {
        let totalSize = 0;
        let totalFiles = 0;
        const dir = await directoriesCollection.findOne({ id: dirId });
        if (!dir) return { size: 0, count: 0 };

        for (const fileId of dir.files) {
          const file = await filesCollection.findOne({ id: fileId });
          if (file) {
            try {
              const filePath = path.join(BASE, `${file.id}${file.extension}`);
              const fileStat = await stat(filePath);
              totalSize += fileStat.size;
              totalFiles++;
            } catch (e) {
              console.error(`Error getting size for file ${fileId}:`, e);
            }
          }
        }

        for (const subDirId of dir.directories) {
          const subDir = await directoriesCollection.findOne({ id: subDirId });
          if (subDir) {
            const { size, count } = await getDirectorySize(subDir.id);
            totalSize += size;
            totalFiles += count;
          }
        }
        return { size: totalSize, count: totalFiles };
      };

      const { size, count } = await getDirectorySize(directoryData.id);
      res.setHeader("X-Total-Size", size);
      res.setHeader("X-Total-Files", count);

      const addDirectory = async (dirId, zipPath) => {
        const dir = await directoriesCollection.findOne({ id: dirId });
        if (!dir) return;

        for (const fileId of dir.files) {
          const file = await filesCollection.findOne({ id: fileId });
          if (file) {
            const filePath = path.join(BASE, `${file.id}${file.extension}`);
            archive.file(filePath, {
              name: path.join(zipPath, file.name),
            });
          }
        }

        for (const subDirId of dir.directories) {
          const subDir = await directoriesCollection.findOne({ id: subDirId });
          if (subDir) {
            await addDirectory(subDir.id, path.join(zipPath, subDir.name));
          }
        }
      };

      await addDirectory(directoryData.id, directoryData.name);
      await archive.finalize();
      return; // 🔥 CRITICAL
    }

    const files = await Promise.all(
      directoryData.files.map((id) => filesCollection.findOne({ id })),
    );
    const validFiles = files.filter(Boolean);

    const directories = await Promise.all(
      directoryData.directories.map((id) =>
        directoriesCollection.findOne({ id }),
      ),
    );
    const validDirectories = directories.filter(Boolean);

    return res.status(200).json({
      ...directoryData,
      directories: validDirectories,
      files: validFiles,
    });
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).send("Internal Server Error");
    }
  }
});

router.post(["/", "/:parentDirId"], async (req, res) => {
  const rootDirId = decodeURIComponent(req.cookies.rootDirId);
  try {
    const parentDirId = req.params.parentDirId ?? rootDirId;
    console.log(parentDirId);
    const dirName = req.body.foldername ?? "new-folder";
    console.log(dirName);
    const parentDir = await directoriesCollection.findOne({ id: parentDirId });
    const dirId = crypto.randomUUID();

    await directoriesCollection.updateOne(
      { id: parentDirId },
      { $push: { directories: dirId } },
    );

    await directoriesCollection.insertOne({
      id: dirId,
      name: dirName,
      userId: req.cookies.userId,
      type: "directory",
      parentDir: parentDirId,
      files: [],
      directories: [],
    });

    return res.status(201).send("Folder created successfully");
  } catch (err) {
    if (err.code === "EEXIST") {
      return res.status(409).send("Folder already exists");
    } else {
      return res.status(500).send("Internal Server Error");
    }
  }
});

router.patch("/:dirId", async (req, res) => {
  try {
    const { dirId } = req.params;
    const directoryData = await directoriesCollection.findOne({ id: dirId });

    if (directoryData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to rename this directory");
    }
    const { newDirName } = req.body;
    await directoriesCollection.updateOne(
      { id: dirId },
      { $set: { name: newDirName } },
    );
    return res.status(200).send("Folder renamed successfully");
  } catch {
    return res.status(404).send("Folder not found");
  }
});

router.delete("/:dirId", async (req, res) => {
  try {
    const { dirId } = req.params;
    const dirData = await directoriesCollection.findOne({ id: dirId });

    if (dirData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to delete this directory");
    }

    if (!dirData) {
      return res.status(404).send("Folder not found");
    }

    const parentDirectory = await directoriesCollection.findOne({
      id: dirData.parentDir,
    });

    await directoriesCollection.updateOne(
      { id: dirData.parentDir },
      { $pull: { directories: dirId } },
    );

    const deletedDirectory = await directoriesCollection.findOne({ id: dirId });
    if (deletedDirectory) {
      await directoriesCollection.deleteOne({ id: dirId });
      await trashCollection.insertOne(deletedDirectory);
    }

    return res.status(200).send("Folder deleted successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

router.patch("/:dirId/move", checkAuth, async (req, res) => {
  try {
    const { dirId } = req.params;
    const transfers = req.body;

    const targetDir = await directoriesCollection.findOne({ id: dirId });
    if (!targetDir) {
      return res.status(404).json({ message: "Target folder not found" });
    }

    for (const transfer of transfers) {
      if (transfer.id === dirId) {
        continue;
      }
      if (transfer.type === "directory") {
        const directory = await directoriesCollection.findOne({
          id: transfer.id,
        });
        if (!directory) continue;

        // 🔴 remove from old parent
        await directoriesCollection.updateOne(
          { id: directory.parentDir },
          { $pull: { directories: directory.id } },
        );

        // 🟢 add to new parent
        await directoriesCollection.updateOne(
          { id: dirId },
          { $push: { directories: directory.id } },
        );

        // update moving dir's parent
        await directoriesCollection.updateOne(
          { id: directory.id },
          { $set: { parentDir: dirId } },
        );
      } else {
        const file = await filesCollection.findOne({ id: transfer.id });
        if (!file) continue;

        // 🔴 remove from old parent
        await directoriesCollection.updateOne(
          { id: file.parentDir },
          { $pull: { files: file.id } },
        );

        // 🟢 add to new parent
        await directoriesCollection.updateOne(
          { id: dirId },
          { $push: { files: file.id } },
        );

        // update moving file's parent
        await filesCollection.updateOne(
          { id: file.id },
          { $set: { parentDir: dirId } },
        );
      }
    }

    return res.status(200).json({ message: "Items moved successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Move failed" });
  }
});

export default router;
