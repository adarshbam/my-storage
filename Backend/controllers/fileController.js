import * as fileService from '../services/file.service.js';
import { updateParentDirectorySize as updateSize, getDirectoryPath as getPath } from '../services/directory.service.js';
import { logLegacyEndpointUsage } from '../utils/legacyObservability.js';

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
  const startTime = Date.now();
  let bytesStreamed = false;

  const originalWrite = res.write;
  res.write = function (...args) {
    if (args[0] && (Buffer.isBuffer(args[0]) || typeof args[0] === 'string')) {
      bytesStreamed = true;
    }
    return originalWrite.apply(this, args);
  };

  res.on('finish', () => {
    logLegacyEndpointUsage({
      endpoint: 'GET /file/:fileId/thumbnail',
      fileId: req.params.fileId,
      userId: req.user?.id,
      action: 'thumbnail',
      range: Boolean(req.headers.range),
      statusCode: res.statusCode,
      streamedBytes: bytesStreamed || (res.statusCode >= 200 && res.statusCode < 300 && res.statusCode !== 204),
      durationMs: Date.now() - startTime,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    });
  });

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

export const getThumbnailCdnUrl = async (req, res, next) => {
  try {
    const data = await fileService.createThumbnailCdnUrlLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const getCdnUrl = async (req, res, next) => {
  try {
    const data = await fileService.createFileCdnUrlLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      userRole: req.user.role,
      action: req.query.action,
      ownerId: req.query.ownerId,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const markFileOpened = async (req, res, next) => {
  try {
    const data = await fileService.markFileOpenedLogic({
      fileId: req.params.fileId,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status && !res.headersSent) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const getFileById = async (req, res, next) => {
  const startTime = Date.now();
  let bytesStreamed = false;

  const originalWrite = res.write;
  res.write = function (...args) {
    if (args[0] && (Buffer.isBuffer(args[0]) || typeof args[0] === 'string')) {
      bytesStreamed = true;
    }
    return originalWrite.apply(this, args);
  };

  res.on('finish', () => {
    logLegacyEndpointUsage({
      endpoint: 'GET /file/:fileId',
      fileId: req.params.fileId,
      userId: req.user?.id,
      action: req.query.action || 'inline',
      range: Boolean(req.headers.range),
      statusCode: res.statusCode,
      streamedBytes: bytesStreamed || (res.statusCode >= 200 && res.statusCode < 300 && res.statusCode !== 204 && res.statusCode !== 304),
      durationMs: Date.now() - startTime,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    });
  });

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

export const uploadVaultComplete = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultCompleteLogic({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: req.body.fileId,
      key: req.body.key,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const uploadVaultAbort = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultAbortLogic({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: req.body.fileId,
      uploadId: req.body.uploadId,
      key: req.body.key,
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

export const uploadVaultMultipartInitiate = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultMultipartInitiateLogic({
      userId: req.user.id,
      parentDirId: req.body.parentDirId,
      rootDirId: req.user.rootDirId,
      name: req.body.name,
      size: req.body.size,
      contentType: req.body.contentType,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const uploadVaultMultipartPartUrl = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultMultipartPartUrlLogic({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: req.body.fileId,
      uploadId: req.body.uploadId,
      partNumber: req.body.partNumber,
      key: req.body.key,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const uploadVaultMultipartComplete = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultMultipartCompleteLogic({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: req.body.fileId,
      uploadId: req.body.uploadId,
      key: req.body.key,
      parts: req.body.parts,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const uploadVaultMultipartAbort = async (req, res, next) => {
  try {
    const data = await fileService.uploadVaultMultipartAbortLogic({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: req.body.fileId,
      uploadId: req.body.uploadId,
      key: req.body.key,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};
