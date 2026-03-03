import express from "express";
import { rm } from "fs/promises";
import { connectToDB } from "../utils/db.js";

const db = await connectToDB();
const filesCollection = db.collection("files");
const directoriesCollection = db.collection("directories");
const trashCollection = db.collection("trash");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const trashItems = await trashCollection.find().toArray();
    return res.send(trashItems);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

router.delete("/", async (req, res) => {
  try {
    const trashItems = await trashCollection.find().toArray();
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

    await trashCollection.deleteMany({});
    return res.status(200).send("Trash emptied successfully");
  } catch (err) {
    console.error("Empty trash error:", err);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/:id/restore", async (req, res, next) => {
  try {
    const { id } = req.params;
    const trashfile = await trashCollection.findOne({ id });
    if (!trashfile) {
      return res.status(404).send("File not found in trash");
    }

    let parentDirData = await directoriesCollection.findOne({
      id: trashfile.parentDir,
    });

    if (!parentDirData) {
      trashfile.parentDir = null;
    }

    await filesCollection.insertOne(trashfile);
    await trashCollection.deleteOne({ id });

    return res.status(201).send("File restored successfully");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

router.delete("/:fileid", async (req, res) => {
  try {
    const { fileid } = req.params;
    const trashFile = await trashCollection.findOne({ id: fileid });
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

    await trashCollection.deleteOne({ id: fileid });
    return res.status(200).send("File deleted forever");
  } catch (err) {
    console.error("Delete forever API error:", err);
    return res.status(500).send("Internal Server Error");
  }
});

async function deleteByParentChain(parentId) {
  const filesToDelete = await filesCollection
    .find({ parentDir: parentId })
    .toArray();

  for (const file of filesToDelete) {
    await rm(`./storage/${file.id}${file.extension}`, { force: true }).catch(
      () => {},
    );
    // Delete thumbnail
    await rm(`./storage/thumbnails/${file.id}.jpg`, { force: true }).catch(
      () => {},
    );
    await filesCollection.deleteOne({ id: file.id });
  }

  const childDirs = await directoriesCollection
    .find({ parentDir: parentId })
    .toArray();

  for (const dir of childDirs) {
    await deleteByParentChain(dir.id);
    await directoriesCollection.deleteOne({ id: dir.id });
  }
}

async function removeFromTrash(dirId) {
  await trashCollection.deleteOne({ id: dirId });
}

router.post("/directory/:dirId/restore", async (req, res, next) => {
  try {
    const { dirId } = req.params;
    const trashDir = await trashCollection.findOne({ id: dirId });
    if (!trashDir) {
      return res.status(404).send("Directory not found in trash");
    }
    const parentDirData = await directoriesCollection.findOne({
      id: trashDir.parentDir,
    });

    if (!parentDirData) {
      trashDir.parentDir = null; // optional logic
    }

    await directoriesCollection.insertOne(trashDir);
    await trashCollection.deleteOne({ id: dirId });

    return res.status(201).send("Directory restored successfully");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

router.delete("/directory/:dirId", async (req, res) => {
  try {
    const { dirId } = req.params;

    await deleteByParentChain(dirId);
    await removeFromTrash(dirId);

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

router.post("/delete-batch", async (req, res) => {
  try {
    const { items } = req.body; // Expects { items: [{ id, type }] }
    if (!items || !Array.isArray(items)) {
      return res.status(400).send("Invalid items array");
    }

    console.log(`Processing batch delete for ${items.length} items`);

    for (const item of items) {
      if (item.type === "directory") {
        await deleteByParentChain(item.id);
        await removeFromTrash(item.id);
      } else {
        const trashFile = await trashCollection.findOne({ id: item.id });
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
          await trashCollection.deleteOne({ id: item.id });
        }
      }
    }

    return res.status(200).send("Batch delete completed successfully");
  } catch (err) {
    console.error("Batch delete error:", err);
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
