import express from "express";
import cookieParser from "cookie-parser";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import trashRouter from "./routes/trashRoutes.js";
import userRouter from "./routes/userRoutes.js";
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

      "http://192.168.31.10:5173",
      "http://[2409:40e3:176:1a68:eb0f:b7fd:bb7a:937e]:5173",
    ],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use("/directory", checkAuth, directoryRouter);
app.use("/file", checkAuth, fileRouter);
app.use("/trash", checkAuth, trashRouter);
app.use("/user", userRouter);

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

httpsServer.listen(4000, () => {
  console.log(`HTTPS Server running on port 4000`);
});
