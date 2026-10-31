import * as directoryService from '../services/directory.service.js';

export const getDirectoryById = async (req, res, next) => {
  try {
    let dirId = req.params.dirId;
    if (!dirId || dirId === "undefined") {
      dirId = req.user.rootDirId;
    }

    const data = await directoryService.getDirectoryContents({
      dirId,
      userId: req.user.id,
      userRole: req.user.role,
      action: req.query.action,
      res
    });

    if (data) {
      return res.status(200).json(data);
    }
  } catch (error) {
    if (error.status && !res.headersSent) {
      return res.status(error.status).json({ error: error.message, message: error.message });
    }
    next(error);
  }
};

export const createDirectory = async (req, res, next) => {
  try {
    let parentDirId = req.params.parentDirId;
    if (!parentDirId || parentDirId === "undefined") {
      parentDirId = req.user.rootDirId.toString();
    }
    const directory = await directoryService.createDirectoryLogic({
      name: req.body.foldername ?? "new-folder",
      parentDirId,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId.toString()
    });
    return res.status(201).json({ success: true, message: "Folder created successfully", directory });
  } catch (error) {
    if (error.code === 11000 || error.code === "EEXIST") {
      return res.status(409).json({ error: "Folder already exists" });
    }
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export const ensureDirectoryTree = async (req, res, next) => {
  try {
    let parentDirId = req.params.parentDirId;
    if (!parentDirId || parentDirId === "undefined") {
      parentDirId = req.user.rootDirId.toString();
    }
    const tree = await directoryService.ensureDirectoryTreeLogic({
      parentDirId,
      paths: req.body.paths || [],
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId.toString(),
    });
    return res.status(200).json({ success: true, tree });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export const renameDirectory = async (req, res, next) => {
  try {
    await directoryService.renameDirectoryLogic({
      dirId: req.params.dirId,
      name: req.body.newDirName,
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.status(200).json({ success: true, message: "Folder renamed successfully" });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export const deleteDirectory = async (req, res, next) => {
  try {
    await directoryService.deleteDirectoryLogic({
      dirId: req.params.dirId,
      userId: req.user.id,
      permanent: req.query.permanent === "true",
      userRole: req.user.role
    });
    return res.status(200).send("Folder deleted successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const moveItems = async (req, res, next) => {
  try {
    let dirId = req.params.dirId;
    if (!dirId || dirId === "undefined" || dirId === "null") {
      dirId = req.user.rootDirId.toString();
    }
    await directoryService.moveItemsLogic({
      targetDirId: dirId,
      items: req.body,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId.toString()
    });
    return res.status(200).json({ message: "Items moved successfully" });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

export const copyItems = async (req, res, next) => {
  try {
    let dirId = req.params.dirId;
    if (!dirId || dirId === "undefined" || dirId === "null") {
      dirId = req.user.rootDirId.toString();
    }
    await directoryService.copyItemsLogic({
      targetDirId: dirId,
      items: req.body,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId.toString()
    });
    return res.status(201).json({ message: "Items copied successfully" });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

export const deleteItemsBatch = async (req, res, next) => {
  try {
    await directoryService.deleteItemsBatchLogic({
      items: req.body,
      userId: req.user.id,
      userRole: req.user.role,
      permanent: req.query.permanent === "true"
    });
    return res.status(200).json({ success: true, message: "Items deleted successfully" });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};


export const updateDirectoryPublicAccess = async (req, res, next) => {
  try {
    const data = await directoryService.updateDirectoryPublicAccessLogic({
      dirId: req.params.dirId,
      userId: req.user.id,
      userRole: req.user.role,
      planContext: req.planContext,
      enabled: req.body.enabled,
      allowedOrigins: req.body.allowedOrigins,
      playerSettings: req.body.playerSettings,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export const getDirectoryPublicAccess = async (req, res, next) => {
  try {
    const data = await directoryService.getDirectoryPublicAccessLogic({
      dirId: req.params.dirId,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export const getPublicFolderManifestByToken = async (req, res, next) => {
  try {
    const data = await directoryService.getPublicFolderManifestByTokenLogic({
      token: req.params.token,
      origin: req.headers.origin,
      referer: req.headers.referer,
      fileId: req.query.fileId,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status && !res.headersSent) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code || "PUBLIC_FOLDER_ERROR",
      });
    }
    next(error);
  }
};
