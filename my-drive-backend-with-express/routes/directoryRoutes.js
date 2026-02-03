import archiver from "archiver";
import { writeFile, stat } from "fs/promises";
import express from "express";
import filesData from "../filesDB.json" with { type: "json" };
import directoriesData from "../directoryDB.json" with { type: "json" };
import trashDB from "../trashDB.json" with { type: "json" };
import path from "path";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

const BASE = "storage";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("dirId", validateIdMiddleware);

router.get("/{:dirId}", async (req, res) => {
  const rootDirId = decodeURIComponent(req.cookies.rootDirId);
  console.log(rootDirId);

  if (!rootDirId) {
    res.redirect(`http://localhost:5173/login`);
  }

  try {
    const dirId = req.params.dirId || rootDirId;
    const { action } = req.query;

    const directoryData = directoriesData.find((d) => d.id === dirId);
    if (directoryData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to access this directory");
    }
    if (!directoryData) {
      return res.status(404).json({ error: "Directory not found" });
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
        const dir = directoriesData.find((d) => d.id === dirId);
        if (!dir) return { size: 0, count: 0 };

        for (const fileId of dir.files) {
          const file = filesData.find((f) => f.id === fileId);
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
          const subDir = directoriesData.find((d) => d.id === subDirId);
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
        const dir = directoriesData.find((d) => d.id === dirId);
        if (!dir) return;

        for (const fileId of dir.files) {
          const file = filesData.find((f) => f.id === fileId);
          if (file) {
            const filePath = path.join(BASE, `${file.id}${file.extension}`);
            archive.file(filePath, {
              name: path.join(zipPath, file.name),
            });
          }
        }

        for (const subDirId of dir.directories) {
          const subDir = directoriesData.find((d) => d.id === subDirId);
          if (subDir) {
            await addDirectory(subDir.id, path.join(zipPath, subDir.name));
          }
        }
      };

      await addDirectory(directoryData.id, directoryData.name);
      await archive.finalize();
      return; // 🔥 CRITICAL
    }

    const files = directoryData.files
      .map((id) => filesData.find((f) => f.id === id))
      .filter(Boolean);

    const directories = directoryData.directories
      .map((id) => directoriesData.find((d) => d.id === id))
      .filter(Boolean);

    return res.status(200).json({ ...directoryData, directories, files });
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).send("Internal Server Error");
    }
  }
});

router.post("/{:parentDirId}", async (req, res) => {
  const rootDirId = decodeURIComponent(req.cookies.rootDirId);
  try {
    const parentDirId = req.params.parentDirId ?? rootDirId;
    console.log(parentDirId);
    const dirName = req.body.foldername ?? "new-folder";
    console.log(dirName);
    const parentDir = directoriesData.find((dir) => dir.id === parentDirId);

    const dirId = crypto.randomUUID();
    parentDir.directories.push(dirId);

    directoriesData.push({
      id: dirId,
      name: dirName,
      userId: req.cookies.userId,
      type: "directory",
      parentDir: parentDirId,
      files: [],
      directories: [],
    });

    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));
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
    const directoryData = directoriesData.find((dir) => dir.id === dirId);

    if (directoryData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to rename this directory");
    }
    const { newDirName } = req.body;
    directoryData.name = newDirName;
    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));
    return res.status(200).send("Folder renamed successfully");
  } catch {
    return res.status(404).send("Folder not found");
  }
});

router.delete("/:dirId", async (req, res) => {
  try {
    const { dirId } = req.params;
    const dirIndex = directoriesData.findIndex((dir) => dir.id === dirId);
    const dirData = directoriesData[dirIndex];

    if (dirData.userId !== req.user.id) {
      return res
        .status(403)
        .send("You are not authorized to delete this directory");
    }

    if (!dirData) {
      return res.status(404).send("Folder not found");
    }

    const parentDirectory = directoriesData.find(
      (directory) => directory.id === dirData.parentDir,
    );

    parentDirectory.directories = parentDirectory.directories.filter(
      (directoryId) => directoryId !== dirId,
    );

    console.log(parentDirectory);
    trashDB.push(directoriesData.splice(dirIndex, 1)[0]);

    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));
    await writeFile("./trashDB.json", JSON.stringify(trashDB));

    return res.status(200).send("File deleted successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
