import * as fileService from '../services/file.service.js';
import { updateParentDirectorySize as updateSize, getDirectoryPath as getPath } from '../services/directory.service.js';

export const updateParentDirectorySize = updateSize;
export const getDirectoryPath = getPath;

export const search = async (req, res, next) => {
  try {
    const results = await fileService.searchFiles({
      query: req.query.q,
      ext: req.query.ext,
      maxSize: req.query.size,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId,
      parentId: req.query.parentId
    });
    return res.status(200).json(results);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const getThumbnail = async (req, res, next) => {
  try {
    await fileService.getThumbnailLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      userRole: req.user.role,
      res
    });
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const getFileById = async (req, res, next) => {
  try {
    await fileService.getFileLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      userRole: req.user.role,
      range: req.headers.range,
      action: req.query.action,
      ifNoneMatch: req.headers["if-none-match"],
      res
    });
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const getAllStarredItems = async (req, res, next) => {
  try {
    const items = await fileService.getStarredItems(req.user.id, req.user.rootDirId);
    return res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

export const setStarredItem = async (req, res, next) => {
  try {
    const item = await fileService.setStarredItem({
      itemId: req.query.fildId, // Notice original typo
      type: req.body.type
    });
    return res.status(200).json(item);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export const getAllRecentItems = async (req, res, next) => {
  try {
    const items = await fileService.getRecentItems(req.user.id, req.user.rootDirId);
    return res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (req, res, next) => {
  try {
    await fileService.uploadFileLogic({
      userId: req.user.id,
      userRole: req.user.role,
      parentDirId: req.params.parentDirId,
      rootDirId: req.user.rootDirId.toString(),
      fileBuffer: req.fileBuffer,
      actualFileSize: req.actualFileSize,
      headers: req.headers,
      fileId: req.headers["x-file-id"]
    });
    if (!res.writableEnded) return res.status(201).send("File uploaded");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const uploadVaultInitate = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultInitiateLogic({
      userId: req.user.id,
      parentDirId: req.body.parentDirId,
      rootDirId: req.user.rootDirId.toString(),
      name: req.body.name,
      size: req.body.size,
      contentType: req.body.contentType
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const renameFile = async (req, res, next) => {
  try {
    await fileService.renameFileLogic({
      fileId: req.params.fileId,
      name: req.body.newFileName,
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.status(200).send("File renamed successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    await fileService.deleteFileLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      permanent: req.query.permanent === "true",
      userRole: req.user.role
    });
    return res.status(200).send("File deleted successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const saveFile = async (req, res, next) => {
  try {
    await fileService.saveFileLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      userRole: req.user.role,
      content: req.body.content
    });
    return res.status(200).send("File saved");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};
