import * as driveService from '../services/drive.service.js';

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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to connect Google Drive" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to disconnect Google Drive" });
    }
  }
};

export const listDriveFiles = async (req, res, next) => {
  try {
    const result = await driveService.listDriveFilesLogic({ req });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch Drive files" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch folder contents" });
    }
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
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch file" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create folder" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to upload to Google Drive" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete from Drive" });
    }
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
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to download folder" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Drive search failed" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to update item on Drive" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to move items on Drive" });
    }
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
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to transfer to vault" });
    }
  }
};

export const transferFromVault = async (req, res, next) => {
  try {
    const result = await driveService.transferFromVaultLogic({
      items: req.body.items,
      targetFolderId: req.body.targetFolderId,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to transfer from vault" });
    }
  }
};
