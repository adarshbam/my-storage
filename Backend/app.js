import express from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import directoryRouter from "./routes/directoryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import trashRouter from "./routes/trashRoutes.js";
import userRouter from "./routes/userRoutes.js";
import twoFactorRouter from "./routes/twoFactorRoutes.js";
import phoneVerificationRouter from "./routes/phoneVerificationRoutes.js";
import secondaryRecoveryEmailRouter from "./routes/secondaryRecoveryEmailRoutes.js";
import otpRouter from "./routes/otpRoutes.js";
import planRouter from "./routes/planRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import driveRouter from "./routes/driveRoutes.js";
import githubRouter from "./routes/githubRoutes.js";
import systemUsersRouter from "./routes/systemUsersRoutes.js";
import shareRouter from "./routes/shareRoutes.js";
import systemConfigRouter from "./routes/systemConfigRoutes.js";
import ownerSettingsRouter from "./routes/ownerSettingsRoutes.js";
import webhookRouter from "./routes/webhookRoutes.js";
import billingRouter from "./routes/billingRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import cors from "cors";
import checkAuth from "./middlewares/authMiddleware.js";
import https from "https";
import { readFileSync } from "fs";
import "./databases/mongoose.js";
import { reconcileDirectoryPathsAndSizes } from "./utils/reconcile.js";
import helmet from "helmet";
import { startScheduledJobs } from "./jobs/scheduler.js";
import { AppError } from "./errors/AppError.js";

import { PORT, CLIENT_URL, SESSION_SECRET } from "./config/config.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(
  helmet({
    // 1. Content Security Policy (CSP) - Extremely strict whitelist
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: [
          "'self'",
          "https://accounts.google.com/gsi/client",
          "https://apis.google.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com/gsi/style",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://lh3.googleusercontent.com",
          "https://*.googleusercontent.com",
          "https://avatars.githubusercontent.com",
          "https://*.githubusercontent.com",
        ],
        connectSrc: [
          "'self'",
          CLIENT_URL,
          "https://accounts.google.com",
          "https://oauth2.googleapis.com",
          "https://api.github.com",
          "https://github.com",
          "https://*.googleapis.com",
        ],
        frameSrc: ["'self'", "https://accounts.google.com/"],
        formAction: [
          "'self'",
          CLIENT_URL,
          "https://accounts.google.com/",
          "https://github.com/login/oauth/authorize",
        ],
        frameAncestors: ["'none'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // 2. Strict Transport Security (HSTS) - Enforce HTTPS for 1 year in production only
    strictTransportSecurity: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    // 3. X-Frame-Options - Complete Clickjacking protection
    frameguard: {
      action: "deny",
    },
    // 4. X-Content-Type-Options - Prevent MIME-type sniffing
    noSniff: true,
    // 5. Referrer-Policy - Leak-free referrer controls
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    // 6. X-XSS-Protection - Enable legacy browser security
    xssFilter: true,
    // 7. Cross-Origin Opener Policy (COOP) - Crucial for popup OAuth flows
    crossOriginOpenerPolicy: {
      policy: "unsafe-none",
    },
    // 8. Cross-Origin Resource Policy (CORP) - Allow client app to read static files
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    // Disable COEP to allow loading external profile pictures without CORP headers
    crossOriginEmbedderPolicy: false,
  }),
);

// 9. Extra Professional Header: Permissions-Policy - Disable all unused hardware features
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );
  next();
});

app.use(
  cors({
    exposedHeaders: ["X-Total-Size", "X-Total-Files"],
    origin: [CLIENT_URL],
    credentials: true,
  }),
);
app.use(compression());
app.use(cookieParser(SESSION_SECRET));
app.use(express.json());

app.use("/directory", checkAuth, directoryRouter);
app.use("/file", checkAuth, fileRouter);
app.use("/trash", checkAuth, trashRouter);
app.use("/user", userRouter);
app.use("/user/2fa", twoFactorRouter);
app.use("/user/phone", phoneVerificationRouter);
app.use("/user/secondary-recovery-email", secondaryRecoveryEmailRouter);
app.use("/otp", otpRouter);
app.use("/plan", planRouter);
app.use("/plans", planRouter);
app.use("/subscriptions", subscriptionRouter);
app.use("/drive", driveRouter);
app.use("/github", githubRouter);
app.use("/users", systemUsersRouter);
app.use("/share", shareRouter);
app.use("/system-config", systemConfigRouter);
app.use("/owner-settings", ownerSettingsRouter);
app.use("/webhooks", webhookRouter);
app.use("/billing", checkAuth, billingRouter);
app.use("/notifications", checkAuth, notificationRouter);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }
  console.error('[Unhandled Error]', err);
  return res.status(500).json({ message: 'Internal Server Error' });
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

startScheduledJobs();

// httpsServer.listen(PORT, () => {
//   console.log(`HTTPS Server running on port ${PORT}`);
// });

reconcileDirectoryPathsAndSizes().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
