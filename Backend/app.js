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

// const UPLOAD_DIR = "./storage";
// const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// function cleanOldFiles() {
//   fs.readdir(UPLOAD_DIR, (err, files) => {
//     if (err) return console.error(err);

//     files.forEach((file) => {
//       const filePath = path.join(UPLOAD_DIR, file);

//       fs.stat(filePath, (err, stats) => {
//         if (err) return console.error(err);

//         const now = Date.now();
//         const fileAge = now - stats.mtimeMs;

//         if (fileAge > THIRTY_DAYS) {
//           fs.unlink(filePath, (err) => {
//             if (err) {
//               console.error("Delete failed:", file);
//             } else {
//               console.log("Deleted:", file);
//             }
//           });
//         }
//       });
//     });
//   });
// }

// cleanOldFiles();

// setInterval(cleanOldFiles, 24 * 60 * 60 * 1000);

httpsServer.listen(4000, () => {
  console.log(`HTTPS Server running on port 4000`);
});
