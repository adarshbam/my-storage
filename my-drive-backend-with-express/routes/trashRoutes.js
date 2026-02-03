import express from "express";
import { rm, writeFile } from "fs/promises";
import filesData from "../filesDB.json" with { type: "json" };
import directoriesData from "../directoryDB.json" with { type: "json" };
import trashDB from "../trashDB.json" with { type: "json" };

const router = express.Router();

router.get("/", (req, res, next) => {
  return res.send(trashDB);
});

router.post("/:id/restore", async (req, res, next) => {
  try {
    const { id } = req.params;
    const tranhFileIndex = trashDB.findIndex((file) => file.id === id);
    const trashfile = trashDB[tranhFileIndex];
    if (!trashfile) {
      return res.status(404).send("File not found in trash");
    }
    const parentDirData = directoriesData.find(
      (directory) => directory.id === trashfile.parentDir,
    );
    parentDirData.files.push(id);
    filesData.push(trashDB.splice(tranhFileIndex, 1)[0]);

    console.log(filesData, parentDirData);
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    await writeFile("./trashDB.json", JSON.stringify(trashDB));
    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));
    return res.status(201).send("File restored successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

router.delete("/:fileid", async (req, res) => {
  try {
    const { fileid } = req.params;
    const trashFileIndex = trashDB.findIndex((file) => file.id === fileid);
    if (trashFileIndex === -1) {
      return res.status(404).send("File not found in trash");
    }

    const trashFile = trashDB[trashFileIndex];
    console.log(trashFile, trashFileIndex);

    await rm(`./storage/${trashFile.id}${trashFile.extension}`, {
      recursive: true,
    });

    trashDB.splice(trashFileIndex, 1)[0];
    console.log(trashDB);
    await writeFile("./trashDB.json", JSON.stringify(trashDB));
    return res.status(200).send("File fully deleted from trash successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

async function deleteByParentChain(parentId) {
  // 1️⃣ Delete files whose parentDir === parentId
  const filesToDelete = filesData.filter((f) => f.parentDir === parentId);

  for (const file of filesToDelete) {
    await rm(`./storage/${file.id}${file.extension}`);

    const idx = filesData.findIndex((f) => f.id === file.id);
    if (idx !== -1) filesData.splice(idx, 1);
  }

  // 2️⃣ Find child directories by parentDir
  const childDirs = directoriesData.filter((d) => d.parentDir === parentId);

  for (const dir of childDirs) {
    await deleteByParentChain(dir.id);

    const idx = directoriesData.findIndex((d) => d.id === dir.id);
    if (idx !== -1) directoriesData.splice(idx, 1);
  }
}

function removeFromTrash(dirId) {
  const idx = trashDB.findIndex((d) => d.id === dirId);
  if (idx !== -1) trashDB.splice(idx, 1);
}

router.post("/directory/:dirId/restore", async (req, res, next) => {
  try {
    const { dirId } = req.params;
    const tranhDirIndex = trashDB.findIndex((dir) => dir.id === dirId);
    const trashDir = trashDB[tranhDirIndex];
    if (!trashDir) {
      return res.status(404).send("Directory not found in trash");
    }
    const parentDirData = directoriesData.find(
      (directory) => directory.id === trashDir.parentDir,
    );
    parentDirData.directories.push(dirId);

    directoriesData.push(trashDB.splice(tranhDirIndex, 1)[0]);

    console.log(directoriesData, parentDirData);
    await writeFile("./trashDB.json", JSON.stringify(trashDB));
    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));
    return res.status(201).send("Directory restored successfully");
  } catch {
    return res.status(500).send("Internal Server Error");
  }
});

router.delete("/directory/:dirId", async (req, res) => {
  try {
    const { dirId } = req.params;

    await deleteByParentChain(dirId);
    removeFromTrash(dirId);

    await writeFile("./trashDB.json", JSON.stringify(trashDB));
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    await writeFile("./directoryDB.json", JSON.stringify(directoriesData));

    return res
      .status(200)
      .send("Directory fully deleted from trash successfully");
  } catch (err) {
    if (!res.headersSent) {
      return res.status(404).send(err.message);
    }
    return res.status(403).send("Forbidden");
  }
});

export default router;
