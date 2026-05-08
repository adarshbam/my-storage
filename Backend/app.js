import express from "express";
import cookieParser from "cookie-parser";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import trashRouter from "./routes/trashRoutes.js";
import userRouter from "./routes/userRoutes.js";
import otpRouter from "./routes/otpRoutes.js";
import driveRouter from "./routes/driveRoutes.js";
import githubRouter from "./routes/githubRoutes.js";
import cors from "cors";
import checkAuth from "./middlewares/authMiddleware.js";
import https from "https";
import { readFileSync } from "fs";
import "./utils/mongoose.js";
import path from "path";
import { rm } from "fs/promises";
import Trash from "./models/trashModel.js";
import File from "./models/fileModel.js";
import Directory from "./models/directoryModel.js";

const app = express();

app.use(
  cors({
    exposedHeaders: ["X-Total-Size", "X-Total-Files"],
    origin: [
      "http://localhost:5173",
      "http://localhost:5173",
      "http://192.168.31.12:5173",
      "http://192.168.31.10:5173",
      "http://[2409:40e3:176:1a68:eb0f:b7fd:bb7a:937e]:5173",
    ],
    credentials: true,
  }),
);
app.use(cookieParser("my-storage-secret-key"));
app.use(express.json());

app.use("/directory", checkAuth, directoryRouter);
app.use("/file", checkAuth, fileRouter);
app.use("/trash", checkAuth, trashRouter);
app.use("/user", userRouter);
app.use("/otp", otpRouter);
app.use("/drive", driveRouter);
app.use("/github", githubRouter);

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

async function cleanOldFiles() {
  try {
    const expiryDate = new Date(Date.now() - THIRTY_DAYS);
    const itemsToDelete = await Trash.find({ deleted_at: { $lt: expiryDate } });

    if (itemsToDelete.length > 0) {
      console.log(
        `Found ${itemsToDelete.length} expired trash items. Cleaning up...`,
      );
    }

    for (const item of itemsToDelete) {
      if (item.type === "directory") {
        // Recursive delete logic for local directory structure
        const recursiveDelete = async (dirId) => {
          const files = await File.find({ parentDir: dirId });
          for (const f of files) {
            const fPath = path.join(UPLOAD_DIR, `${f._id}${f.extension}`);
            const tPath = path.join(UPLOAD_DIR, "thumbnails", `${f._id}.jpg`);
            await rm(fPath, { force: true }).catch(() => {});
            await rm(tPath, { force: true }).catch(() => {});
          }
          await File.deleteMany({ parentDir: dirId });

          const dirs = await Directory.find({ parentDir: dirId });
          for (const d of dirs) {
            await recursiveDelete(d._id.toString());
          }
          await Directory.deleteMany({ parentDir: dirId });
        };

        await recursiveDelete(item._id.toString());
      } else {
        // Single file deletion
        const filePath = path.join(UPLOAD_DIR, `${item._id}${item.extension}`);
        const thumbPath = path.join(
          UPLOAD_DIR,
          "thumbnails",
          `${item._id}.jpg`,
        );
        await rm(filePath, { force: true }).catch(() => {});
        await rm(thumbPath, { force: true }).catch(() => {});
      }

      await Trash.deleteOne({ _id: item._id });
      console.log(
        `Permanently deleted expired trash item: ${item.name} (${item._id})`,
      );
    }
  } catch (err) {
    console.error("Error during trash cleanup:", err);
  }
}

cleanOldFiles();

setInterval(cleanOldFiles, 24 * 60 * 60 * 1000); // Check every minute

httpsServer.listen(4000, () => {
  console.log(`HTTPS Server running on port 4000`);
});
