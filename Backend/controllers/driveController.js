// ============================================================
// Google Drive Integration — driveController.js
// ============================================================
// This controller handles exchanging the authorization code
// received from the frontend for Google Drive tokens.
//
// PREREQUISITES:
// 1. You must run `npm install googleapis` in your Backend directory
// 2. Add `export const GOOGLE_CLIENT_SECRET = "your_secret";` to config.js
// 3. Add `googleDriveTokens: { type: Object, default: null }` to your User model
// ============================================================

import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../config.js";
import { OAuth2Client } from "google-auth-library";

// TODO: Uncomment the googleapis import after installing
import { google } from "googleapis";

export const connectGoogleDrive = async (req, res) => {
  const { code } = req.body;
  const rootDirId = req.user.rootDirId.toString();

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    // ─── Step 1: Exchange code for tokens ──────────────────────────────────────────
    //
    // TODO: Uncomment everything inside this try block once setup is complete
    //
    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "postmessage", // ← CRITICAL: must match frontend popup flow
    );
    //
    const { tokens } = await oauth2Client.getToken(code);
    console.log(tokens);
    //
    // ─── Step 2: Save tokens to the database ───────────────────────────────────────

    console.log(req.user.id);
    //
    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          "integrations.googleDrive": {
            connected: true,
            refreshToken: tokens.refresh_token,
            scope: tokens.scope,
            connectedAt: new Date(),
          },
        },
      },
    );

    // Create a Special Directory to act as the Google Drive mount point
    // Using provider: "google_drive" will teach the frontend to intercept it

    // Check if the directory already exists so we don't duplicate it
    const existingDir = await Directory.findOne({
      userId: req.user.id,
      provider: "google_drive",
    });
    if (!existingDir) {
      await Directory.create({
        name: "Google Drive",
        userId: req.user.id,
        type: "directory",
        parentDir: rootDirId,
        provider: "google_drive", // This links it to the frontend specialView
      });
    }

    const user = await User.findOne({ _id: req.user.id });
    user.save();

    console.log(user);
    //
    return res.status(200).json({ success: true, message: "Drive connected" });
  } catch (error) {
    console.error("Drive connection error:", error);
    return res.status(500).json({ error: "Failed to connect Google Drive" });
  }
};

// ─── Step 3: Implement file listing ─────────────────────────────────────────────
// Route: GET /drive/files
//
// TODO: Implement after the connect flow works
//
export const listDriveFiles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("integrations").lean();

    if (!user?.integrations?.googleDrive?.refreshToken) {
      return res.status(403).json({ error: "Google Drive not connected" });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "postmessage",
    );
    oauth2Client.setCredentials({
      refresh_token: user.integrations.googleDrive.refreshToken,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const response = await drive.files.list({
      pageSize: 50,
      fields: "files(id, name, mimeType, size, modifiedTime, thumbnailLink)",
    });

    const gFiles = response.data.files || [];

    const mappedItems = gFiles.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: parseInt(file.size) || 0,
      extension:
        file.mimeType === "application/vnd.google-apps.folder"
          ? null
          : `.${file.name.split(".").pop() || "tmp"}`,
      type:
        file.mimeType === "application/vnd.google-apps.folder"
          ? "directory"
          : "file",
      hasThumbnail: !!file.thumbnailLink,
      thumbnailLink: file.thumbnailLink,
      provider: "google_drive",
    }));

    return res.status(200).json({
      directories: mappedItems.filter((item) => item.type === "directory"),
      files: mappedItems.filter((item) => item.type === "file"),
      name: "Google Drive",
    });
  } catch (err) {
    console.error("List files error:", err);
    return res.status(500).json({ error: "Failed to fetch Drive files" });
  }
};
