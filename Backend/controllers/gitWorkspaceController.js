import {
  cloneRepoToVaultLogic,
  getWorkspaceStatusLogic,
  stageFilesLogic,
  unstageFilesLogic,
  commitWorkspaceLogic,
  pullRemoteChangesLogic,
  switchWorkspaceBranchLogic,
  stashChangesLogic,
  listStashesLogic,
  popStashLogic,
  dropStashLogic,
  configureFolderBackupLogic,
  runFolderBackupSyncLogic,
} from "../services/gitWorkspace.service.js";

export const cloneRepoToVault = async (req, res, next) => {
  try {
    const { owner, repo, branch, destinationFolderId, folderName } = req.body;
    const result = await cloneRepoToVaultLogic({
      owner,
      repo,
      branch,
      destinationFolderId,
      folderName,
      req,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceStatus = async (req, res, next) => {
  try {
    const { workspaceId, folderId } = req.query;
    const result = await getWorkspaceStatusLogic({
      workspaceId,
      folderId,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const stageFiles = async (req, res, next) => {
  try {
    const { workspaceId, filePaths, stageAll } = req.body;
    const result = await stageFilesLogic({
      workspaceId,
      filePaths,
      stageAll,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const unstageFiles = async (req, res, next) => {
  try {
    const { workspaceId, filePaths, unstageAll } = req.body;
    const result = await unstageFilesLogic({
      workspaceId,
      filePaths,
      unstageAll,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const commitWorkspace = async (req, res, next) => {
  try {
    const { workspaceId, message, description } = req.body;
    const result = await commitWorkspaceLogic({
      workspaceId,
      message,
      description,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const pullRemoteChanges = async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    const result = await pullRemoteChangesLogic({
      workspaceId,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const switchWorkspaceBranch = async (req, res, next) => {
  try {
    const { workspaceId, targetBranch, createNew } = req.body;
    const result = await switchWorkspaceBranchLogic({
      workspaceId,
      targetBranch,
      createNew,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const stashChanges = async (req, res, next) => {
  try {
    const { workspaceId, message } = req.body;
    const result = await stashChangesLogic({
      workspaceId,
      message,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const listStashes = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const result = await listStashesLogic({
      workspaceId,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const popStash = async (req, res, next) => {
  try {
    const { stashId } = req.params;
    const result = await popStashLogic({
      stashId,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const dropStash = async (req, res, next) => {
  try {
    const { stashId } = req.params;
    const result = await dropStashLogic({
      stashId,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const configureFolderBackup = async (req, res, next) => {
  try {
    const { directoryId, repoOwner, repoName, targetBranch, frequency } = req.body;
    const result = await configureFolderBackupLogic({
      directoryId,
      repoOwner,
      repoName,
      targetBranch,
      frequency,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const runFolderBackupSync = async (req, res, next) => {
  try {
    const { directoryId, repoOwner, repoName, targetBranch } = req.body;
    const result = await runFolderBackupSyncLogic({
      directoryId,
      repoOwner,
      repoName,
      targetBranch,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
