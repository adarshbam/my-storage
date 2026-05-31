import express from "express";
import cookieParser from "cookie-parser";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import trashRouter from "./routes/trashRoutes.js";
import userRouter from "./routes/userRoutes.js";
import otpRouter from "./routes/otpRoutes.js";
import driveRouter from "./routes/driveRoutes.js";
import githubRouter from "./routes/githubRoutes.js";
import systemUsersRouter from "./routes/systemUsersRoutes.js";
import shareRouter from "./routes/shareRoutes.js";
import cors from "cors";
import checkAuth from "./middlewares/authMiddleware.js";
import https from "https";
import { readdirSync, readFileSync } from "fs";
import "./utils/mongoose.js";
import path from "path";
import { rm } from "fs/promises";
import Trash from "./models/trashModel.js";
import File from "./models/fileModel.js";
import Directory from "./models/directoryModel.js";
import User from "./models/userModel.js";

import { PORT, REDIS_URL, CLIENT_URL, SESSION_SECRET } from "./config.js";

const app = express();

app.use(
  cors({
    exposedHeaders: ["X-Total-Size", "X-Total-Files"],
    origin: [CLIENT_URL],
    credentials: true,
  }),
);
app.use(cookieParser(SESSION_SECRET));
app.use(express.json());

app.use("/directory", checkAuth, directoryRouter);
app.use("/file", checkAuth, fileRouter);
app.use("/trash", checkAuth, trashRouter);
app.use("/user", userRouter);
app.use("/otp", otpRouter);
app.use("/drive", driveRouter);
app.use("/github", githubRouter);
app.use("/users", systemUsersRouter);
app.use("/share", shareRouter);

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).send("Internal Server Error");
});

/* =======================
   SAFE PATH RESOLVER
   ======================= */

/* =======================
   ROUTES
   ======================= */

app.get("/", (req, res) => {
  return res.send("Server running");
});

const sslOptions = {
  key: readFileSync("server.key"),
  cert: readFileSync("server.cert"),
};

const httpsServer = https.createServer(sslOptions, app);

const UPLOAD_DIR = "./storage";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

async function cleanFiles() {
  try {
    const expiryDate = new Date(Date.now() - THIRTY_DAYS);

    // -------------------------
    // Trash cleanup
    // -------------------------
    const trashItems = await Trash.find({
      deleted_at: { $lt: expiryDate },
    });

    // -------------------------
    // Ghost DB records
    // -------------------------

    const userIds = await User.distinct("_id");

    const ghostFiles = await File.find({
      userId: { $nin: userIds },
    });

    const ghostDirectories = await Directory.find({
      userId: { $nin: userIds },
    });

    // -------------------------
    // Ghost storage files
    // -------------------------
    const storageItems = readdirSync(UPLOAD_DIR);

    const storedFileIds = storageItems
      .filter((name) => name.includes("."))
      .map((name) => name.split(".")[0]);

    const existingFiles = await File.find(
      { _id: { $in: storedFileIds } },
      { _id: 1, extension: 1 },
    );

    const existingIds = new Set(existingFiles.map((f) => f._id.toString()));

    const missingStorageFiles = storageItems.filter((fileName) => {
      const id = fileName.split(".")[0];
      return !existingIds.has(id);
    });

    // -------------------------
    // Delete orphan storage files
    // -------------------------
    for (const fileName of missingStorageFiles) {
      const filePath = path.join(UPLOAD_DIR, fileName);
      await rm(filePath, { force: true }).catch(() => {});
      console.log(`Deleted ghost storage file: ${fileName}`);
    }

    // Delete ghost directories
    await Directory.deleteMany({
      _id: {
        $in: ghostDirectories.map((dir) => dir._id),
      },
    });

    // -------------------------
    // Combine DB items
    // -------------------------
    const itemsToDelete = [...trashItems, ...ghostFiles];

    console.log(`Found ${itemsToDelete.length} DB items to cleanup`);

    for (const item of itemsToDelete) {
      // -------------------------
      // Directory cleanup
      // -------------------------
      if (item.type === "directory") {
        const recursiveDelete = async (dirId) => {
          const files = await File.find({ parentDir: dirId });
          for (const f of files) {
            const fPath = path.join(UPLOAD_DIR, `${f._id}${f.extension}`);
            const tPath = path.join(UPLOAD_DIR, "thumbnails", `${f._id}.jpg`);

            await rm(fPath, { force: true }).catch(() => {});
            await rm(tPath, { force: true }).catch(() => {});
          }

          await File.deleteMany({ parentDir: dirId });

          const dirs = await Directory.find({
            parentDir: dirId,
          });

          for (const d of dirs) {
            await recursiveDelete(d._id.toString());
          }

          await Directory.deleteMany({
            parentDir: dirId,
          });
        };

        await recursiveDelete(item._id.toString());

        await Directory.deleteOne({
          _id: item._id,
        });
      } else {
        // -------------------------
        // File cleanup
        // -------------------------
        const filePath = path.join(UPLOAD_DIR, `${item._id}${item.extension}`);

        const thumbPath = path.join(
          UPLOAD_DIR,
          "thumbnails",
          `${item._id}.jpg`,
        );

        await rm(filePath, { force: true }).catch(() => {});
        await rm(thumbPath, { force: true }).catch(() => {});

        await File.deleteOne({
          _id: item._id,
        });
      }

      // remove from trash if exists
      await Trash.deleteOne({
        _id: item._id,
      }).catch(() => {});

      console.log(`Deleted: ${item.name || item._id}`);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

cleanFiles();

setInterval(cleanFiles, 24 * 60 * 60 * 1000); // Check every minute

console.log();

// httpsServer.listen(PORT, () => {
//   console.log(`HTTPS Server running on port ${PORT}`);
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
