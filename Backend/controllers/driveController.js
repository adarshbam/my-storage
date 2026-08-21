import * as driveService from '../services/drive.service.js';
import User from '../models/userModel.js';
import { invalidateUserSessions } from '../databases/redis.js';

const handleDriveError = async (error, req, res, fallbackMessage) => {
  if (res.headersSent) return;

  const errMsg = error?.message || "";
  const errData = error?.response?.data;
  const isInvalidGrant =
    errMsg.includes("invalid_grant") ||
    errData?.error === "invalid_grant" ||
    (typeof errData?.error_description === "string" && errData.error_description.toLowerCase().includes("invalid_grant")) ||
    errMsg.includes("No refresh token") ||
    errMsg.includes("invalid_request");

  if (isInvalidGrant) {
    const userId = req.user?.id;
    if (userId) {
      try {
        await User.updateOne(
          { _id: userId },
          {
            $set: { "integrations.googleDrive.connected": false },
            $unset: { "integrations.googleDrive.refreshToken": "" },
          }
        );
        await invalidateUserSessions(userId);
      } catch (dbErr) {
        console.error("Failed to reset drive session on invalid_grant:", dbErr);
      }
    }
    return res.status(401).json({
      error: "Google Drive session expired or was revoked. Please reconnect your Google Drive account.",
      code: "DRIVE_AUTH_EXPIRED",
    });
  }

  return res.status(error.statusCode || 500).json({
    error: error.message || fallbackMessage,
  });
};

export const connectGoogleDrive = async (req, res, next) => {
  try {
    const result = await driveService.connectGoogleDriveLogic({
      code: req.body.code,
      userId: req.user.id,
      rootDirId: req.user.rootDirId.toString(),
      req,
      res,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("[Connect Google Drive Error]:", error?.response?.data || error?.message);
    const msg =
      error?.response?.data?.error_description ||
      error?.message ||
      "Failed to connect Google Drive";
    return res.status(error.statusCode || 400).json({ error: msg });
  }
};

export const disconnectGoogleDrive = async (req, res, next) => {
  try {
    const result = await driveService.disconnectGoogleDriveLogic({
      userId: req.user.id,
      rootDirId: req.user.rootDirId,
      req,
      res,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to disconnect Google Drive");
  }
};

export const listDriveFiles = async (req, res, next) => {
  try {
    const result = await driveService.listDriveFilesLogic({ req });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to fetch Drive files");
  }
};

export const listDriveFolder = async (req, res, next) => {
  try {
    const result = await driveService.listDriveFolderLogic({
      folderId: req.params.folderId,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to fetch folder contents");
  }
};

export const getFileFromDrive = async (req, res, next) => {
  try {
    await driveService.getFileFromDriveLogic({
      fileId: req.params.fileId,
      action: req.query.action,
      req,
      res,
    });
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to fetch file");
  }
};

export const createDriveFolder = async (req, res, next) => {
  try {
    const result = await driveService.createDriveFolderLogic({
      parentFolderId: req.params.parentFolderId,
      name: req.body.name,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to create folder");
  }
};

export const uploadFileToDrive = async (req, res, next) => {
  try {
    const result = await driveService.uploadFileToDriveLogic({
      parentFolderId: req.params.parentFolderId,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to upload to Google Drive");
  }
};

export const deleteFromDrive = async (req, res, next) => {
  try {
    const result = await driveService.deleteFromDriveLogic({
      fileId: req.params.fileId,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to delete from Drive");
  }
};

export const downloadDriveFolder = async (req, res, next) => {
  try {
    await driveService.downloadDriveFolderLogic({
      folderId: req.params.folderId,
      req,
      res,
    });
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to download folder");
  }
};

export const searchDriveFiles = async (req, res, next) => {
  try {
    const result = await driveService.searchDriveFilesLogic({
      query: req.query.q,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Drive search failed");
  }
};

export const updateDriveItem = async (req, res, next) => {
  try {
    const result = await driveService.updateDriveItemLogic({
      fileId: req.params.fileId,
      data: req.body,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to update item on Drive");
  }
};

export const moveDriveItems = async (req, res, next) => {
  try {
    const result = await driveService.moveDriveItemsLogic({
      items: req.body.items,
      targetId: req.body.targetId,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to move items on Drive");
  }
};

export const transferToVault = async (req, res, next) => {
  try {
    const result = await driveService.transferToVaultLogic({
      items: req.body.items,
      targetFolderId: req.body.targetFolderId,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to transfer to vault");
  }
};

export const transferFromVault = async (req, res, next) => {
  try {
    const result = await driveService.transferFromVaultLogic({
      items: req.body.items,
      targetFolderId: req.body.targetDriveFolderId || req.body.targetFolderId || "root",
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleDriveError(error, req, res, "Failed to transfer from vault");
  }
};
