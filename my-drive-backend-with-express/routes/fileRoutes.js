import express from "express";
import path from "path";
import { writeFile, stat } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import filesData from "../filesDB.json" with { type: "json" };
import directoriesData from "../directoryDB.json" with { type: "json" };
import trashDB from "../trashDB.json" with { type: "json" };
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

const router = express.Router();
const BASE = "storage";

router.param("parentDirId", validateIdMiddleware);
router.param("fileId", validateIdMiddleware);

router.get("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { action } = req.query;
    const file = filesData.find((f) => f.id === fileId);

    if (file.userId !== req.user.id) {
      return res.status(403).send("You are not authorized to access this file");
    }
    if (!file) return res.status(404).send("File not found");

    const filePath = path.join(BASE, `${fileId}${file.extension}`);

    // If action is NOT download, just send the file simple way (fixes Open File)
    if (action !== "download") {
      return res.sendFile(path.resolve(filePath));
    }

    const stats = await stat(filePath);
    const fileSize = stats.size;

    const range = req.headers.range;

    // ✅ IMPORTANT HEADERS
    res.setHeader("Accept-Ranges", "bytes");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Total-Size", fileSize);

    if (range) {
      const start = Number(range.replace(/\D/g, ""));
      const end = fileSize - 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", end - start + 1);

      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.setHeader("Content-Length", fileSize);
      createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Make parentDirId optional using ?
router.post("/{:parentDirId}", async (req, res) => {
  try {
    // Robustly handle missing or "undefined" string param
    let parentDirId = req.params.parentDirId;
    const rootDirId = decodeURIComponent(req.cookies.rootDirId);

    if (!parentDirId || parentDirId === "undefined") {
      parentDirId = rootDirId;
    }

    // Support client-provided ID for resumption, or generate new one
    const id = req.headers["x-file-id"] || crypto.randomUUID();
    const fileName = req.headers.filename;
    const startByte = parseInt(req.headers["x-start-byte"] || "0", 10);
    const ext = path.extname(fileName);
    const fullFileName = `${id}${ext}`;
    const filePath = `./storage/${fullFileName}`;

    // Decide flags: 'a' for append (resume), 'w' for write (new)
    const flags = startByte > 0 ? "a" : "w";

    const writeStream = createWriteStream(filePath, { flags });

    writeStream.on("error", (err) => {
      console.error("Write stream error:", err);
      return res.status(500).send("Error writing file");
    });

    writeStream.on("finish", async () => {
      // If we are appending, the file might already exist in DB?
      // In this simple implementation, we only add to DB if it's NOT already there.
      // Ideally, we only add to DB when the *entire* file is done.
      // But for simplicity, let's just check if it exists in DB.

      const exists = filesData.find((f) => f.id === id);

      if (!exists) {
        filesData.push({
          id,
          extension: ext,
          type: "file",
          userId: req.cookies.userId,
          name: fileName,
          parentDir: parentDirId,
        });

        // Find parent directory to update its children
        // Note: parentDirId might be the string "undefined" from params if not careful,
        // generally safe to fallback to root if not found.
        let parentDirData = directoriesData.find(
          (directory) => directory.id === parentDirId,
        );

        if (!parentDirData) {
          // Fallback to root if parent not found matching ID
          // This ensures we don't crash if an invalid ID was passed
          parentDirData = directoriesData.find(
            (directory) => directory.id === rootDirId,
          );
        }

        if (parentDirData && parentDirData.files) {
          parentDirData.files.push(id);
          await writeFile(
            "./directoryDB.json",
            JSON.stringify(directoriesData),
          );
        }

        await writeFile("./filesDB.json", JSON.stringify(filesData));
      }

      if (!res.writableEnded) return res.status(201).send("File uploaded");
    });

    req.pipe(writeStream);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

router.patch("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = filesData.find((file) => file.id === fileId);

    if (file.userId !== req.user.id) {
      return res.status(403).send("You are not authorized to rename this file");
    }
    if (!file) {
      return res.status(404).send("File not found");
    }
    const { newFileName } = req.body;
    file.name = newFileName;
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    return res.status(200).send("File renamed successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

router.delete("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileIndex = filesData.findIndex((file) => file.id === fileId);
    const fileData = filesData[fileIndex];

    if (fileData.userId !== req.user.id) {
      return res.status(403).send("You are not authorized to delete this file");
    }
    if (!fileData) {
      return res.status(404).send("File not found");
    }

    const parentDirectory = directoriesData.find(
      (directory) => directory.id === fileData.parentDir,
    );
    parentDirectory.files = parentDirectory.files.filter(
      (fId) => fId !== fileId,
    );
    console.log(parentDirectory);
    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));

    trashDB.push(filesData.splice(fileIndex, 1)[0]);
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    await writeFile("./trashDB.json", JSON.stringify(trashDB));

    return res.status(200).send("File deleted successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
