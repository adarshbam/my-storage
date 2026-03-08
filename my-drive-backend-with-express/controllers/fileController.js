import { connectToDB } from "../utils/db.js";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { stat, unlink } from "fs/promises";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const db = await connectToDB();
const filesCollection = db.collection("files");
const directoriesCollection = db.collection("directories");
const trashCollection = db.collection("trash");

const BASE = "storage";

const getAllDescendantIds = (rootDirId, allDirs) => {
  const descendants = new Set();
  const stack = [rootDirId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    descendants.add(currentId);

    const children = allDirs.filter((d) => d.parentDir === currentId);
    for (const child of children) {
      stack.push(child.id);
    }
  }
  return descendants;
};

export const search = async (req, res) => {
  try {
    const { q, parentId } = req.query;
    if (!q) return res.status(400).send("Search query required");

    const query = q.toLowerCase();

    // Ensure users have loaded data (though imports should handle it)
    if (!req.user || !req.user.id) {
      return res.status(401).send("Unauthorized");
    }

    let validParentIds = null;
    if (parentId && parentId !== "null" && parentId !== "undefined") {
      const allDirs = await directoriesCollection.find().toArray();
      validParentIds = getAllDescendantIds(parentId, allDirs);
    }

    // Filter DirectoryDB
    const matchingDirs = await directoriesCollection
      .find({
        userId: req.user.id,
        name: { $regex: query, $options: "i" },
      })
      .toArray();

    const finalMatchingDirsRaw = validParentIds
      ? matchingDirs.filter((d) => validParentIds.has(d.id))
      : matchingDirs;

    const finalMatchingDirs = await Promise.all(
      finalMatchingDirsRaw.map(async (dir) => {
        const fileCount = await filesCollection.countDocuments({
          parentDir: dir.id,
        });
        const dirCount = await directoriesCollection.countDocuments({
          parentDir: dir.id,
        });
        return { ...dir, itemCount: fileCount + dirCount };
      }),
    );

    // Filter FilesDB
    const matchingFiles = await filesCollection
      .find({
        userId: req.user.id,
        name: { $regex: query, $options: "i" },
      })
      .toArray();

    const finalMatchingFiles = validParentIds
      ? matchingFiles.filter((f) => validParentIds.has(f.parentDir))
      : matchingFiles;

    // Structure result similar to directory content response
    return res.status(200).json({
      name: "Search Results",
      directories: finalMatchingDirs,
      files: finalMatchingFiles,
      parentDir: null, // No parent for flat search results
    });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const getThumbnail = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await filesCollection.findOne({ id: fileId });

    if (!file) return res.status(404).send("File not found");
    if (file.userId !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    const thumbnailPath = path.resolve(`./storage/thumbnails/${fileId}.jpg`);

    // Check if thumbnail exists
    try {
      await stat(thumbnailPath);
      res.sendFile(thumbnailPath);
    } catch {
      res.status(404).send("Thumbnail not available");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const getFileById = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { action } = req.query;
    const file = await filesCollection.findOne({ id: fileId });

    // Check if file exists first
    if (!file) return res.status(404).send("File not found");

    if (file.userId !== req.user.id) {
      return res.status(403).send("You are not authorized to access this file");
    }

    const filePath = path.join(BASE, `${fileId}${file.extension}`);

    // If action is NOT download, just send the file simple way (fixes Open File)
    if (action !== "download") {
      const textExtensions = [
        ".txt",
        ".md",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".json",
        ".css",
        ".html",
        ".xml",
        ".yml",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".h",
        ".sql",
        ".sh",
        ".bat",
        ".log",
        ".env",
        ".gitignore",
      ];
      if (
        file.extension &&
        textExtensions.includes(file.extension.toLowerCase())
      ) {
        res.setHeader("Content-Type", "text/plain");
      }
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
};

export const uploadFile = async (req, res) => {
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

    writeStream.on("error", async (err) => {
      console.error("Write stream error:", err);

      try {
        // Delete the physical file that was being uploaded
        await unlink(filePath).catch(() => {});

        // Delete the thumbnail if it exists
        const thumbnailPath = `./storage/thumbnails/${id}.jpg`;
        await unlink(thumbnailPath).catch(() => {});

        // Remove the file entry from the database
        await filesCollection.deleteOne({ id });
      } catch (cleanupErr) {
        console.error("Error during cleanup:", cleanupErr);
      }

      if (!res.headersSent) {
        return res.status(500).send("Error writing file");
      }
    });

    writeStream.on("finish", async () => {
      const exists = await filesCollection.findOne({ id });

      const stats = await stat(filePath);
      const fileSize = stats.size;
      let hasThumbnail = false;

      // Generate thumbnail if image or video
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".tiff",
      ];
      const videoExtensions = [".mp4", ".webm", ".mkv", ".avi", ".mov"];

      try {
        const thumbnailPath = `./storage/thumbnails/${id}.jpg`;
        const fileExt = ext.toLowerCase();

        if (imageExtensions.includes(fileExt)) {
          await sharp(filePath)
            .resize(128, 128, { fit: "cover" }) // Resize to 128x128 as requested
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          hasThumbnail = true;
        } else if (videoExtensions.includes(fileExt)) {
          await new Promise((resolve, reject) => {
            ffmpeg(filePath)
              .on("end", () => {
                hasThumbnail = true;
                resolve();
              })
              .on("error", (err) => {
                console.error("Failed to generate video thumbnail", err);
                resolve(); // resolve anyway to continue file upload
              })
              .screenshots({
                timestamps: ["1"], // capture at 1 second
                filename: `${id}.jpg`,
                folder: "./storage/thumbnails",
                size: "128x128",
              });
          });
        }
      } catch (err) {
        console.error("Failed to generate thumbnail", err);
      }

      if (!exists) {
        await filesCollection.insertOne({
          id,
          extension: ext,
          type: "file",
          userId: req.cookies.userId,
          size: fileSize,
          name: fileName,
          parentDir: parentDirId,
          hasThumbnail,
        });
      }

      if (!res.writableEnded) return res.status(201).send("File uploaded");
    });

    req.pipe(writeStream);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const renameFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await filesCollection.findOne({ id: fileId });

    if (!file) {
      return res.status(404).send("File not found");
    }
    if (file.userId !== req.user.id) {
      return res.status(403).send("You are not authorized to rename this file");
    }
    const { newFileName } = req.body;
    await filesCollection.updateOne(
      { id: fileId },
      { $set: { name: newFileName } },
    );
    return res.status(200).send("File renamed successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileData = await filesCollection.findOne({ id: fileId });

    if (!fileData) {
      return res.status(404).send("File not found");
    }
    if (fileData.userId !== req.user.id) {
      return res.status(403).send("You are not authorized to delete this file");
    }

    const deletedFile = await filesCollection.findOne({ id: fileId });
    if (deletedFile) {
      await filesCollection.deleteOne({ id: fileId });
      await trashCollection.insertOne(deletedFile);
    }

    return res.status(200).send("File deleted successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
};
