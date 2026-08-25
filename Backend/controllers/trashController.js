import * as trashService from '../services/trash.service.js';

export const getTrashItems = async (req, res, next) => {
  try {
    const items = await trashService.getTrashItemsLogic(req.user.id);
    return res.status(200).send(items);
  } catch (error) {
    next(error);
  }
};

export const emptyTrash = async (req, res, next) => {
  try {
    await trashService.emptyTrashLogic(req.user.id);
    return res.status(200).send("Trash emptied successfully");
  } catch (error) {
    next(error);
  }
};

export const restoreFile = async (req, res, next) => {
  try {
    await trashService.restoreFileLogic({
      id: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId
    });
    return res.status(201).send("File restored successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const deleteFileForever = async (req, res, next) => {
  try {
    await trashService.deleteFileForeverLogic({
      fileid: req.params.fileid,
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.status(200).send("File deleted forever");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const restoreDirectory = async (req, res, next) => {
  try {
    await trashService.restoreDirectoryLogic({
      dirId: req.params.dirId,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId
    });
    return res.status(201).send("Directory restored successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const deleteDirectoryForever = async (req, res, next) => {
  try {
    await trashService.deleteDirectoryForeverLogic({
      dirId: req.params.dirId,
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.status(200).send("Directory fully deleted from trash successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const batchDelete = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    await trashService.batchDeleteLogic({
      items,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return res.status(200).send("Batch delete completed successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const batchRestore = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    const all = req.body?.all === true;
    await trashService.batchRestoreLogic({
      items,
      all,
      userId: req.user.id,
      userRole: req.user.role,
      rootDirId: req.user.rootDirId,
    });
    return res.status(200).send("Batch restore completed successfully");
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    next(error);
  }
};

export const deleteByParentChain = trashService.deleteByParentChain;
